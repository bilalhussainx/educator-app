// =================================================================
// FILE: models/SessionRecording.js
// =================================================================
// DESCRIPTION: Database model for live session recordings with AI analysis

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SessionRecording = sequelize.define('SessionRecording', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    
    // Basic recording info
    sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true
    },
    
    teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        index: true
    },
    
    courseId: {
        type: DataTypes.UUID,
        allowNull: true,
        index: true
    },
    
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Recording files
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: true // Will be null until recording is processed
    },
    
    audioUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    thumbnailUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Recording metadata
    duration: {
        type: DataTypes.INTEGER, // Duration in seconds
        allowNull: true
    },
    
    fileSize: {
        type: DataTypes.BIGINT, // Size in bytes
        allowNull: true
    },
    
    resolution: {
        type: DataTypes.STRING, // e.g., "1920x1080"
        allowNull: true
    },
    
    // Recording status
    status: {
        type: DataTypes.ENUM('recording', 'processing', 'completed', 'failed', 'archived'),
        defaultValue: 'recording',
        allowNull: false
    },
    
    recordingStartedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    
    recordingEndedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    
    // AI Analysis Results
    aiAnalysis: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Gemini AI analysis of the session content'
    },
    
    keyTopics: {
        type: DataTypes.JSON, // Array of extracted topics
        allowNull: true
    },
    
    codeSnippets: {
        type: DataTypes.JSON, // Array of code examples from the session
        allowNull: true
    },
    
    learningObjectives: {
        type: DataTypes.JSON, // AI-extracted learning goals
        allowNull: true
    },
    
    difficulty: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: true
    },
    
    tags: {
        type: DataTypes.JSON, // Array of searchable tags
        allowNull: true
    },
    
    // Curation status
    isCurated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    
    curatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this recording is available to all students'
    },
    
    // Analytics
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    
    averageRating: {
        type: DataTypes.DECIMAL(2, 1), // e.g., 4.5
        allowNull: true
    },
    
    // Session data snapshot
    sessionData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Snapshot of code, whiteboard, and other session data'
    }
    
}, {
    tableName: 'session_recordings',
    timestamps: true,
    indexes: [
        {
            name: 'idx_session_recordings_teacher_course',
            fields: ['teacherId', 'courseId']
        },
        {
            name: 'idx_session_recordings_status',
            fields: ['status']
        },
        {
            name: 'idx_session_recordings_public',
            fields: ['isPublic', 'isCurated']
        },
        {
            name: 'idx_session_recordings_tags',
            fields: ['tags'],
            using: 'gin' // For JSON array searches
        }
    ]
});

module.exports = SessionRecording;