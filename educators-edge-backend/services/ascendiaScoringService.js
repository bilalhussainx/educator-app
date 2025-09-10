// =================================================================
// ASCENDIA PLATFORM: Four Pillars Scoring Service
// =================================================================
// Implements the strategic Four Pillars of Ascent scoring model
// Replaces the complex daily-capped activity system

const db = require('../db');

class AscendiaScoringService {

    /**
     * Add points to a specific pillar for a user
     * @param {string} userId - User ID
     * @param {string} pillarName - Pillar name (academic, community, mentorship, analytical)
     * @param {number} points - Points to add
     * @param {string} description - Description of the activity
     * @returns {object} - Updated scores
     */
    async addPillarPoints(userId, pillarName, points, description) {
        try {
            // Validate pillar name
            const validPillars = ['academic', 'community', 'mentorship', 'analytical'];
            if (!validPillars.includes(pillarName)) {
                throw new Error(`Invalid pillar name: ${pillarName}. Must be one of: ${validPillars.join(', ')}`);
            }

            // Use the database function to add points
            const result = await db.query(`
                SELECT add_ascendia_pillar_points($1, $2, $3) as new_pillar_score
            `, [userId, pillarName, points]);

            const newPillarScore = result.rows[0].new_pillar_score;

            // Get updated user profile with all scores
            const profileResult = await db.query(`
                SELECT 
                    ascendia_score_total,
                    score_academic,
                    score_community,
                    score_mentorship,
                    score_analytical,
                    user_tier,
                    tier_updated_at
                FROM user_profiles
                WHERE user_id = $1
            `, [userId]);

            const profile = profileResult.rows[0];

            // Log the scoring activity for analytics
            await this.logScoringActivity(userId, pillarName, points, description);

            return {
                success: true,
                pillar: pillarName,
                pointsAdded: points,
                newPillarScore,
                totalScore: profile.ascendia_score_total,
                userTier: profile.user_tier,
                allPillarScores: {
                    academic: profile.score_academic,
                    community: profile.score_community,
                    mentorship: profile.score_mentorship,
                    analytical: profile.score_analytical
                },
                description
            };

        } catch (error) {
            console.error('Error adding pillar points:', error);
            throw new Error(`Failed to add pillar points: ${error.message}`);
        }
    }

    /**
     * Award points based on specific activities
     * @param {string} userId - User ID
     * @param {string} activityType - Type of activity
     * @param {object} activityData - Activity-specific data
     * @returns {object} - Scoring result
     */
    async awardActivityPoints(userId, activityType, activityData = {}) {
        try {
            let pillar, points, description;

            switch (activityType) {
                // Academic Activities
                case 'course_completion':
                    pillar = 'academic';
                    points = 100;
                    description = `Completed course: ${activityData.courseName || 'Unknown'}`;
                    break;

                case 'lesson_completion':
                    pillar = 'academic';
                    points = 10;
                    description = `Completed lesson: ${activityData.lessonTitle || 'Unknown'}`;
                    break;

                case 'assignment_submission':
                    pillar = 'academic';
                    points = 25;
                    description = `Submitted assignment: ${activityData.assignmentTitle || 'Unknown'}`;
                    break;

                case 'quiz_passed':
                    pillar = 'academic';
                    points = activityData.score === 100 ? 35 : 15; // Perfect score bonus
                    description = `Passed quiz with ${activityData.score}%`;
                    break;

                case 'skill_certification':
                    pillar = 'academic';
                    points = 100;
                    description = `Earned certification: ${activityData.certificationName}`;
                    break;

                // Community Activities
                case 'forum_post_quality':
                    pillar = 'community';
                    points = 20;
                    description = `Posted helpful content (${activityData.upvotes || 0} upvotes)`;
                    break;

                case 'question_answered':
                    pillar = 'community';
                    points = 30;
                    description = `Answered community question`;
                    break;

                case 'best_answer_selected':
                    pillar = 'community';
                    points = 50;
                    description = `Answer selected as best answer`;
                    break;

                case 'study_group_participation':
                    pillar = 'community';
                    points = 15;
                    description = `Participated in study group`;
                    break;

                case 'peer_review_completed':
                    pillar = 'community';
                    points = 25;
                    description = `Completed peer review`;
                    break;

                case 'successful_referral':
                    pillar = 'community';
                    points = 150;
                    description = `Successfully referred new user`;
                    break;

                // Mentorship Activities
                case 'mentoring_session_completed':
                    pillar = 'mentorship';
                    points = 75;
                    description = `Completed mentoring session`;
                    break;

                case 'positive_mentor_review':
                    pillar = 'mentorship';
                    points = activityData.rating >= 4 ? 40 : 20;
                    description = `Received ${activityData.rating}-star mentor review`;
                    break;

                case 'teaching_session_hosted':
                    pillar = 'mentorship';
                    points = 100;
                    description = `Hosted teaching session`;
                    break;

                case 'student_helped_successfully':
                    pillar = 'mentorship';
                    points = 60;
                    description = `Successfully helped student achieve goal`;
                    break;

                case 'mentor_application_accepted':
                    pillar = 'mentorship';
                    points = 200;
                    description = `Accepted as verified mentor`;
                    break;

                // Analytical Activities
                case 'data_analysis_project':
                    pillar = 'analytical';
                    points = 80;
                    description = `Completed data analysis project`;
                    break;

                case 'research_paper_published':
                    pillar = 'analytical';
                    points = 150;
                    description = `Published research paper`;
                    break;

                case 'code_review_completed':
                    pillar = 'analytical';
                    points = 30;
                    description = `Completed thorough code review`;
                    break;

                case 'bug_report_submitted':
                    pillar = 'analytical';
                    points = 15;
                    description = `Submitted detailed bug report`;
                    break;

                case 'algorithm_optimization':
                    pillar = 'analytical';
                    points = 65;
                    description = `Optimized algorithm performance`;
                    break;

                case 'technical_documentation':
                    pillar = 'analytical';
                    points = 40;
                    description = `Created technical documentation`;
                    break;

                // Cross-pillar Activities
                case 'profile_completion':
                    return await this.awardMultiplePillarPoints(userId, {
                        academic: 15,
                        community: 15,
                        mentorship: 10,
                        analytical: 10
                    }, 'Completed comprehensive profile');

                case 'portfolio_item_added':
                    pillar = activityData.itemType === 'research' ? 'analytical' : 'academic';
                    points = 30;
                    description = `Added portfolio item: ${activityData.title}`;
                    break;

                case 'achievement_earned':
                    pillar = this.determinePillarByAchievement(activityData.achievementType);
                    points = 75;
                    description = `Earned achievement: ${activityData.title}`;
                    break;

                default:
                    throw new Error(`Unknown activity type: ${activityType}`);
            }

            return await this.addPillarPoints(userId, pillar, points, description);

        } catch (error) {
            console.error('Error awarding activity points:', error);
            throw new Error(`Failed to award activity points: ${error.message}`);
        }
    }

