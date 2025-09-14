// =================================================================
// ELITE SUBMISSIONS TRACKING CONTROLLER
// =================================================================

const pool = require('../db');

class SubmissionsController {

    // === ECOSYSTEM INTEGRATION METHODS ===

    // Get comprehensive ecosystem profile
    static async getEcosystemProfile(req, res) {
        try {
            const userId = req.user.id;

            const profileQuery = `
                SELECT
                    uep.*,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name
                FROM user_ecosystem_profile uep
                LEFT JOIN users u ON uep.user_id = u.id
                WHERE uep.user_id = $1
            `;

            const result = await pool.query(profileQuery, [userId]);

            if (result.rows.length === 0) {
                // Initialize profile if doesn't exist
                await pool.query(
                    'INSERT INTO user_ecosystem_profile (user_id) VALUES ($1)',
                    [userId]
                );
                return this.getEcosystemProfile(req, res);
            }

            const profile = result.rows[0];

            // Get recent activities
            const recentActivities = await pool.query(`
                (
                    SELECT 'coding' as type, lesson_title as title, submission_time as timestamp,
                           sparks_earned as reward, language as detail
                    FROM user_submissions
                    WHERE user_id = $1 AND is_solved = true
                    ORDER BY submission_time DESC
                    LIMIT 5
                )
                UNION ALL
                (
                    SELECT 'session' as type, session_title as title, actual_end_time as timestamp,
                           sparks_awarded as reward, session_type as detail
                    FROM session_bookings
                    WHERE (student_id = $1 OR teacher_id = $1) AND status = 'completed'
                    ORDER BY actual_end_time DESC
                    LIMIT 5
                )
                ORDER BY timestamp DESC
                LIMIT 10
            `, [userId]);

            res.json({
                success: true,
                profile,
                recentActivities: recentActivities.rows,
                ecosystemLevel: this.calculateEcosystemLevel(profile.overall_ecosystem_score)
            });

        } catch (error) {
            console.error('❌ Error fetching ecosystem profile:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch ecosystem profile' });
        }
    }

    // Get comprehensive dashboard data
    static async getDashboard(req, res) {
        try {
            const userId = req.user.id;

            // Get ecosystem profile
            const profileResult = await pool.query(
                'SELECT * FROM user_ecosystem_profile WHERE user_id = $1',
                [userId]
            );

            // Get recent submissions
            const recentSubmissions = await pool.query(`
                SELECT lesson_title, language, submission_time, is_solved, pass_rate, sparks_earned
                FROM user_submissions
                WHERE user_id = $1
                ORDER BY submission_time DESC
                LIMIT 10
            `, [userId]);

            // Get upcoming sessions
            const upcomingSessions = await pool.query(`
                SELECT sb.*, u.username as teacher_name
                FROM session_bookings sb
                LEFT JOIN users u ON sb.teacher_id = u.id
                WHERE sb.student_id = $1 AND sb.status = 'scheduled'
                  AND sb.scheduled_time > NOW()
                ORDER BY sb.scheduled_time ASC
                LIMIT 5
            `, [userId]);

            // Get user ranking
            const rankingResult = await pool.query(`
                SELECT overall_rank, coding_rank, trading_rank, teaching_rank
                FROM ecosystem_leaderboards
                WHERE user_id = $1 AND ranking_period = 'current'
            `, [userId]);

            // Get recent achievements
            const recentAchievements = await pool.query(`
                SELECT achievement_title, achievement_description, achievement_icon,
                       sparks_reward, unlocked_at, rarity
                FROM user_achievements
                WHERE user_id = $1
                ORDER BY unlocked_at DESC
                LIMIT 5
            `, [userId]);

            res.json({
                success: true,
                profile: profileResult.rows[0] || null,
                recentSubmissions: recentSubmissions.rows,
                upcomingSessions: upcomingSessions.rows,
                ranking: rankingResult.rows[0] || null,
                recentAchievements: recentAchievements.rows
            });

        } catch (error) {
            console.error('❌ Error fetching dashboard:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
        }
    }

    // Check and award achievements
    static async checkAndAwardAchievements(req, res) {
        try {
            const userId = req.user.id;
            const achievements = [];

            // Get user stats
            const profile = await pool.query(
                'SELECT * FROM user_ecosystem_profile WHERE user_id = $1',
                [userId]
            );

            if (profile.rows.length === 0) return res.json({ success: true, achievements: [] });

            const userProfile = profile.rows[0];

            // Check various achievement conditions
            const achievementChecks = [
                {
                    type: 'first_problem_solved',
                    condition: userProfile.total_problems_solved === 1,
                    title: 'First Steps 🎯',
                    description: 'Solved your first coding problem!',
                    sparks: 25
                },
                {
                    type: 'problem_solver_10',
                    condition: userProfile.total_problems_solved >= 10,
                    title: 'Problem Crusher 💪',
                    description: 'Solved 10 coding problems!',
                    sparks: 50
                },
                {
                    type: 'coding_streak_7',
                    condition: userProfile.coding_streak_days >= 7,
                    title: 'Week Warrior 🔥',
                    description: 'Maintained a 7-day coding streak!',
                    sparks: 75
                },
                {
                    type: 'spark_collector_100',
                    condition: userProfile.total_sparks >= 100,
                    title: 'Spark Collector ⭐',
                    description: 'Collected 100 sparks!',
                    sparks: 25
                },
                {
                    type: 'teaching_star',
                    condition: userProfile.teacher_rating >= 4.5 && userProfile.sessions_as_teacher >= 5,
                    title: 'Teaching Star 🌟',
                    description: 'Achieved 4.5+ rating with 5+ teaching sessions!',
                    sparks: 100
                }
            ];

            for (const check of achievementChecks) {
                if (check.condition) {
                    // Check if achievement already exists
                    const existing = await pool.query(
                        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_type = $2',
                        [userId, check.type]
                    );

                    if (existing.rows.length === 0) {
                        // Award new achievement
                        await pool.query(`
                            INSERT INTO user_achievements (
                                user_id, achievement_type, achievement_title,
                                achievement_description, sparks_reward
                            ) VALUES ($1, $2, $3, $4, $5)
                        `, [userId, check.type, check.title, check.description, check.sparks]);

                        // Award sparks
                        await pool.query(`
                            INSERT INTO sparks_transactions (
                                user_id, transaction_type, amount, source_type, description
                            ) VALUES ($1, 'earned', $2, 'achievement', $3)
                        `, [userId, check.sparks, `Achievement: ${check.title}`]);

                        // Update user profile sparks
                        await pool.query(`
                            UPDATE user_ecosystem_profile
                            SET total_sparks = total_sparks + $2,
                                sparks_this_month = sparks_this_month + $2,
                                sparks_lifetime = sparks_lifetime + $2
                            WHERE user_id = $1
                        `, [userId, check.sparks]);

                        achievements.push(check);
                    }
                }
            }

            res.json({ success: true, achievements });

        } catch (error) {
            console.error('❌ Error checking achievements:', error);
            res.status(500).json({ success: false, error: 'Failed to check achievements' });
        }
    }

    // Submit a solution and track performance
    static async submitSolution(req, res) {
        try {
            const userId = req.user.id;
            const {
                courseId,
                courseTitle,
                moduleIndex,
                lessonIndex,
                lessonTitle,
                lesson_id, // Frontend sends this for enhanced courses
                lesson_title, // Frontend sends this for enhanced courses
                course_title, // Frontend sends this for enhanced courses
                language,
                submittedCode,
                code, // Frontend sends this for enhanced courses
                testResults,
                executionTimeMs,
                memoryUsageMB,
                linesOfCode
            } = req.body;

            // Map frontend parameters to expected format
            const finalCourseId = courseId || lesson_id;
            const finalCourseTitle = courseTitle || course_title;
            const finalLessonTitle = lessonTitle || lesson_title;
            const finalSubmittedCode = submittedCode || code;
            const finalModuleIndex = moduleIndex || 0; // Default to 0 if missing
            const finalLessonIndex = lessonIndex || 0; // Default to 0 if missing

            console.log('🚀 Processing submission:', {
                userId,
                courseId: finalCourseId,
                courseTitle: finalCourseTitle,
                lessonTitle: finalLessonTitle,
                language,
                codeLength: finalSubmittedCode?.length || 0,
                testsPassed: testResults?.passed || 0,
                totalTests: testResults?.total || 0
            });

            // Calculate if problem is solved (all tests pass)
            const testsPassed = testResults?.passed || 0;
            const totalTests = testResults?.total || 0;
            const isSolved = testsPassed === totalTests && totalTests > 0;

            // Check if this is the first time solving this problem
            const existingSolvedSubmission = await pool.query(`
                SELECT id, submission_time
                FROM user_submissions
                WHERE user_id = $1 AND course_id = $2 AND module_index = $3
                AND lesson_index = $4 AND is_solved = true
                LIMIT 1
            `, [userId, finalCourseId, finalModuleIndex, finalLessonIndex]);

            const firstSolveTime = isSolved && existingSolvedSubmission.rows.length === 0 ? new Date() : null;

            // Get current attempt count
            const attemptCountResult = await pool.query(`
                SELECT COUNT(*) as count
                FROM user_submissions
                WHERE user_id = $1 AND course_id = $2 AND module_index = $3 AND lesson_index = $4
            `, [userId, finalCourseId, finalModuleIndex, finalLessonIndex]);

            const attemptCount = parseInt(attemptCountResult.rows[0].count) + 1;

            // Calculate code complexity score (simple metric)
            const codeComplexityScore = SubmissionsController.calculateComplexityScore(finalSubmittedCode);

            // Insert submission record
            const submissionResult = await pool.query(`
                INSERT INTO user_submissions (
                    user_id, course_id, course_title, module_index, lesson_index,
                    lesson_title, language, submitted_code, tests_passed, total_tests,
                    execution_time_ms, memory_usage_mb, is_solved, attempts_count,
                    first_solve_time, lines_of_code, code_complexity_score,
                    submission_metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id, submission_time, pass_rate
            `, [
                userId, finalCourseId, finalCourseTitle, finalModuleIndex, finalLessonIndex,
                finalLessonTitle, language, finalSubmittedCode, testsPassed, totalTests,
                executionTimeMs, memoryUsageMB, isSolved, attemptCount,
                firstSolveTime, linesOfCode, codeComplexityScore,
                JSON.stringify(testResults)
            ]);

            const submission = submissionResult.rows[0];

            // Get updated user progress
            const progressResult = await pool.query(`
                SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2
            `, [userId, finalCourseId]);

            res.json({
                success: true,
                submission: {
                    id: submission.id,
                    submissionTime: submission.submission_time,
                    passRate: submission.pass_rate,
                    isSolved,
                    isFirstSolve: firstSolveTime !== null,
                    attemptNumber: attemptCount
                },
                progress: progressResult.rows[0] || null,
                message: isSolved
                    ? (firstSolveTime ? '🎉 Problem solved! First time!' : '✅ Problem solved again!')
                    : `📝 Submission recorded. ${testsPassed}/${totalTests} tests passed.`
            });

        } catch (error) {
            console.error('❌ Submission error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process submission',
                details: error.message
            });
        }
    }

    // Get user's solved problems directory
    static async getSolvedProblems(req, res) {
        try {
            const userId = req.user.id;
            const { courseId, page = 1, limit = 20, difficulty, language } = req.query;

            console.log('📚 Fetching solved problems for user:', userId);

            let whereConditions = ['us.user_id = $1', 'us.is_solved = true'];
            let queryParams = [userId];
            let paramCount = 1;

            // Add filters
            if (courseId) {
                paramCount++;
                whereConditions.push(`us.course_id = $${paramCount}`);
                queryParams.push(courseId);
            }

            if (language) {
                paramCount++;
                whereConditions.push(`us.language = $${paramCount}`);
                queryParams.push(language);
            }

            if (difficulty) {
                paramCount++;
                whereConditions.push(`pm.difficulty_level = $${paramCount}`);
                queryParams.push(difficulty);
            }

            const offset = (page - 1) * limit;

            const query = `
                SELECT DISTINCT ON (us.course_id, us.module_index, us.lesson_index)
                    us.id,
                    us.course_id,
                    us.course_title,
                    us.module_index,
                    us.lesson_index,
                    us.lesson_title,
                    us.language,
                    us.submission_time,
                    us.first_solve_time,
                    us.attempts_count,
                    us.pass_rate,
                    us.execution_time_ms,
                    us.lines_of_code,
                    us.code_complexity_score,
                    pm.difficulty_level,
                    pm.problem_tags,
                    pm.estimated_time_minutes,
                    pm.success_rate as global_success_rate
                FROM user_submissions us
                LEFT JOIN problem_metadata pm ON (
                    us.course_id = pm.course_id AND
                    us.module_index = pm.module_index AND
                    us.lesson_index = pm.lesson_index
                )
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY us.course_id, us.module_index, us.lesson_index, us.first_solve_time ASC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            queryParams.push(limit, offset);

            const result = await pool.query(query, queryParams);

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(DISTINCT(us.course_id, us.module_index, us.lesson_index)) as total
                FROM user_submissions us
                LEFT JOIN problem_metadata pm ON (
                    us.course_id = pm.course_id AND
                    us.module_index = pm.module_index AND
                    us.lesson_index = pm.lesson_index
                )
                WHERE ${whereConditions.join(' AND ')}
            `;

            const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
            const totalProblems = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                problems: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProblems / limit),
                    totalProblems,
                    hasNextPage: (page * limit) < totalProblems,
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error('❌ Error fetching solved problems:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch solved problems',
                details: error.message
            });
        }
    }

    // Get detailed submission history for a specific problem
    static async getSubmissionHistory(req, res) {
        try {
            const userId = req.user.id;
            const { courseId, moduleIndex, lessonIndex } = req.params;

            console.log('📊 Fetching submission history:', { courseId, moduleIndex, lessonIndex });

            const query = `
                SELECT
                    id,
                    submitted_code,
                    submission_time,
                    language,
                    tests_passed,
                    total_tests,
                    pass_rate,
                    execution_time_ms,
                    memory_usage_mb,
                    is_solved,
                    lines_of_code,
                    code_complexity_score,
                    submission_metadata
                FROM user_submissions
                WHERE user_id = $1 AND course_id = $2 AND module_index = $3 AND lesson_index = $4
                ORDER BY submission_time DESC
            `;

            const result = await pool.query(query, [userId, courseId, moduleIndex, lessonIndex]);

            res.json({
                success: true,
                submissions: result.rows,
                totalSubmissions: result.rows.length,
                bestSubmission: result.rows.find(sub => sub.is_solved) || null
            });

        } catch (error) {
            console.error('❌ Error fetching submission history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch submission history',
                details: error.message
            });
        }
    }

    // === SESSION MANAGEMENT METHODS ===

    // Book a session with a teacher
    static async bookSession(req, res) {
        try {
            const studentId = req.user.id;
            const {
                teacherId,
                sessionTitle,
                sessionDescription,
                scheduledTime,
                durationMinutes = 60,
                sessionType = 'coding'
            } = req.body;

            console.log('📅 Booking session:', { studentId, teacherId, sessionTitle, scheduledTime });

            const result = await pool.query(`
                INSERT INTO session_bookings (
                    student_id, teacher_id, session_title, session_description,
                    scheduled_time, duration_minutes, session_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, scheduled_time
            `, [studentId, teacherId, sessionTitle, sessionDescription, scheduledTime, durationMinutes, sessionType]);

            // Update user profile
            await pool.query(`
                UPDATE user_ecosystem_profile
                SET sessions_scheduled = sessions_scheduled + 1
                WHERE user_id = $1
            `, [studentId]);

            res.json({
                success: true,
                sessionId: result.rows[0].id,
                scheduledTime: result.rows[0].scheduled_time,
                message: '✅ Session booked successfully!'
            });

        } catch (error) {
            console.error('❌ Error booking session:', error);
            res.status(500).json({ success: false, error: 'Failed to book session' });
        }
    }

    // Rate a completed session
    static async rateSession(req, res) {
        try {
            const userId = req.user.id;
            const { sessionId } = req.params;
            const {
                communicationRating,
                knowledgeRating,
                preparationRating,
                helpfulnessRating,
                writtenFeedback,
                wouldRecommend = true,
                sessionTags = []
            } = req.body;

            console.log('⭐ Rating session:', { sessionId, userId });

            // Get session details
            const sessionResult = await pool.query(
                'SELECT student_id, teacher_id FROM session_bookings WHERE id = $1',
                [sessionId]
            );

            if (sessionResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            const session = sessionResult.rows[0];
            const teacherId = session.teacher_id;

            // Insert teacher rating
            await pool.query(`
                INSERT INTO teacher_ratings (
                    teacher_id, student_id, session_id, communication_rating,
                    knowledge_rating, preparation_rating, helpfulness_rating,
                    written_feedback, would_recommend, session_tags
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                teacherId, userId, sessionId, communicationRating,
                knowledgeRating, preparationRating, helpfulnessRating,
                writtenFeedback, wouldRecommend, sessionTags
            ]);

            // Update teacher's average rating
            const avgRatingResult = await pool.query(`
                SELECT AVG(overall_rating) as avg_rating, COUNT(*) as total_ratings
                FROM teacher_ratings
                WHERE teacher_id = $1
            `, [teacherId]);

            const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating || 0);
            const totalRatings = parseInt(avgRatingResult.rows[0].total_ratings || 0);

            // Update teacher profile
            await pool.query(`
                UPDATE user_ecosystem_profile
                SET teacher_rating = $2,
                    total_students_taught = GREATEST(total_students_taught, $3)
                WHERE user_id = $1
            `, [teacherId, avgRating, totalRatings]);

            // Award sparks for rating
            await pool.query(`
                INSERT INTO sparks_transactions (
                    user_id, transaction_type, amount, source_type, description
                ) VALUES ($1, 'earned', 5, 'session_completed', 'Rated session: ' || $2)
            `, [userId, sessionId]);

            res.json({
                success: true,
                message: '✅ Session rated successfully!',
                teacherNewRating: avgRating
            });

        } catch (error) {
            console.error('❌ Error rating session:', error);
            res.status(500).json({ success: false, error: 'Failed to rate session' });
        }
    }

    // === LEADERBOARD METHODS ===

    // Get leaderboards
    static async getLeaderboards(req, res) {
        try {
            const { period = 'current', limit = 50 } = req.query;

            const leaderboardQuery = `
                SELECT
                    el.*,
                    u.username,
                    u.first_name,
                    u.last_name,
                    uep.total_sparks,
                    uep.spark_level,
                    uep.trading_level
                FROM ecosystem_leaderboards el
                LEFT JOIN users u ON el.user_id = u.id
                LEFT JOIN user_ecosystem_profile uep ON el.user_id = uep.user_id
                WHERE el.ranking_period = $1
                  AND el.overall_rank IS NOT NULL
                ORDER BY el.overall_rank ASC
                LIMIT $2
            `;

            const result = await pool.query(leaderboardQuery, [period, limit]);

            res.json({
                success: true,
                leaderboard: result.rows,
                period,
                totalEntries: result.rows.length
            });

        } catch (error) {
            console.error('❌ Error fetching leaderboards:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch leaderboards' });
        }
    }

    // Update trading score from Zenith Trade Terminal
    static async updateTradingScore(req, res) {
        try {
            const userId = req.user.id;
            const {
                pScore,
                portfolioValue,
                successfulTrades,
                totalTrades,
                profitAmount
            } = req.body;

            console.log('💰 Updating trading score:', { userId, pScore, portfolioValue });

            // Calculate sparks earned from trading performance
            let sparksEarned = 0;
            if (profitAmount > 0) {
                sparksEarned = Math.floor(profitAmount / 100); // 1 spark per $100 profit
            }

            // Update ecosystem profile
            await pool.query(`
                UPDATE user_ecosystem_profile
                SET p_score = $2,
                    total_portfolio_value = $3,
                    successful_trades = $4,
                    total_trades = $5,
                    total_sparks = CASE WHEN $6 > 0 THEN total_sparks + $6 ELSE total_sparks END,
                    sparks_this_month = CASE WHEN $6 > 0 THEN sparks_this_month + $6 ELSE sparks_this_month END,
                    last_trade_activity = NOW(),
                    updated_at = NOW()
                WHERE user_id = $1
            `, [userId, pScore, portfolioValue, successfulTrades, totalTrades, sparksEarned]);

            // Record sparks transaction if earned
            if (sparksEarned > 0) {
                await pool.query(`
                    INSERT INTO sparks_transactions (
                        user_id, transaction_type, amount, source_type, description
                    ) VALUES ($1, 'earned', $2, 'trading_profit', 'Trading profit: $' || $3)
                `, [userId, sparksEarned, profitAmount]);
            }

            res.json({
                success: true,
                pScore,
                sparksEarned,
                message: sparksEarned > 0 ? `💰 Trading update complete! Earned ${sparksEarned} sparks!` : '📊 Trading score updated'
            });

        } catch (error) {
            console.error('❌ Error updating trading score:', error);
            res.status(500).json({ success: false, error: 'Failed to update trading score' });
        }
    }

    // Calculate ecosystem level based on score
    static calculateEcosystemLevel(score) {
        if (score >= 1000) return { name: 'Legend', color: '#FFD700', icon: '👑' };
        if (score >= 750) return { name: 'Master', color: '#9932CC', icon: '🏆' };
        if (score >= 500) return { name: 'Expert', color: '#FF6347', icon: '⭐' };
        if (score >= 250) return { name: 'Advanced', color: '#1E90FF', icon: '🚀' };
        if (score >= 100) return { name: 'Intermediate', color: '#32CD32', icon: '📈' };
        return { name: 'Beginner', color: '#87CEEB', icon: '🌱' };
    }

    // Get user progress dashboard
    static async getUserProgress(req, res) {
        try {
            const userId = req.user.id;
            const { courseId } = req.query;

            console.log('📈 Fetching user progress for:', userId);

            let progressQuery = `
                SELECT
                    up.*,
                    ec.title as course_title,
                    ec.description as course_description
                FROM user_progress up
                LEFT JOIN enhanced_courses ec ON up.course_id = ec.id
                WHERE up.user_id = $1
            `;

            let queryParams = [userId];

            if (courseId) {
                progressQuery += ' AND up.course_id = $2';
                queryParams.push(courseId);
            }

            progressQuery += ' ORDER BY up.last_activity DESC';

            const progressResult = await pool.query(progressQuery, queryParams);

            // Get recent submissions
            const recentSubmissionsQuery = `
                SELECT
                    course_title,
                    lesson_title,
                    language,
                    submission_time,
                    is_solved,
                    pass_rate
                FROM user_submissions
                WHERE user_id = $1
                ORDER BY submission_time DESC
                LIMIT 10
            `;

            const recentSubmissions = await pool.query(recentSubmissionsQuery, [userId]);

            // Get language statistics
            const languageStatsQuery = `
                SELECT
                    language,
                    COUNT(*) as total_submissions,
                    COUNT(CASE WHEN is_solved THEN 1 END) as solved_problems,
                    AVG(pass_rate) as average_score
                FROM user_submissions
                WHERE user_id = $1
                GROUP BY language
                ORDER BY solved_problems DESC, total_submissions DESC
            `;

            const languageStats = await pool.query(languageStatsQuery, [userId]);

            res.json({
                success: true,
                courseProgress: progressResult.rows,
                recentSubmissions: recentSubmissions.rows,
                languageStats: languageStats.rows,
                summary: {
                    totalCourses: progressResult.rows.length,
                    totalSolved: progressResult.rows.reduce((sum, course) => sum + course.solved_problems, 0),
                    totalSubmissions: progressResult.rows.reduce((sum, course) => sum + course.total_submissions, 0)
                }
            });

        } catch (error) {
            console.error('❌ Error fetching user progress:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user progress',
                details: error.message
            });
        }
    }

    // Get next recommended lesson
    static async getNextLesson(req, res) {
        try {
            const { courseId, currentModuleIndex, currentLessonIndex } = req.params;

            console.log('➡️ Finding next lesson:', { courseId, currentModuleIndex, currentLessonIndex });

            // Get course structure
            const courseQuery = `
                SELECT title, description, metadata
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true
            `;

            const courseResult = await pool.query(courseQuery, [courseId]);

            if (courseResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];

            const moduleIndex = parseInt(currentModuleIndex);
            const lessonIndex = parseInt(currentLessonIndex);

            let nextModuleIndex = moduleIndex;
            let nextLessonIndex = lessonIndex + 1;

            // Check if we need to move to next module
            if (nextLessonIndex >= modules[moduleIndex]?.lessons?.lessons?.length) {
                nextModuleIndex = moduleIndex + 1;
                nextLessonIndex = 0;
            }

            // Check if we've completed the course
            if (nextModuleIndex >= modules.length) {
                return res.json({
                    success: true,
                    hasNext: false,
                    courseCompleted: true,
                    message: '🎓 Congratulations! You have completed this course!'
                });
            }

            const nextModule = modules[nextModuleIndex];
            const nextLesson = nextModule.lessons?.lessons?.[nextLessonIndex];

            if (!nextLesson) {
                return res.json({
                    success: true,
                    hasNext: false,
                    courseCompleted: true
                });
            }

            res.json({
                success: true,
                hasNext: true,
                nextLesson: {
                    courseId,
                    moduleIndex: nextModuleIndex,
                    lessonIndex: nextLessonIndex,
                    lessonTitle: nextLesson.title,
                    moduleName: nextModule.name,
                    url: `/enhanced-courses/${courseId}/ide?moduleIndex=${nextModuleIndex}&lessonIndex=${nextLessonIndex}`
                }
            });

        } catch (error) {
            console.error('❌ Error finding next lesson:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to find next lesson',
                details: error.message
            });
        }
    }

    // Helper method to calculate code complexity score
    static calculateComplexityScore(code) {
        if (!code || typeof code !== 'string') return 0;

        let score = 0;
        const lines = code.split('\n').filter(line => line.trim().length > 0);

        // Basic metrics
        score += lines.length * 0.1; // Line count factor
        score += (code.match(/\bif\b/g) || []).length * 2; // Conditional complexity
        score += (code.match(/\bfor\b|\bwhile\b/g) || []).length * 3; // Loop complexity
        score += (code.match(/\bfunction\b|\bdef\b/g) || []).length * 1; // Function definitions
        score += (code.match(/\btry\b|\bcatch\b|\bexcept\b/g) || []).length * 2; // Error handling

        return Math.round(score * 10) / 10; // Round to 1 decimal place
    }

    // Get sparks history
    static async getSparksHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await pool.query(`
                SELECT
                    transaction_type,
                    amount,
                    source_type,
                    description,
                    transaction_time,
                    metadata
                FROM sparks_transactions
                WHERE user_id = $1
                ORDER BY transaction_time DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);

            const totalResult = await pool.query(
                'SELECT COUNT(*) as total FROM sparks_transactions WHERE user_id = $1',
                [userId]
            );

            res.json({
                success: true,
                transactions: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalResult.rows[0].total / limit),
                    totalTransactions: parseInt(totalResult.rows[0].total)
                }
            });

        } catch (error) {
            console.error('❌ Error fetching sparks history:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch sparks history' });
        }
    }

    // Get user achievements
    static async getUserAchievements(req, res) {
        try {
            const userId = req.user.id;

            const result = await pool.query(`
                SELECT
                    achievement_type,
                    achievement_title,
                    achievement_description,
                    achievement_icon,
                    category,
                    rarity,
                    sparks_reward,
                    unlocked_at
                FROM user_achievements
                WHERE user_id = $1
                ORDER BY unlocked_at DESC
            `, [userId]);

            res.json({
                success: true,
                achievements: result.rows,
                totalAchievements: result.rows.length
            });

        } catch (error) {
            console.error('❌ Error fetching achievements:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
        }
    }

    // Get upcoming sessions
    static async getUpcomingSessions(req, res) {
        try {
            const userId = req.user.id;

            const result = await pool.query(`
                SELECT
                    sb.*,
                    teacher.username as teacher_name,
                    teacher.first_name as teacher_first_name,
                    student.username as student_name,
                    student.first_name as student_first_name
                FROM session_bookings sb
                LEFT JOIN users teacher ON sb.teacher_id = teacher.id
                LEFT JOIN users student ON sb.student_id = student.id
                WHERE (sb.student_id = $1 OR sb.teacher_id = $1)
                  AND sb.status IN ('scheduled', 'in_progress')
                  AND sb.scheduled_time > NOW()
                ORDER BY sb.scheduled_time ASC
            `, [userId]);

            res.json({
                success: true,
                sessions: result.rows
            });

        } catch (error) {
            console.error('❌ Error fetching upcoming sessions:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch upcoming sessions' });
        }
    }

    // Get session history
    static async getSessionHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await pool.query(`
                SELECT
                    sb.*,
                    teacher.username as teacher_name,
                    student.username as student_name,
                    tr.overall_rating,
                    tr.written_feedback
                FROM session_bookings sb
                LEFT JOIN users teacher ON sb.teacher_id = teacher.id
                LEFT JOIN users student ON sb.student_id = student.id
                LEFT JOIN teacher_ratings tr ON sb.id = tr.session_id
                WHERE (sb.student_id = $1 OR sb.teacher_id = $1)
                  AND sb.status = 'completed'
                ORDER BY sb.actual_end_time DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);

            res.json({
                success: true,
                sessions: result.rows
            });

        } catch (error) {
            console.error('❌ Error fetching session history:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch session history' });
        }
    }

    // Complete a session
    static async completeSession(req, res) {
        try {
            const { sessionId } = req.params;
            const {
                sessionNotes,
                homeworkAssigned,
                sparksAwarded = 20
            } = req.body;

            await pool.query(`
                UPDATE session_bookings
                SET status = 'completed',
                    actual_end_time = NOW(),
                    session_notes = $2,
                    homework_assigned = $3,
                    sparks_awarded = $4
                WHERE id = $1
            `, [sessionId, sessionNotes, homeworkAssigned, sparksAwarded]);

            // Award sparks to both participants
            const sessionResult = await pool.query(
                'SELECT student_id, teacher_id FROM session_bookings WHERE id = $1',
                [sessionId]
            );

            if (sessionResult.rows.length > 0) {
                const { student_id, teacher_id } = sessionResult.rows[0];

                // Award sparks to both student and teacher
                for (const userId of [student_id, teacher_id]) {
                    await pool.query(`
                        INSERT INTO sparks_transactions (
                            user_id, transaction_type, amount, source_type, description
                        ) VALUES ($1, 'earned', $2, 'session_completed', 'Completed session')
                    `, [userId, sparksAwarded]);

                    await pool.query(`
                        UPDATE user_ecosystem_profile
                        SET total_sparks = total_sparks + $2,
                            sparks_this_month = sparks_this_month + $2
                        WHERE user_id = $1
                    `, [userId, sparksAwarded]);
                }
            }

            res.json({
                success: true,
                message: '✅ Session completed successfully!',
                sparksAwarded
            });

        } catch (error) {
            console.error('❌ Error completing session:', error);
            res.status(500).json({ success: false, error: 'Failed to complete session' });
        }
    }

    // Get teacher statistics
    static async getTeacherStats(req, res) {
        try {
            const userId = req.user.id;

            const statsResult = await pool.query(`
                SELECT
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_sessions,
                    AVG(CASE WHEN status = 'completed' THEN duration_minutes END) as avg_session_duration,
                    SUM(CASE WHEN status = 'completed' THEN sparks_awarded ELSE 0 END) as total_sparks_awarded
                FROM session_bookings
                WHERE teacher_id = $1
            `, [userId]);

            const ratingsResult = await pool.query(`
                SELECT
                    AVG(overall_rating) as average_rating,
                    COUNT(*) as total_ratings,
                    COUNT(CASE WHEN would_recommend THEN 1 END) as recommendations
                FROM teacher_ratings
                WHERE teacher_id = $1
            `, [userId]);

            res.json({
                success: true,
                sessionStats: statsResult.rows[0],
                ratingStats: ratingsResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Error fetching teacher stats:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch teacher stats' });
        }
    }

    // Get course progress for a specific course
    static async getCourseProgress(req, res) {
        try {
            const userId = req.user.id;
            const { courseId } = req.params;

            const progressResult = await pool.query(`
                SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2
            `, [userId, courseId]);

            const solvedProblemsResult = await pool.query(`
                SELECT
                    module_index,
                    lesson_index,
                    lesson_title,
                    first_solve_time,
                    attempts_count,
                    language
                FROM user_submissions
                WHERE user_id = $1 AND course_id = $2 AND is_solved = true
                ORDER BY module_index, lesson_index
            `, [userId, courseId]);

            res.json({
                success: true,
                progress: progressResult.rows[0] || null,
                solvedProblems: solvedProblemsResult.rows
            });

        } catch (error) {
            console.error('❌ Error fetching course progress:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch course progress' });
        }
    }

    // Get detailed teacher ratings
    static async getTeacherRatings(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const ratingsResult = await pool.query(`
                SELECT
                    tr.*,
                    u.username as student_name,
                    sb.session_title,
                    sb.session_type,
                    sb.scheduled_time
                FROM teacher_ratings tr
                LEFT JOIN users u ON tr.student_id = u.id
                LEFT JOIN session_bookings sb ON tr.session_id = sb.id
                WHERE tr.teacher_id = $1
                ORDER BY tr.created_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);

            const countResult = await pool.query(`
                SELECT COUNT(*) as total FROM teacher_ratings WHERE teacher_id = $1
            `, [userId]);

            const statsResult = await pool.query(`
                SELECT
                    AVG(overall_rating) as average_rating,
                    AVG(communication_rating) as avg_communication,
                    AVG(knowledge_rating) as avg_knowledge,
                    AVG(preparation_rating) as avg_preparation,
                    AVG(helpfulness_rating) as avg_helpfulness,
                    COUNT(*) as total_ratings,
                    COUNT(CASE WHEN would_recommend THEN 1 END) as recommendations
                FROM teacher_ratings
                WHERE teacher_id = $1
            `, [userId]);

            res.json({
                success: true,
                ratings: ratingsResult.rows,
                stats: statsResult.rows[0],
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(countResult.rows[0].total / limit),
                    totalItems: parseInt(countResult.rows[0].total),
                    itemsPerPage: limit
                }
            });

        } catch (error) {
            console.error('❌ Error fetching teacher ratings:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch teacher ratings' });
        }
    }

    // Get students taught by teacher
    static async getStudents(req, res) {
        try {
            const userId = req.user.id;

            const studentsResult = await pool.query(`
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.display_name,
                    u.email,
                    COUNT(sb.id) as total_sessions,
                    AVG(tr.overall_rating) as avg_rating_given,
                    MAX(sb.scheduled_time) as last_session_date
                FROM users u
                INNER JOIN session_bookings sb ON u.id = sb.student_id
                LEFT JOIN teacher_ratings tr ON u.id = tr.student_id AND tr.teacher_id = $1
                WHERE sb.teacher_id = $1 AND sb.status IN ('completed', 'scheduled')
                GROUP BY u.id, u.username, u.display_name, u.email
                ORDER BY COUNT(sb.id) DESC, MAX(sb.scheduled_time) DESC
            `, [userId]);

            res.json({
                success: true,
                students: studentsResult.rows
            });

        } catch (error) {
            console.error('❌ Error fetching students:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch students data' });
        }
    }

    // Get category-specific leaderboard
    static async getCategoryLeaderboard(req, res) {
        try {
            const { category } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const validCategories = ['coding', 'trading', 'teaching', 'overall'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ success: false, error: 'Invalid category' });
            }

            let rankColumn, scoreColumn;
            switch (category) {
                case 'coding':
                    rankColumn = 'coding_rank';
                    scoreColumn = 'coding_score';
                    break;
                case 'trading':
                    rankColumn = 'trading_rank';
                    scoreColumn = 'trading_score';
                    break;
                case 'teaching':
                    rankColumn = 'teaching_rank';
                    scoreColumn = 'teaching_score';
                    break;
                case 'overall':
                    rankColumn = 'overall_rank';
                    scoreColumn = 'ecosystem_score';
                    break;
            }

            const result = await pool.query(`
                SELECT
                    l.${rankColumn} as position,
                    l.${scoreColumn} as score,
                    u.username,
                    u.display_name
                FROM ecosystem_leaderboards l
                INNER JOIN users u ON l.user_id = u.id
                WHERE l.ranking_period = 'current' AND l.${rankColumn} IS NOT NULL
                ORDER BY l.${rankColumn}
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            const countResult = await pool.query(`
                SELECT COUNT(*) as total
                FROM ecosystem_leaderboards
                WHERE ranking_period = 'current' AND ${rankColumn} IS NOT NULL
            `);

            res.json({
                success: true,
                category,
                leaderboard: result.rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(countResult.rows[0].total / limit),
                    totalItems: parseInt(countResult.rows[0].total),
                    itemsPerPage: limit
                }
            });

        } catch (error) {
            console.error('❌ Error fetching category leaderboard:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
        }
    }

    // Update rankings
    static async updateRankings(req, res) {
        try {
            // Call the database function to update rankings
            await pool.query('SELECT update_ecosystem_rankings()');

            res.json({
                success: true,
                message: 'Rankings updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating rankings:', error);
            res.status(500).json({ success: false, error: 'Failed to update rankings' });
        }
    }

    // Get trading stats for user
    static async getTradingStats(req, res) {
        try {
            const userId = req.user.id;

            const result = await pool.query(`
                SELECT
                    p_score,
                    total_portfolio_value,
                    trading_level,
                    successful_trades,
                    total_trades,
                    win_rate,
                    last_trade_activity
                FROM user_ecosystem_profile
                WHERE user_id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Trading profile not found' });
            }

            res.json({
                success: true,
                tradingStats: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Error fetching trading stats:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch trading stats' });
        }
    }

}

module.exports = SubmissionsController;