/**
 * Essay Collaboration Pipeline
 *
 * Implements a state machine-based pipeline for collaborative essay writing
 * with human-in-the-loop checkpoints at each stage.
 *
 * This implementation uses a simple state machine that can be upgraded to
 * LangGraph when the library is installed. The key features are:
 * - Sequential stage execution
 * - Checkpoints after each agent
 * - State persistence via PostgreSQL
 * - Resume from any checkpoint
 */

const {
  STAGES,
  STAGE_ORDER,
  APPROVAL_STATUS,
  getNextStage,
  createInitialState
} = require('./constants');

const {
  topicAnalyzer,
  researcher,
  outlineArchitect,
  draftWriter,
  editorCritic,
  finalPolish
} = require('./agents');

const essaySessionDb = require('../essaySessionDb');
const EssayCollaborationDraft = require('../../models/EssayCollaborationDraft');

// Map stages to their agent functions
const STAGE_AGENTS = {
  [STAGES.TOPIC_ANALYSIS]: topicAnalyzer,
  [STAGES.RESEARCH]: researcher,
  [STAGES.OUTLINE]: outlineArchitect,
  [STAGES.DRAFT]: draftWriter,
  [STAGES.EDITING]: editorCritic,
  [STAGES.POLISH]: finalPolish
};

/**
 * Pipeline state manager - handles in-memory state and persistence
 */
class EssayPipelineState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.state = null;
    this.checkpointId = null;
  }

  /**
   * Initialize state from database or create new
   */
  async initialize(initialData = null) {
    // Try to load existing state
    const session = await essaySessionDb.getSession(this.sessionId);

    if (!session) {
      throw new Error(`Session ${this.sessionId} not found`);
    }

    // Load MongoDB draft for agent outputs
    const mongoDraft = await EssayCollaborationDraft.findOrCreateForSession(this.sessionId);

    // Reconstruct state from database
    this.state = {
      sessionId: this.sessionId,
      essayPrompt: session.essay_prompt,
      university: session.university,
      targetWordCount: session.target_word_count,
      studentProfile: session.student_profile,

      // Load agent outputs from MongoDB
      topicAnalysis: mongoDraft.agentOutputs?.topicAnalysis || null,
      research: mongoDraft.agentOutputs?.research || null,
      outline: mongoDraft.agentOutputs?.outline || null,
      draft: mongoDraft.agentOutputs?.draft || null,
      edits: mongoDraft.agentOutputs?.edits || null,
      finalEssay: mongoDraft.agentOutputs?.finalPolish || null,

      // Current state
      currentStage: session.current_stage || STAGES.NOT_STARTED,
      awaitingApproval: false,
      approvalStatus: null,
      humanFeedback: null,
      editedOutput: null,

      // Messages from conversation history
      messages: mongoDraft.conversationHistory || [],

      // Error state
      error: null,

      // Timing data
      stageTimings: {},
      totalDurationMs: 0
    };

    // Check for pending approval
    const pendingState = await essaySessionDb.getPendingStageState(this.sessionId);
    if (pendingState) {
      this.state.awaitingApproval = true;
      this.state.approvalStatus = APPROVAL_STATUS.PENDING;
    }

    // Apply any initial data overrides
    if (initialData) {
      Object.assign(this.state, initialData);
    }

    this.checkpointId = session.langgraph_checkpoint_id;

    return this.state;
  }

  /**
   * Update state and persist to database
   */
  async update(updates) {
    Object.assign(this.state, updates);

    // Persist critical state to database
    if (updates.currentStage) {
      await essaySessionDb.updateSessionStage(this.sessionId, updates.currentStage);
    }

    // Persist agent outputs to MongoDB
    const outputKeys = ['topicAnalysis', 'research', 'outline', 'draft', 'edits', 'finalEssay'];
    const hasOutputUpdate = outputKeys.some(key => updates.hasOwnProperty(key) && updates[key]);

    if (hasOutputUpdate) {
      const mongoDraft = await EssayCollaborationDraft.findOrCreateForSession(this.sessionId);

      for (const key of outputKeys) {
        if (updates[key]) {
          const mongoKey = key === 'finalEssay' ? 'finalPolish' : key;
          mongoDraft.agentOutputs = mongoDraft.agentOutputs || {};
          mongoDraft.agentOutputs[mongoKey] = updates[key];
        }
      }

      // Update conversation history
      if (updates.messages) {
        mongoDraft.conversationHistory = updates.messages;
      }

      // Update content if draft or final essay
      if (updates.draft?.content) {
        mongoDraft.content = updates.draft.content;
        mongoDraft.wordCount = updates.draft.wordCount;
      }
      if (updates.finalEssay?.content) {
        mongoDraft.content = updates.finalEssay.content;
        mongoDraft.wordCount = updates.finalEssay.wordCount;
      }

      await mongoDraft.save();
    }

    return this.state;
  }

  /**
   * Create checkpoint in database
   */
  async createCheckpoint(stage, agentOutput) {
    // Save stage state to PostgreSQL
    const stageState = await essaySessionDb.createStageState(
      this.sessionId,
      stage,
      agentOutput,
      agentOutput.modelUsed,
      agentOutput.durationMs
    );

    this.checkpointId = stageState.id;

    // Update session with checkpoint ID
    await essaySessionDb.setLangGraphThreadId(this.sessionId, this.checkpointId);

    return stageState;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
}

