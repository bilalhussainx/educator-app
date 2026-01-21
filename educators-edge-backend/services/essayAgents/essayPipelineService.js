/**
 * Essay Pipeline Service
 *
 * High-level service that manages essay collaboration pipelines.
 * Provides an event-based interface for WebSocket integration.
 *
 * Usage:
 *   const essayPipelineService = require('./essayPipelineService');
 *
 *   // Listen for events
 *   essayPipelineService.on('agentStarted', (data) => { ... });
 *   essayPipelineService.on('agentOutput', (data) => { ... });
 *   essayPipelineService.on('approvalRequested', (data) => { ... });
 *
 *   // Start a session
 *   await essayPipelineService.startSession(sessionId);
 *
 *   // Approve a stage
 *   await essayPipelineService.approveStage(sessionId, userId, feedback);
 */

const EventEmitter = require('events');
const { EssayPipeline, getPipelineState } = require('./pipeline');
const { STAGES, APPROVAL_STATUS, getNextStage } = require('./constants');
const essaySessionDb = require('../essaySessionDb');

class EssayPipelineService extends EventEmitter {
  constructor() {
    super();
    this.activePipelines = new Map(); // sessionId -> EssayPipeline
  }

  /**
   * Get or create a pipeline instance for a session
   */
  getPipeline(sessionId) {
    if (!this.activePipelines.has(sessionId)) {
      const pipeline = new EssayPipeline(sessionId);

      // Forward pipeline events to service events
      pipeline.on('agentStarted', (data) => this.emit('agentStarted', data));
      pipeline.on('agentOutput', (data) => this.emit('agentOutput', data));
      pipeline.on('approvalRequested', (data) => this.emit('approvalRequested', data));
      pipeline.on('stageChanged', (data) => this.emit('stageChanged', data));
      pipeline.on('pipelineComplete', (data) => this.emit('pipelineComplete', data));
      pipeline.on('error', (data) => this.emit('error', data));

      this.activePipelines.set(sessionId, pipeline);
    }
    return this.activePipelines.get(sessionId);
  }

  /**
   * Start an essay session's pipeline
   * @param {string} sessionId - UUID of the session
   * @param {Object} io - Socket.IO instance for real-time updates
   * @returns {Promise<Object>} Current state after starting
   */
  async startSession(sessionId, io = null) {
    console.log(`[EssayPipeline] Starting session ${sessionId}${io ? ' (with Socket.IO)' : ''}`);

    // Verify session exists
    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if pipeline has actually progressed past topic_analysis
    // (topic_analysis stage means it was just started but agent hasn't run yet)
    const hasCompletedStages = session.current_stage !== STAGES.NOT_STARTED &&
                               session.current_stage !== STAGES.TOPIC_ANALYSIS;

    if (hasCompletedStages) {
      console.log(`[EssayPipeline] Session ${sessionId} already progressed to stage ${session.current_stage}`);
      // Resume from current position
      return this.getSessionState(sessionId);
    }

    console.log(`[EssayPipeline] Session ${sessionId} starting from topic_analysis`);

    // Add system message for session start
    await essaySessionDb.addMessage(
      sessionId,
      null,
      'system',
      'Essay collaboration pipeline started',
      { action: 'pipeline_start' }
    );

    // Get or create pipeline and start
    const pipeline = this.getPipeline(sessionId);

    // Connect pipeline events to Socket.IO if available
    if (io) {
      console.log(`[EssayPipeline] Connecting pipeline events to Socket.IO for session ${sessionId}`);

      pipeline.on('agentStarted', (data) => {
        console.log(`[EssayPipeline] Agent started: ${data.stage}`);
        io.to(`essay:${sessionId}`).emit('essay:agent_started', data);
      });

      pipeline.on('agentOutput', (data) => {
        console.log(`[EssayPipeline] Agent output received for stage: ${data.stage}`);
        io.to(`essay:${sessionId}`).emit('essay:agent_output', data);
      });

      pipeline.on('approvalRequested', (data) => {
        console.log(`[EssayPipeline] Approval requested for stage: ${data.stage}`);
        io.to(`essay:${sessionId}`).emit('essay:approval_requested', data);
      });

      pipeline.on('stageChanged', (data) => {
        console.log(`[EssayPipeline] Stage changed to: ${data.stage}`);
        io.to(`essay:${sessionId}`).emit('essay:stage_changed', data);
      });

      pipeline.on('pipelineComplete', (data) => {
        console.log(`[EssayPipeline] Pipeline complete`);
        io.to(`essay:${sessionId}`).emit('essay:pipeline_complete', data);
      });

      pipeline.on('error', (data) => {
        console.error(`[EssayPipeline] Error: ${data.error}`);
        io.to(`essay:${sessionId}`).emit('essay:error', data);
      });
    }

    const state = await pipeline.start({
      essayPrompt: session.essay_prompt,
      university: session.university,
      targetWordCount: session.target_word_count,
      studentProfile: session.student_profile
    });

    return state;
  }

