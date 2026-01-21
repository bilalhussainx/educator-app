/**
 * Essay Controller
 *
 * Handles HTTP requests for essay generation
 * Routes requests to essay service and manages quota checking
 */

const essayService = require('../services/essay.service');
const db = require('../db'); // PostgreSQL connection

/**
 * Generate a new essay
 * POST /api/essays/generate
 */
exports.generate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, university, studentProfile, wordCount } = req.body;

    console.log(`[Essay Controller] Generate request from user ${userId}`);

    // Validate input
    if (!prompt || !university) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Prompt and university are required'
      });
    }

    // Check user quota from PostgreSQL
    let user;
    try {
      const userResult = await db.query(
        `SELECT subscription_tier, free_essays_used, essays_generated, subscription_ends_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found', message: 'User account not found in database' });
      }

      user = userResult.rows[0];
    } catch (dbError) {
      // Handle missing columns (migration not run)
      if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
        console.error('[Essay Controller] Essay columns missing - run migration: node run-essay-migration.js');
        return res.status(500).json({
          error: 'Database setup required',
          message: 'Essay system not configured. Please run: node run-essay-migration.js'
        });
      }
      throw dbError;
    }

    // Check if user can generate essay
    const canGenerate = checkQuota(user);

    if (!canGenerate.allowed) {
      console.log(`[Essay Controller] Quota exceeded for user ${userId}`);
      return res.status(403).json({
        error: 'Essay limit reached',
        message: canGenerate.message,
        subscription_tier: user.subscription_tier,
        free_essays_used: user.free_essays_used
      });
    }

    // Create essay (will start generation in background)
    const essay = await essayService.createEssay(userId, {
      prompt,
      university,
      studentProfile: studentProfile || {
        name: req.user.name || 'Anonymous',
        background: '',
        experiences: []
      },
      wordCount: wordCount || 650
    });

    // Update user essay count in PostgreSQL
    await db.query(
      `UPDATE users
       SET essays_generated = essays_generated + 1,
           free_essays_used = CASE
             WHEN subscription_tier = 'free' THEN free_essays_used + 1
             ELSE free_essays_used
           END
       WHERE id = $1`,
      [userId]
    );

    console.log(`[Essay Controller] Essay creation started: ${essay._id}`);

    res.json({
      essay_id: essay._id,
      status: 'processing',
      message: 'Essay generation started. This will take 1-2 minutes.',
      estimated_time_seconds: 90
    });

  } catch (error) {
    console.error('[Essay Controller] Generate error:', error);
    res.status(500).json({
      error: 'Failed to generate essay',
      message: error.message
    });
  }
};

/**
 * Get a specific essay
 * GET /api/essays/:id
 */
exports.getEssay = async (req, res) => {
  try {
    const userId = req.user.id;
    const essayId = req.params.id;

    console.log(`[Essay Controller] Get essay ${essayId} for user ${userId}`);

    const essay = await essayService.getEssay(essayId, userId);

    if (!essay) {
      return res.status(404).json({ error: 'Essay not found' });
    }

    res.json(essay);

  } catch (error) {
    console.error('[Essay Controller] Get essay error:', error);
    res.status(500).json({
      error: 'Failed to retrieve essay',
      message: error.message
    });
  }
};

/**
 * Get all essays for current user
 * GET /api/essays
 */
exports.getUserEssays = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Essay Controller] Get essays for user ${userId}`);

    const essays = await essayService.getUserEssays(userId);

    res.json({ essays });

  } catch (error) {
    console.error('[Essay Controller] Get essays error:', error);
    res.status(500).json({
      error: 'Failed to retrieve essays',
      message: error.message
    });
  }
};

/**
 * Get essay statistics for current user
 * GET /api/essays/stats
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Essay Controller] Get stats for user ${userId}`);

    // Get stats from MongoDB
    let mongoStats = { total: 0, completed: 0, processing: 0, failed: 0, avgQuality: 0, avgGenerationTime: 0 };
    try {
      mongoStats = await essayService.getUserStats(userId);
    } catch (mongoError) {
      console.error('[Essay Controller] MongoDB stats error:', mongoError.message);
      // Continue with default stats if MongoDB fails
    }

    // Get quota info from PostgreSQL - handle missing columns
    let user = {
      subscription_tier: 'free',
      free_essays_used: 0,
      essays_generated: 0,
      subscription_ends_at: null
    };

    try {
      const userResult = await db.query(
        `SELECT subscription_tier, free_essays_used, essays_generated, subscription_ends_at
         FROM users WHERE id = $1`,
        [userId]
      );
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    } catch (dbError) {
      if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
        console.warn('[Essay Controller] Essay columns missing - using default quota. Run: node run-essay-migration.js');
      } else {
        throw dbError;
      }
    }

    const quota = checkQuota(user);

    res.json({
      stats: mongoStats,
      quota: {
        subscription_tier: user.subscription_tier || 'free',
        free_essays_used: user.free_essays_used || 0,
        essays_generated: user.essays_generated || 0,
        can_generate: quota.allowed,
        remaining: quota.remaining,
        message: quota.message
      }
    });

  } catch (error) {
    console.error('[Essay Controller] Get stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message || 'Unknown error occurred'
    });
  }
};

/**
 * Get list of supported universities
 * GET /api/essays/universities
 */
exports.getUniversities = (req, res) => {
  try {
    const universities = essayService.getUniversities();
    res.json({ universities });
  } catch (error) {
    console.error('[Essay Controller] Get universities error:', error);
    res.status(500).json({
      error: 'Failed to retrieve universities',
      message: error.message
    });
  }
};

/**
 * Delete an essay
 * DELETE /api/essays/:id
 */
exports.deleteEssay = async (req, res) => {
  try {
    const userId = req.user.id;
    const essayId = req.params.id;

    console.log(`[Essay Controller] Delete essay ${essayId} for user ${userId}`);

    const success = await essayService.deleteEssay(essayId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Essay not found' });
    }

    res.json({ message: 'Essay deleted successfully' });

  } catch (error) {
    console.error('[Essay Controller] Delete essay error:', error);
    res.status(500).json({
      error: 'Failed to delete essay',
      message: error.message
    });
  }
};

/**
 * Test Python connection
 * GET /api/essays/test-connection
 */
exports.testConnection = async (req, res) => {
  try {
    const pythonBridge = require('../services/python-bridge.service');
    const result = await pythonBridge.testConnection();
    res.json(result);
  } catch (error) {
    console.error('[Essay Controller] Test connection error:', error);
    res.status(500).json({
      error: 'Python connection failed',
      message: error.message
    });
  }
};

/**
 * Helper function to check user quota
 * NOTE: Limits disabled - unlimited essays for all users
 */
function checkQuota(user) {
  // Unlimited essays for everyone
  return {
    allowed: true,
    remaining: -1,
    message: 'Unlimited essays available'
  };
}