    /**
     * Award points to multiple pillars simultaneously
     * @param {string} userId - User ID
     * @param {object} pillarPoints - Object with pillar names as keys and points as values
     * @param {string} description - Overall description
     * @returns {object} - Combined scoring result
     */
    async awardMultiplePillarPoints(userId, pillarPoints, description) {
        try {
            const results = {};
            let totalPointsAdded = 0;

            // Award points to each pillar
            for (const [pillar, points] of Object.entries(pillarPoints)) {
                if (points > 0) {
                    const result = await this.addPillarPoints(
                        userId, 
                        pillar, 
                        points, 
                        `${description} (${pillar} component)`
                    );
                    results[pillar] = result;
                    totalPointsAdded += points;
                }
            }

            // Get final updated profile
            const profileResult = await db.query(`
                SELECT 
                    ascendia_score_total,
                    score_academic,
                    score_community,
                    score_mentorship,
                    score_analytical,
                    user_tier
                FROM user_profiles
                WHERE user_id = $1
            `, [userId]);

            const profile = profileResult.rows[0];

            return {
                success: true,
                multiPillarAward: true,
                totalPointsAdded,
                description,
                pillarResults: results,
                finalProfile: {
                    totalScore: profile.ascendia_score_total,
                    userTier: profile.user_tier,
                    pillarScores: {
                        academic: profile.score_academic,
                        community: profile.score_community,
                        mentorship: profile.score_mentorship,
                        analytical: profile.score_analytical
                    }
                }
            };

        } catch (error) {
            console.error('Error awarding multiple pillar points:', error);
            throw new Error(`Failed to award multiple pillar points: ${error.message}`);
        }
    }

