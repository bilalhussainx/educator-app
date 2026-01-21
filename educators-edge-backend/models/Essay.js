const mongoose = require('mongoose');

const EssaySchema = new mongoose.Schema({
  userId: {
    type: String, // String to support PostgreSQL integer IDs
    required: true,
    index: true
  },
  prompt: {
    type: String,
    required: true
  },
  university: {
    type: String,
    required: true
  },
  essayType: {
    type: String,
    default: 'common_app'
  },
  wordCount: {
    type: Number,
    default: 650
  },
  actualWordCount: {
    type: Number
  },
  status: {
    type: String,
    enum: ['processing', 'complete', 'failed'],
    default: 'processing',
    index: true
  },
  essayText: {
    type: String
  },
  critique: {
    type: String
  },
  qualityScore: {
    type: Number
  },
  generationTime: {
    type: Number // in seconds
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String
  },
  // Store student profile used for generation
  studentProfile: {
    name: String,
    background: String,
    experiences: [String],
    satVerbal: Number,
    voiceCharacteristics: mongoose.Schema.Types.Mixed
  }
});

// Index for efficient querying
EssaySchema.index({ userId: 1, createdAt: -1 });
EssaySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Essay', EssaySchema);
