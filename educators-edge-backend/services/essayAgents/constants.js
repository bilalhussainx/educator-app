/**
 * Essay Collaboration Pipeline Constants
 *
 * Defines stages, state structure, and configuration for the
 * LangGraph-based multi-agent essay writing system.
 */

// Pipeline stages in order
const STAGES = {
  NOT_STARTED: 'not_started',
  TOPIC_ANALYSIS: 'topic_analysis',
  RESEARCH: 'research',
  OUTLINE: 'outline',
  DRAFT: 'draft',
  EDITING: 'editing',
  POLISH: 'polish',
  COMPLETE: 'complete'
};

// Stage order for progression
const STAGE_ORDER = [
  STAGES.NOT_STARTED,
  STAGES.TOPIC_ANALYSIS,
  STAGES.RESEARCH,
  STAGES.OUTLINE,
  STAGES.DRAFT,
  STAGES.EDITING,
  STAGES.POLISH,
  STAGES.COMPLETE
];

// Stage to node mapping for LangGraph
const STAGE_TO_NODE = {
  [STAGES.TOPIC_ANALYSIS]: 'topic_analyzer',
  [STAGES.RESEARCH]: 'researcher',
  [STAGES.OUTLINE]: 'outline_architect',
  [STAGES.DRAFT]: 'draft_writer',
  [STAGES.EDITING]: 'editor_critic',
  [STAGES.POLISH]: 'final_polish'
};

// Approval status options
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revision_requested'
};

// Default model configuration
// Use claude-sonnet-4 (current Claude Sonnet model)
const DEFAULT_MODEL = process.env.ESSAY_AGENT_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS_BY_STAGE = {
  [STAGES.TOPIC_ANALYSIS]: 2000,
  [STAGES.RESEARCH]: 2500,
  [STAGES.OUTLINE]: 2000,
  [STAGES.DRAFT]: 4000,
  [STAGES.EDITING]: 2500,
  [STAGES.POLISH]: 4000
};

/**
 * Get the next stage after the current one
 * @param {string} currentStage
 * @returns {string|null}
 */
function getNextStage(currentStage) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Get the previous stage before the current one
 * @param {string} currentStage
 * @returns {string|null}
 */
function getPreviousStage(currentStage) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

/**
 * Check if a stage is a processing stage (has an agent)
 * @param {string} stage
 * @returns {boolean}
 */
function isProcessingStage(stage) {
  return STAGE_TO_NODE.hasOwnProperty(stage);
}

/**
 * Get stage index for ordering
 * @param {string} stage
 * @returns {number}
 */
function getStageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Create initial state for a new essay session
 * @param {Object} params
 * @returns {Object}
 */
function createInitialState(params) {
  const {
    sessionId,
    essayPrompt,
    university = null,
    targetWordCount = 650,
    studentProfile = null
  } = params;

  return {
    // Session context
    sessionId,
    essayPrompt,
    university,
    targetWordCount,
    studentProfile,

    // Stage outputs (all start as null)
    topicAnalysis: null,
    research: null,
    outline: null,
    draft: null,
    edits: null,
    finalEssay: null,

    // Human-in-the-loop state
    currentStage: STAGES.NOT_STARTED,
    awaitingApproval: false,
    approvalStatus: null,
    humanFeedback: null,
    editedOutput: null,

    // Conversation context for agents
    messages: [],

    // Error handling
    error: null,

    // Metadata
    stageTimings: {},
    totalDurationMs: 0
  };
}

module.exports = {
  STAGES,
  STAGE_ORDER,
  STAGE_TO_NODE,
  APPROVAL_STATUS,
  DEFAULT_MODEL,
  MAX_TOKENS_BY_STAGE,
  getNextStage,
  getPreviousStage,
  isProcessingStage,
  getStageIndex,
  createInitialState
};