  /**
   * Approve the current stage (teacher or student can approve)
   * @param {string} sessionId
   * @param {number} userId - User ID (teacher or student)
   * @param {string} feedback - Optional feedback
   * @param {Object} editedOutput - Optional edited agent output
   */
  async approveStage(sessionId, userId, feedback = null, editedOutput = null) {
    console.log(`[EssayPipeline] Stage approved for session ${sessionId} by user ${userId}`);

    // Verify user is a session participant
    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (String(session.teacher_id) !== String(userId) && String(session.student_id) !== String(userId)) {
      throw new Error('Only session participants can approve stages');
    }

    // Resume pipeline FIRST (before updating database)
    // This allows the pipeline to check for pending approval before we mark it as approved
    const pipeline = this.getPipeline(sessionId);
    const state = await pipeline.resume(APPROVAL_STATUS.APPROVED, feedback, editedOutput);

    // Update approval in database AFTER successful resume
    await essaySessionDb.updateStageApproval(
      sessionId,
      session.current_stage,
      APPROVAL_STATUS.APPROVED,
      feedback,
      userId
    );

    // Add message
    await essaySessionDb.addMessage(
      sessionId,
      userId,
      'approval_response',
      feedback || 'Stage approved',
      { status: 'approved', stage: session.current_stage }
    );

    // Emit approval event
    this.emit('approvalResponse', {
      sessionId,
      status: APPROVAL_STATUS.APPROVED,
      userId,
      feedback,
      stage: session.current_stage
    });

    return state;
  }

  /**
   * Request revision of the current stage (teacher or student can request)
   * @param {string} sessionId
   * @param {number} userId
   * @param {string} feedback - Required feedback explaining what to revise
   */
  async requestRevision(sessionId, userId, feedback) {
    console.log(`[EssayPipeline] Revision requested for session ${sessionId}`);

    if (!feedback) {
      throw new Error('Feedback is required when requesting revision');
    }

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.teacher_id !== userId && session.student_id !== userId) {
      throw new Error('Only session participants can request revisions');
    }

    // Update approval in database
    await essaySessionDb.updateStageApproval(
      sessionId,
      session.current_stage,
      APPROVAL_STATUS.REVISION_REQUESTED,
      feedback,
      userId
    );

    // Add message
    await essaySessionDb.addMessage(
      sessionId,
      userId,
      'approval_response',
      feedback,
      { status: 'revision_requested', stage: session.current_stage }
    );

    // Emit event
    this.emit('approvalResponse', {
      sessionId,
      status: APPROVAL_STATUS.REVISION_REQUESTED,
      userId,
      feedback,
      stage: session.current_stage
    });

    // Resume pipeline with revision
    const pipeline = this.getPipeline(sessionId);
    const state = await pipeline.resume(APPROVAL_STATUS.REVISION_REQUESTED, feedback);

    return state;
  }

  /**
   * Add student feedback to current stage (doesn't approve)
   * @param {string} sessionId
   * @param {number} userId - Student's user ID
   * @param {string} feedback
   */
  async addStudentFeedback(sessionId, userId, feedback) {
    console.log(`[EssayPipeline] Student feedback added for session ${sessionId}`);

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.student_id !== userId) {
      throw new Error('Only the session student can add student feedback');
    }

    // Add student feedback to current stage
    await essaySessionDb.addStudentFeedback(sessionId, session.current_stage, feedback);

    // Add message
    await essaySessionDb.addMessage(
      sessionId,
      userId,
      'chat',
      feedback,
      { type: 'student_feedback', stage: session.current_stage }
    );

    // Emit event
    this.emit('studentFeedback', {
      sessionId,
      userId,
      feedback,
      stage: session.current_stage
    });

    return { success: true };
  }

  /**
   * Edit agent output before approving
   * @param {string} sessionId
   * @param {number} userId
   * @param {Object} editedOutput
   */
  async editStageOutput(sessionId, userId, editedOutput) {
    console.log(`[EssayPipeline] Stage output edited for session ${sessionId}`);

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.teacher_id !== userId) {
      throw new Error('Only the session teacher can edit stage outputs');
    }

    // Save edited output
    await essaySessionDb.updateStageEditedOutput(
      sessionId,
      session.current_stage,
      editedOutput,
      userId
    );

    // Emit event
    this.emit('stageEdited', {
      sessionId,
      userId,
      stage: session.current_stage,
      editedOutput
    });

    return { success: true };
  }

  /**
   * Get the current state of a session
   * @param {string} sessionId
   */
  async getSessionState(sessionId) {
    return getPipelineState(sessionId);
  }

  /**
   * Get full session state including all data
   * @param {string} sessionId
   */
  async getFullSessionState(sessionId) {
    return essaySessionDb.getFullSessionState(sessionId);
  }

  /**
   * Pause the pipeline (doesn't affect state, just stops auto-progression)
   * @param {string} sessionId
   */
  async pauseSession(sessionId) {
    await essaySessionDb.updateSessionStatus(sessionId, 'paused');

    await essaySessionDb.addMessage(
      sessionId,
      null,
      'system',
      'Session paused',
      { action: 'pause' }
    );

    this.emit('sessionPaused', { sessionId });

    return { success: true };
  }

  /**
   * Resume a paused session
   * @param {string} sessionId
   */
  async resumeSession(sessionId) {
    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await essaySessionDb.updateSessionStatus(sessionId, 'active');

    await essaySessionDb.addMessage(
      sessionId,
      null,
      'system',
      'Session resumed',
      { action: 'resume' }
    );

    this.emit('sessionResumed', { sessionId });

    return this.getSessionState(sessionId);
  }

  /**
   * Clean up a pipeline from memory
   * @param {string} sessionId
   */
  cleanup(sessionId) {
    if (this.activePipelines.has(sessionId)) {
      this.activePipelines.delete(sessionId);
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      activePipelines: this.activePipelines.size,
      pipelineIds: Array.from(this.activePipelines.keys())
    };
  }
}

// Export singleton instance
module.exports = new EssayPipelineService();