    /**
     * Get user's complete Ascendia scoring profile
     * @param {string} userId - User ID
     * @returns {object} - Complete scoring profile
     */
    async getUserScoringProfile(userId) {
        try {
            // Get current scores and tier
            const profileResult = await db.query(`
                SELECT 
                    up.ascendia_score_total,
                    up.score_academic,
                    up.score_community,
                    up.score_mentorship,
                    up.score_analytical,
                    up.user_tier,
                    up.tier_updated_at,
                    uw.z_credit_balance as spark_balance,
                    tb.tier_min_z_index as tier_min_score,
                    tb.tier_max_z_index as tier_max_score
                FROM user_profiles up
                LEFT JOIN user_wallets uw ON up.user_id = uw.user_id
                LEFT JOIN tier_benefits tb ON up.user_tier = tb.tier_name
                WHERE up.user_id = $1
            `, [userId]);

            if (profileResult.rows.length === 0) {
                throw new Error('User profile not found');
            }

            const profile = profileResult.rows[0];

            // Calculate progress to next tier
            const nextTierInfo = await this.getNextTierInfo(profile.user_tier, profile.ascendia_score_total);

            // Get recent scoring activities
            const recentActivities = await this.getUserScoringHistory(userId, 10);

            // Calculate pillar balance (how evenly distributed the scores are)
            const pillarBalance = this.calculatePillarBalance(profile);

            // Get tier benefits
            const tierBenefits = await this.getTierBenefits(profile.user_tier);

            return {
                success: true,
                userId,
                ascendiaScore: {
                    total: profile.ascendia_score_total,
                    fromSparks: profile.spark_balance || 0,
                    fromActivities: profile.ascendia_score_total - (profile.spark_balance || 0)
                },
                pillarScores: {
                    academic: profile.score_academic,
                    community: profile.score_community,
                    mentorship: profile.score_mentorship,
                    analytical: profile.score_analytical
                },
                tier: {
                    current: profile.user_tier,
                    minScore: profile.tier_min_score,
                    maxScore: profile.tier_max_score,
                    updatedAt: profile.tier_updated_at,
                    nextTier: nextTierInfo,
                    benefits: tierBenefits
                },
                pillarBalance,
                recentActivities,
                insights: this.generateScoringInsights(profile, pillarBalance)
            };

        } catch (error) {
            console.error('Error getting user scoring profile:', error);
            throw new Error(`Failed to get scoring profile: ${error.message}`);
        }
    }

