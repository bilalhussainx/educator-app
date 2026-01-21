/**
 * EssayMentor AI Configuration
 *
 * Configuration settings for the EssayMentor AI integration
 */

module.exports = {
  // Path to essaymentor-ai directory
  essaymentorPath: process.env.ESSAYMENTOR_PATH || 'C:\\Users\\bilal\\Desktop\\essaymentor-ai',

  // Python environment path
  pythonVenvPath: process.env.PYTHON_VENV_PATH || 'C:\\Users\\bilal\\Desktop\\essaymentor-ai\\venv_py312',

  // Essay generation settings
  defaultWordCount: 650,
  minWordCount: 250,
  maxWordCount: 1000,
  generationTimeout: 120000, // 2 minutes

  // Subscription tiers and quotas
  subscriptionTiers: {
    free: {
      maxEssays: 2,
      name: 'Free',
      price: 0
    },
    monthly: {
      maxEssays: -1, // unlimited
      name: 'Monthly',
      price: 29.99
    },
    annual: {
      maxEssays: -1, // unlimited
      name: 'Annual',
      price: 299.99
    }
  },

  // Supported universities
  universities: [
    'MIT',
    'Harvard',
    'Stanford',
    'Yale',
    'Princeton',
    'Columbia',
    'Penn',
    'Brown',
    'Dartmouth',
    'Cornell',
    'Duke',
    'Northwestern',
    'Vanderbilt',
    'Carnegie Mellon',
    'UChicago',
    'Caltech',
    'Rice',
    'Emory',
    'Georgetown',
    'Johns Hopkins',
    'UC Berkeley',
    'UCLA',
    'USC',
    'NYU',
    'Boston University'
  ],

  // Essay types
  essayTypes: {
    common_app: {
      name: 'Common App',
      defaultWordCount: 650,
      maxWordCount: 650
    },
    supplemental: {
      name: 'Supplemental',
      defaultWordCount: 250,
      maxWordCount: 500
    },
    personal_statement: {
      name: 'Personal Statement',
      defaultWordCount: 1000,
      maxWordCount: 1000
    }
  },

  // Agent system configuration
  agents: {
    profile: { name: 'Profile Agent', order: 1 },
    research: { name: 'Research Agent', order: 2 },
    brainstorm: { name: 'Brainstorm Agent', order: 3 },
    outline: { name: 'Outline Agent', order: 4 },
    draft: { name: 'Draft Agent', order: 5 },
    critique: { name: 'Critique Agent', order: 6 }
  },

  // Quality thresholds
  quality: {
    excellent: 9.0,
    good: 8.0,
    acceptable: 7.0,
    needsWork: 6.0
  },

  // MongoDB connection (if using separate database)
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/educators-edge',

  // Feature flags
  features: {
    enableCaching: false,
    enableAnalytics: true,
    enableNotifications: true,
    enableRevisions: false // Future feature
  }
};
