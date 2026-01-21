/**
 * Essay Service
 *
 * Business logic for college essay generation
 * Manages essay creation, generation workflow, and retrieval
 */

const Essay = require('../models/Essay');
const pythonBridge = require('./python-bridge.service');

class EssayService {

  /**
   * Create a new essay and start generation in background
   *
   * @param {string} userId - User ID
   * @param {Object} data - Essay generation data
   * @returns {Promise<Object>} - Created essay record
   */
  async createEssay(userId, data) {
    const { prompt, university, studentProfile, wordCount = 650 } = data;

    console.log(`[Essay Service] Creating essay for user ${userId}`);
    console.log(`[Essay Service] University: ${university}`);

    // Create essay record with 'processing' status
    const essay = await Essay.create({
      userId,
      prompt,
      university,
      wordCount,
      status: 'processing',
      studentProfile: {
        name: studentProfile.name || 'Anonymous',
        background: studentProfile.background || '',
        experiences: studentProfile.experiences || [],
        satVerbal: studentProfile.satVerbal || null,
        voiceCharacteristics: studentProfile.voiceCharacteristics || null
      }
    });

    console.log(`[Essay Service] Essay record created: ${essay._id}`);

    // Generate essay in background (don't await)
    this.generateEssayAsync(
      essay._id,
      prompt,
      studentProfile,
      university,
      wordCount
    ).catch(error => {
      console.error(`[Essay Service] Background generation error for ${essay._id}:`, error);
    });

    return essay;
  }

  /**
   * Generate essay asynchronously in background
   *
   * @param {string} essayId - Essay record ID
   * @param {string} prompt - Essay prompt
   * @param {Object} studentProfile - Student profile
   * @param {string} university - Target university
   * @param {number} wordCount - Target word count
   */
  async generateEssayAsync(essayId, prompt, studentProfile, university, wordCount) {
    const startTime = Date.now();

    console.log(`[Essay Service] Starting generation for essay ${essayId}`);

    try {
      // Call Python 6-agent system (now powered by Claude Sonnet 4)
      const result = await pythonBridge.generateEssay(
        prompt,
        studentProfile,
        university,
        wordCount
      );

      const generationTime = Math.floor((Date.now() - startTime) / 1000);

      console.log(`[Essay Service] Generation complete for ${essayId}`);
      console.log(`[Essay Service] Time: ${generationTime}s`);
      console.log(`[Essay Service] Word count: ${result.word_count}`);
      console.log(`[Essay Service] Quality: ${result.quality_score}/10`);

      // Update essay record with results
      await Essay.findByIdAndUpdate(essayId, {
        status: 'complete',
        essayText: result.essay,
        critique: result.critique,
        actualWordCount: result.word_count,
        qualityScore: result.quality_score,
        generationTime,
        completedAt: new Date()
      });

      console.log(`[Essay Service] Essay ${essayId} saved successfully`);

    } catch (error) {
      const generationTime = Math.floor((Date.now() - startTime) / 1000);

      console.error(`[Essay Service] Generation failed for ${essayId}:`, error.message);

      // Update essay record with error
      await Essay.findByIdAndUpdate(essayId, {
        status: 'failed',
        error: error.message,
        generationTime,
        completedAt: new Date()
      });

      console.log(`[Essay Service] Essay ${essayId} marked as failed`);
    }
  }

  /**
   * Get essay by ID for a specific user
   *
   * @param {string} essayId - Essay ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Essay record or null
   */
  async getEssay(essayId, userId) {
    console.log(`[Essay Service] Retrieving essay ${essayId} for user ${userId}`);

    const essay = await Essay.findOne({ _id: essayId, userId });

    if (!essay) {
      console.log(`[Essay Service] Essay not found: ${essayId}`);
      return null;
    }

    console.log(`[Essay Service] Essay found: ${essay.status}`);
    return essay;
  }

  /**
   * Get all essays for a user
   *
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of essays to return
   * @returns {Promise<Array>} - Array of essay records
   */
  async getUserEssays(userId, limit = 50) {
    console.log(`[Essay Service] Retrieving essays for user ${userId}`);

    const essays = await Essay.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v'); // Exclude version key

    console.log(`[Essay Service] Found ${essays.length} essays`);
    return essays;
  }

  /**
   * Get essay statistics for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Essay statistics
   */
  async getUserStats(userId) {
    console.log(`[Essay Service] Getting stats for user ${userId}`);

    const stats = await Essay.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'complete'] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgQuality: {
            $avg: { $cond: [{ $eq: ['$status', 'complete'] }, '$qualityScore', null] }
          },
          avgGenerationTime: {
            $avg: { $cond: [{ $eq: ['$status', 'complete'] }, '$generationTime', null] }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      _id: null,
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      avgQuality: 0,
      avgGenerationTime: 0
    };

    console.log(`[Essay Service] Stats: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Delete an essay
   *
   * @param {string} essayId - Essay ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteEssay(essayId, userId) {
    console.log(`[Essay Service] Deleting essay ${essayId} for user ${userId}`);

    const result = await Essay.deleteOne({ _id: essayId, userId });

    if (result.deletedCount === 0) {
      console.log(`[Essay Service] Essay not found or not authorized`);
      return false;
    }

    console.log(`[Essay Service] Essay deleted successfully`);
    return true;
  }

  /**
   * Get list of supported universities
   *
   * @returns {Array<string>} - University names
   */
  getUniversities() {
    return [
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
      'Johns Hopkins'
    ];
  }
}

module.exports = new EssayService();