    /**
     * Get scoring leaderboard
     * @param {object} filters - Leaderboard filters
     * @returns {object} - Leaderboard data
     */
    async getScoringLeaderboard(filters = {}) {
        try {
            const { 
                pillar = 'total', 
                tier = null, 
                timeframe = 'all_time',
                limit = 50 
            } = filters;

            let query = `
                SELECT 
                    u.id,
                    u.username,
                    up.display_name,
                    up.ascendia_score_total,
                    up.score_academic,
                    up.score_community,
                    up.score_mentorship,
                    up.score_analytical,
                    up.user_tier
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                WHERE 1=1
            `;

            const queryParams = [];
            let paramCount = 0;

            if (tier) {
                query += ` AND up.user_tier = $${++paramCount}`;
                queryParams.push(tier);
            }

            // Order by specified pillar or total
            let orderColumn;
            switch (pillar) {
                case 'academic': orderColumn = 'up.score_academic'; break;
                case 'community': orderColumn = 'up.score_community'; break;
                case 'mentorship': orderColumn = 'up.score_mentorship'; break;
                case 'analytical': orderColumn = 'up.score_analytical'; break;
                default: orderColumn = 'up.ascendia_score_total';
            }

            query += ` ORDER BY ${orderColumn} DESC, up.user_tier DESC LIMIT $${++paramCount}`;
            queryParams.push(limit);

            const result = await db.query(query, queryParams);

            // Add rankings
            const leaderboard = result.rows.map((user, index) => ({
                ...user,
                rank: index + 1,
                focusScore: pillar === 'total' ? user.ascendia_score_total : user[`score_${pillar}`]
            }));

            return {
                success: true,
                leaderboard,
                filters: { pillar, tier, timeframe },
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting scoring leaderboard:', error);
            throw new Error(`Failed to get leaderboard: ${error.message}`);
        }
    }

    /**
     * Calculate tier statistics
     * @returns {object} - Tier distribution and statistics
     */
    async getTierStatistics() {
        try {
            const stats = await db.query(`
                SELECT 
                    user_tier,
                    COUNT(*) as user_count,
                    AVG(ascendia_score_total) as avg_total_score,
                    AVG(score_academic) as avg_academic,
                    AVG(score_community) as avg_community,
                    AVG(score_mentorship) as avg_mentorship,
                    AVG(score_analytical) as avg_analytical,
                    MIN(ascendia_score_total) as min_score,
                    MAX(ascendia_score_total) as max_score
                FROM user_profiles
                WHERE user_tier IS NOT NULL
                GROUP BY user_tier
                ORDER BY 
                    CASE user_tier 
                        WHEN 'navigator' THEN 3
                        WHEN 'explorer' THEN 2
                        WHEN 'pathfinder' THEN 1
                        ELSE 0
                    END DESC
            `);

            return {
                success: true,
                tierStats: stats.rows,
                totalUsers: stats.rows.reduce((sum, tier) => sum + parseInt(tier.user_count), 0),
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting tier statistics:', error);
            throw new Error(`Failed to get tier statistics: ${error.message}`);
        }
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Log scoring activity for analytics
     * @private
     */
    async logScoringActivity(userId, pillar, points, description) {
        try {
            await db.query(`
                INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context)
                VALUES ($1, 'scoring_activity', $2, $3)
            `, [
                userId,
                `${pillar}: +${points} points`,
                JSON.stringify({ pillar, points, description, timestamp: new Date().toISOString() })
            ]);
        } catch (error) {
            console.error('Error logging scoring activity:', error);
            // Don't throw - logging is optional
        }
    }

    /**
     * Determine pillar based on achievement type
     * @private
     */
    determinePillarByAchievement(achievementType) {
        const pillarMapping = {
            'academic': ['degree', 'course', 'certification', 'exam'],
            'community': ['leadership', 'volunteer', 'social', 'networking'],
            'mentorship': ['teaching', 'mentoring', 'coaching', 'guidance'],
            'analytical': ['research', 'analysis', 'technical', 'problem_solving']
        };

        for (const [pillar, keywords] of Object.entries(pillarMapping)) {
            if (keywords.some(keyword => achievementType.toLowerCase().includes(keyword))) {
                return pillar;
            }
        }

        return 'academic'; // Default fallback
    }

    /**
     * Get information about next tier
     * @private
     */
    async getNextTierInfo(currentTier, currentScore) {
        const tierHierarchy = { pathfinder: 'explorer', explorer: 'navigator', navigator: null };
        const nextTier = tierHierarchy[currentTier];

        if (!nextTier) {
            return { tier: null, message: 'Maximum tier reached!' };
        }

        const nextTierResult = await db.query(`
            SELECT tier_min_z_index FROM tier_benefits WHERE tier_name = $1
        `, [nextTier]);

        const requiredScore = nextTierResult.rows[0].tier_min_z_index;
        const progress = Math.min((currentScore / requiredScore) * 100, 100);

        return {
            tier: nextTier,
            requiredScore,
            currentScore,
            remainingPoints: Math.max(requiredScore - currentScore, 0),
            progress: Math.round(progress * 100) / 100
        };
    }

    /**
     * Get recent scoring history for user
     * @private
     */
    async getUserScoringHistory(userId, limit = 10) {
        try {
            // This would come from a proper activity log table in production
            // For now, return mock recent activities
            return [
                { date: new Date().toISOString(), pillar: 'academic', points: 25, description: 'Recent activity' }
            ];
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate how balanced the pillar scores are
     * @private
     */
    calculatePillarBalance(profile) {
        const scores = [
            profile.score_academic,
            profile.score_community,
            profile.score_mentorship,
            profile.score_analytical
        ];

        const total = scores.reduce((sum, score) => sum + score, 0);
        if (total === 0) return { balance: 1, status: 'balanced' };

        const percentages = scores.map(score => score / total);
        const idealPercentage = 0.25; // 25% each for perfect balance
        const deviation = percentages.reduce((sum, pct) => sum + Math.abs(pct - idealPercentage), 0);
        
        const balance = Math.max(0, 1 - deviation);
        
        let status;
        if (balance >= 0.8) status = 'excellent';
        else if (balance >= 0.6) status = 'good';
        else if (balance >= 0.4) status = 'fair';
        else status = 'unbalanced';

        return { balance: Math.round(balance * 100) / 100, status, percentages };
    }

    /**
     * Get tier benefits
     * @private
     */
    async getTierBenefits(tierName) {
        try {
            const result = await db.query(`
                SELECT * FROM tier_benefits WHERE tier_name = $1
            `, [tierName]);

            return result.rows[0] || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate insights about user's scoring pattern
     * @private
     */
    generateScoringInsights(profile, pillarBalance) {
        const insights = [];

        // Check for pillar imbalances
        if (pillarBalance.status === 'unbalanced') {
            const strongest = ['academic', 'community', 'mentorship', 'analytical']
                .reduce((a, b) => profile[`score_${a}`] > profile[`score_${b}`] ? a : b);
            
            insights.push({
                type: 'pillar_balance',
                message: `Your ${strongest} pillar is strongest. Consider developing other areas for better balance.`,
                actionable: true
            });
        }

        // Check tier progression
        if (profile.user_tier === 'pathfinder' && profile.ascendia_score_total > 500) {
            insights.push({
                type: 'tier_progression',
                message: 'You\'re making good progress toward Explorer tier! Keep participating in community activities.',
                actionable: true
            });
        }

        // Check for zero pillars
        const zeroPillars = ['academic', 'community', 'mentorship', 'analytical']
            .filter(pillar => profile[`score_${pillar}`] === 0);

        if (zeroPillars.length > 0) {
            insights.push({
                type: 'pillar_development',
                message: `Consider activities in: ${zeroPillars.join(', ')} to develop all Four Pillars.`,
                actionable: true
            });
        }

        return insights;
    }
}

module.exports = new AscendiaScoringService();