/**
 * Essay Agents Module
 *
 * Multi-agent pipeline for collaborative essay writing with human-in-the-loop.
 *
 * Exports:
 * - essayPipelineService: Main service for managing essay pipelines
 * - EssayPipeline: Pipeline class for direct use
 * - STAGES, APPROVAL_STATUS: Constants
 * - Agent functions: For direct invocation if needed
 */

const essayPipelineService = require('./essayPipelineService');
const { EssayPipeline, startPipeline, resumePipeline, getPipelineState } = require('./pipeline');
const { STAGES, STAGE_ORDER, APPROVAL_STATUS, getNextStage, createInitialState } = require('./constants');
const agents = require('./agents');

module.exports = {
  // Main service (recommended)
  essayPipelineService,

  // Pipeline class and functions
  EssayPipeline,
  startPipeline,
  resumePipeline,
  getPipelineState,

  // Constants
  STAGES,
  STAGE_ORDER,
  APPROVAL_STATUS,
  getNextStage,
  createInitialState,

  // Individual agents (for testing/direct use)
  agents
};
