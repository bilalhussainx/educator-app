/**
 * Essay Collaboration Agents Index
 *
 * Exports all agent functions for the LangGraph pipeline
 */

const { topicAnalyzer } = require('./topicAnalyzer');
const { researcher } = require('./researcher');
const { outlineArchitect } = require('./outlineArchitect');
const { draftWriter } = require('./draftWriter');
const { editorCritic } = require('./editorCritic');
const { finalPolish } = require('./finalPolish');

module.exports = {
  topicAnalyzer,
  researcher,
  outlineArchitect,
  draftWriter,
  editorCritic,
  finalPolish
};
