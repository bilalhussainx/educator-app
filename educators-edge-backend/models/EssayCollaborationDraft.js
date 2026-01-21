/**
 * Essay Collaboration Draft Model (MongoDB)
 *
 * Stores large text content and agent outputs for collaborative essay sessions.
 * Links to PostgreSQL essay_collaboration_sessions via sessionId (UUID string).
 *
 * Why MongoDB?
 * - Large text fields (essay content, agent outputs) are document-friendly
 * - Flexible schema for varying agent output structures
 * - Efficient for frequent content updates during collaboration
 */

const mongoose = require('mongoose');

// Schema for storing agent outputs at each stage
const agentOutputSchema = new mongoose.Schema({
  // Topic Analysis stage output
  topicAnalysis: {
    themes: [String],
    angles: [{
      title: String,
      description: String,
      strengths: [String],
      risks: [String]
    }],
    recommendedAngle: Number,
    scopeSuggestions: [String],
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  },

  // Research stage output
  research: {
    selectedAngle: String,
    supportingPoints: [{
      point: String,
      evidence: String,
      source: String
    }],
    counterarguments: [{
      argument: String,
      rebuttal: String
    }],
    examples: [{
      example: String,
      relevance: String
    }],
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  },

  // Outline stage output
  outline: {
    thesis: String,
    sections: [{
      title: String,
      purpose: String,
      keyPoints: [String],
      transitionTo: String,
      estimatedWords: Number
    }],
    estimatedWordCounts: mongoose.Schema.Types.Mixed,
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  },

  // Draft stage output
  draft: {
    content: String,
    wordCount: Number,
    sectionsWritten: [String],
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  },

  // Editing/Critique stage output
  edits: {
    suggestions: [{
      type: {
        type: String,
        enum: ['grammar', 'clarity', 'flow', 'content', 'style', 'voice', 'structure', 'word_choice', 'punctuation', 'tone']
      },
      original: String,
      suggested: String,
      reason: String,
      location: {
        start: Number,
        end: Number
      },
      applied: Boolean
    }],
    overallFeedback: String,
    strengthsIdentified: [String],
    areasForImprovement: [String],
    currentScore: Number,
    targetScore: Number,
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  },

  // Final Polish stage output
  finalPolish: {
    content: String,
    wordCount: Number,
    finalScore: Number,
    summary: String,
    improvementsMade: [String],
    generatedAt: Date,
    modelUsed: String,
    durationMs: Number
  }
}, { _id: false });

// Main schema for essay collaboration drafts
const essayCollaborationDraftSchema = new mongoose.Schema({
  // Link to PostgreSQL session (UUID string)
  sessionId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },

  // Current essay content (plain text)
  content: {
    type: String,
    default: ''
  },

  // Rich text format if using TipTap/ProseMirror
  contentJson: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Liveblocks room ID for real-time collaboration
  liveblocksRoomId: {
    type: String,
    default: null
  },

  // All agent outputs
  agentOutputs: agentOutputSchema,

  // Conversation history for context
  conversationHistory: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Version for optimistic locking
  version: {
    type: Number,
    default: 1
  },

  // Metadata
  lastEditedBy: {
    userId: Number,
    username: String,
    role: String
  },

  wordCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'essay_collaboration_drafts'
});

// Instance method to update content and increment version
essayCollaborationDraftSchema.methods.updateContent = async function(newContent, userId, username, role) {
  this.content = newContent;
  this.wordCount = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  this.lastEditedBy = { userId, username, role };
  this.version += 1;
  return this.save();
};

// Instance method to update agent output for a specific stage
essayCollaborationDraftSchema.methods.updateAgentOutput = async function(stage, output) {
  if (!this.agentOutputs) {
    this.agentOutputs = {};
  }
  this.agentOutputs[stage] = {
    ...output,
    generatedAt: new Date()
  };
  return this.save();
};

// Static method to find or create draft for session
essayCollaborationDraftSchema.statics.findOrCreateForSession = async function(sessionId) {
  let draft = await this.findOne({ sessionId });
  if (!draft) {
    draft = new this({ sessionId });
    await draft.save();
  }
  return draft;
};

// Static method to get draft with specific agent outputs
essayCollaborationDraftSchema.statics.getWithAgentOutputs = async function(sessionId, stages = []) {
  const projection = { sessionId: 1, content: 1, wordCount: 1, version: 1 };
  stages.forEach(stage => {
    projection[`agentOutputs.${stage}`] = 1;
  });
  return this.findOne({ sessionId }, projection);
};

// Pre-save middleware to update word count (async version for Mongoose 5+)
essayCollaborationDraftSchema.pre('save', async function() {
  if (this.isModified('content') && this.content) {
    this.wordCount = this.content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  // No need to call next() in async middleware - just return
});

// Indexes for efficient queries
essayCollaborationDraftSchema.index({ sessionId: 1 }, { unique: true });
essayCollaborationDraftSchema.index({ updatedAt: -1 });
essayCollaborationDraftSchema.index({ 'lastEditedBy.userId': 1 });

module.exports = mongoose.model('EssayCollaborationDraft', essayCollaborationDraftSchema);