/**
 * Main Pipeline class
 */
class EssayPipeline {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.stateManager = new EssayPipelineState(sessionId);
    this.eventHandlers = {
      agentStarted: [],
      agentOutput: [],
      approvalRequested: [],
      stageChanged: [],
      pipelineComplete: [],
      error: []
    };
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
    return this;
  }

  /**
   * Emit event to all handlers
   */
  emit(event, data) {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
      }
    });
  }

  /**
   * Start the pipeline from the beginning
   */
  async start(initialData = {}) {
    await this.stateManager.initialize(initialData);

    // Update session status to active
    await essaySessionDb.updateSessionStatus(this.sessionId, 'active');

    // Run the first stage
    return this.runNextStage();
  }

  /**
   * Resume pipeline after human approval
   */
  async resume(approvalStatus, feedback = null, editedOutput = null) {
    console.log(`[Pipeline] Resume called for session ${this.sessionId} with status: ${approvalStatus}`);

    // Re-initialize state from database
    await this.stateManager.initialize();

    const state = this.stateManager.getState();
    console.log(`[Pipeline] State loaded - currentStage: ${state.currentStage}, awaitingApproval: ${state.awaitingApproval}`);

    if (!state.awaitingApproval) {
      // Double-check by looking for the current stage output
      const currentOutput = this.getOutputForStage(state.currentStage, state);
      console.log(`[Pipeline] Current stage output exists: ${!!currentOutput}`);

      // If there's output for the current stage, we can still proceed
      if (!currentOutput) {
        throw new Error('Pipeline is not waiting for approval');
      }
      console.log(`[Pipeline] Proceeding with approval despite awaitingApproval=false (has output)`);
    }

    // Update state with approval info
    await this.stateManager.update({
      approvalStatus,
      humanFeedback: feedback,
      editedOutput,
      awaitingApproval: false
    });

    // Note: Database approval is handled by the caller (essayPipelineService)

    // Handle different approval outcomes
    if (approvalStatus === APPROVAL_STATUS.APPROVED) {
      console.log(`[Pipeline] Approval granted, running next stage`);
      return this.runNextStage();
    } else if (approvalStatus === APPROVAL_STATUS.REVISION_REQUESTED) {
      console.log(`[Pipeline] Revision requested, re-running current stage`);
      // Re-run the current stage with feedback
      return this.runStage(state.currentStage);
    } else {
      // Rejected - stay at current stage
      return state;
    }
  }

  /**
   * Run the next stage in the pipeline
   */
  async runNextStage() {
    const state = this.stateManager.getState();

    // Check if the current stage needs to be run (has no output yet)
    const currentStageOutput = this.getOutputForStage(state.currentStage, state);
    if (state.currentStage !== STAGES.NOT_STARTED &&
        state.currentStage !== STAGES.COMPLETE &&
        !currentStageOutput) {
      console.log(`[Pipeline] Current stage ${state.currentStage} has no output, running it first`);
      return this.runStage(state.currentStage);
    }

    // Current stage is complete, move to next
    const nextStage = getNextStage(state.currentStage);
    console.log(`[Pipeline] Current stage: ${state.currentStage}, next stage: ${nextStage}`);

    if (!nextStage || nextStage === STAGES.COMPLETE) {
      // Pipeline complete
      await essaySessionDb.updateSessionStatus(this.sessionId, 'completed');
      await this.stateManager.update({ currentStage: STAGES.COMPLETE });

      this.emit('pipelineComplete', {
        sessionId: this.sessionId,
        finalEssay: state.finalEssay
      });

      return this.stateManager.getState();
    }

    return this.runStage(nextStage);
  }

  /**
   * Get output for a given stage from state
   */
  getOutputForStage(stage, state) {
    const outputKey = this.getOutputKeyForStage(stage);
    return outputKey ? state[outputKey] : null;
  }

  /**
   * Run a specific stage
   */
  async runStage(stage) {
    console.log(`[Pipeline] Running stage: ${stage} for session ${this.sessionId}`);
    const agent = STAGE_AGENTS[stage];

    if (!agent) {
      throw new Error(`No agent found for stage: ${stage}`);
    }

    this.emit('agentStarted', {
      sessionId: this.sessionId,
      stage,
      message: `Starting ${stage.replace('_', ' ')}...`
    });
    console.log(`[Pipeline] Emitted agentStarted for stage: ${stage}`);

    try {
      const state = this.stateManager.getState();
      console.log(`[Pipeline] Got state, calling agent for stage: ${stage}`);

      // Run the agent
      const result = await agent(state);
      console.log(`[Pipeline] Agent completed for stage: ${stage}, has error: ${!!result.error}`);

      // Check for agent-level errors
      if (result.error) {
        console.error(`[Pipeline] Agent returned error for stage ${stage}:`, result.error);
        this.emit('error', {
          sessionId: this.sessionId,
          stage,
          error: result.error
        });
        // Still update state so the error is tracked
        await this.stateManager.update(result);
        return this.stateManager.getState();
      }

      // Update state with result
      await this.stateManager.update(result);

      // Create checkpoint if agent produced output
      const outputKey = this.getOutputKeyForStage(stage);
      if (result[outputKey]) {
        await this.stateManager.createCheckpoint(stage, result[outputKey]);

        // Also create a draft if this stage produces content
        if (result.draft?.content) {
          await essaySessionDb.createDraft(
            this.sessionId,
            result.draft.content,
            stage,
            null,
            'agent'
          );
        }
        if (result.finalEssay?.content) {
          await essaySessionDb.createDraft(
            this.sessionId,
            result.finalEssay.content,
            stage,
            null,
            'agent'
          );
        }
      }

      // Add system message for stage transition
      await essaySessionDb.addMessage(
        this.sessionId,
        null,
        'agent_output',
        `${stage.replace('_', ' ')} complete`,
        { stage, outputKey }
      );

      this.emit('agentOutput', {
        sessionId: this.sessionId,
        stage,
        output: result[outputKey],
        awaitingApproval: result.awaitingApproval
      });

      if (result.awaitingApproval) {
        this.emit('approvalRequested', {
          sessionId: this.sessionId,
          stage
        });
      }

      this.emit('stageChanged', {
        sessionId: this.sessionId,
        stage: result.currentStage
      });

      return this.stateManager.getState();

    } catch (error) {
      console.error(`Pipeline error at stage ${stage}:`, error);

      await this.stateManager.update({
        error: error.message
      });

      this.emit('error', {
        sessionId: this.sessionId,
        stage,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get the output key for a given stage
   */
  getOutputKeyForStage(stage) {
    const mapping = {
      [STAGES.TOPIC_ANALYSIS]: 'topicAnalysis',
      [STAGES.RESEARCH]: 'research',
      [STAGES.OUTLINE]: 'outline',
      [STAGES.DRAFT]: 'draft',
      [STAGES.EDITING]: 'edits',
      [STAGES.POLISH]: 'finalEssay'
    };
    return mapping[stage];
  }

  /**
   * Get current pipeline state
   */
  async getState() {
    await this.stateManager.initialize();
    return this.stateManager.getState();
  }
}

/**
 * Create and start a new pipeline
 */
async function startPipeline(sessionId, initialData = {}) {
  const pipeline = new EssayPipeline(sessionId);
  await pipeline.start(initialData);
  return pipeline;
}

/**
 * Resume an existing pipeline
 */
async function resumePipeline(sessionId, approvalStatus, feedback = null, editedOutput = null) {
  const pipeline = new EssayPipeline(sessionId);
  await pipeline.resume(approvalStatus, feedback, editedOutput);
  return pipeline;
}

/**
 * Get pipeline state without running
 */
async function getPipelineState(sessionId) {
  const pipeline = new EssayPipeline(sessionId);
  return pipeline.getState();
}

module.exports = {
  EssayPipeline,
  EssayPipelineState,
  startPipeline,
  resumePipeline,
  getPipelineState,
  STAGE_AGENTS
};
