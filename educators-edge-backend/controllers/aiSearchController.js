// educators-edge-backend/controllers/aiSearchController.js
const geminiService = require('../services/geminiService');
const db = require('../db');

/**
 * AI-powered lesson search for course creation
 */
const intelligentLessonSearch = async (req, res) => {
    const { query, courseContext } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        // Log search for analytics
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'lesson_search', $2, $3, NOW())
        `, [req.user.id, query, JSON.stringify(courseContext || {})]);

        const searchResults = await geminiService.intelligentLessonSearch(query, courseContext);

        res.json({
            success: true,
            results: searchResults,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('AI lesson search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message,
            fallback: 'Try a basic keyword search'
        });
    }
};

/**
 * Optimize course structure with AI
 */
const optimizeCourseStructure = async (req, res) => {
    const { lessonIds, courseGoals } = req.body;

    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
        return res.status(400).json({ error: 'Lesson IDs array is required' });
    }

    try {
        // Fetch lesson details
        const lessonsResult = await db.query(`
            SELECT l.*, 
                   COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') as concepts,
                   COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
            FROM ingested_lessons l
            LEFT JOIN lesson_concepts lc ON l.id = lc.lesson_id
            LEFT JOIN concepts c ON lc.concept_id = c.id
            LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
            LEFT JOIN tags t ON lt.tag_id = t.id
            WHERE l.id = ANY($1)
            GROUP BY l.id
            ORDER BY array_position($1, l.id)
        `, [lessonIds]);

        if (lessonsResult.rows.length === 0) {
            return res.status(404).json({ error: 'No valid lessons found' });
        }

        const lessons = lessonsResult.rows;

        // Log optimization request
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'course_optimization', $2, $3, NOW())
        `, [req.user.id, `Optimize ${lessons.length} lessons`, JSON.stringify(courseGoals || {})]);

        const optimization = await geminiService.optimizeCourseStructure(lessons, courseGoals);

        res.json({
            success: true,
            optimization,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('Course optimization error:', error);
        res.status(500).json({ 
            error: 'Optimization failed',
            details: error.message,
            fallback: 'Try manual course organization'
        });
    }
};

/**
 * Semantic lesson discovery
 */
const semanticLessonDiscovery = async (req, res) => {
    const { description } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }

    try {
        // Log semantic search
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, created_at)
            VALUES ($1, 'semantic_discovery', $2, NOW())
        `, [req.user.id, description]);

        const discovery = await geminiService.semanticLessonDiscovery(description);

        res.json({
            success: true,
            discovery,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('Semantic discovery error:', error);
        res.status(500).json({ 
            error: 'Semantic discovery failed',
            details: error.message,
            fallback: 'Try specific keyword searches'
        });
    }
};

/**
 * AI-powered chapter suggestions
 */
const suggestChapters = async (req, res) => {
    const { lessonIds } = req.body;

    if (!lessonIds || !Array.isArray(lessonIds)) {
        return res.status(400).json({ error: 'Lesson IDs array is required' });
    }

    try {
        // Fetch lesson details with concepts
        const lessonsResult = await db.query(`
            SELECT l.*, 
                   COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') as concepts,
                   COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
            FROM ingested_lessons l
            LEFT JOIN lesson_concepts lc ON l.id = lc.lesson_id
            LEFT JOIN concepts c ON lc.concept_id = c.id
            LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
            LEFT JOIN tags t ON lt.tag_id = t.id
            WHERE l.id = ANY($1)
            GROUP BY l.id
        `, [lessonIds]);

        const lessons = lessonsResult.rows;

        if (lessons.length === 0) {
            return res.status(404).json({ error: 'No valid lessons found' });
        }

        // Log chapter suggestion request
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, created_at)
            VALUES ($1, 'chapter_suggestions', $2, NOW())
        `, [req.user.id, `Suggest chapters for ${lessons.length} lessons`]);

        const suggestions = await geminiService.suggestChapters(lessons);

        res.json({
            success: true,
            suggestions,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('Chapter suggestion error:', error);
        res.status(500).json({ 
            error: 'Chapter suggestions failed',
            details: error.message,
            fallback: 'Try manual chapter organization'
        });
    }
};

/**
 * Get AI search analytics for teacher
 */
const getSearchAnalytics = async (req, res) => {
    const userId = req.user.id;

    try {
        const analyticsResult = await db.query(`
            SELECT 
                query_type,
                COUNT(*) as usage_count,
                DATE_TRUNC('day', created_at) as search_date
            FROM ai_search_logs
            WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY query_type, DATE_TRUNC('day', created_at)
            ORDER BY search_date DESC, usage_count DESC
        `, [userId]);

        const recentSearches = await db.query(`
            SELECT query_type, query_text, created_at
            FROM ai_search_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [userId]);

        res.json({
            analytics: analyticsResult.rows,
            recentSearches: recentSearches.rows,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analytics fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

/**
 * Smart lesson recommendations based on course topic
 */
const getSmartRecommendations = async (req, res) => {
    const { courseTopic, targetLevel, existingLessons = [] } = req.body;

    if (!courseTopic) {
        return res.status(400).json({ error: 'Course topic is required' });
    }

    try {
        // Use AI to find complementary lessons
        const smartQuery = `I want to create a comprehensive ${courseTopic} course for ${targetLevel || 'intermediate'} level students. Find lessons that work well together to create a complete learning experience.`;
        
        const context = {
            courseTitle: `${courseTopic} Mastery Course`,
            courseLevel: targetLevel || 'intermediate',
            targetAudience: `${targetLevel || 'Intermediate'} students`,
            objectives: `Master ${courseTopic} concepts and practical applications`,
            existingLessons: existingLessons
        };

        const recommendations = await geminiService.intelligentLessonSearch(smartQuery, context);

        // Filter out already selected lessons
        const filteredRecommendations = {
            ...recommendations,
            recommendations: recommendations.recommendations.filter(
                rec => !existingLessons.includes(rec.lessonId)
            )
        };

        res.json({
            success: true,
            recommendations: filteredRecommendations,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('Smart recommendations error:', error);
        res.status(500).json({ 
            error: 'Smart recommendations failed',
            details: error.message
        });
    }
};

/**
 * Create optimized course from AI suggestions
 */
const createOptimizedCourse = async (req, res) => {
    const { courseData, selectedLessons, optimizedStructure } = req.body;
    const teacherId = req.user.id;

    if (!courseData || !selectedLessons || !optimizedStructure) {
        return res.status(400).json({ error: 'Course data, lessons, and structure are required' });
    }

    try {
        // Begin transaction
        await db.query('BEGIN');

        // Create course
        const courseResult = await db.query(`
            INSERT INTO courses (title, description, teacher_id, level, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
        `, [courseData.title, courseData.description, teacherId, courseData.level]);

        const courseId = courseResult.rows[0].id;

        // Create chapters and add lessons
        let globalOrderIndex = 0;

        for (const chapter of optimizedStructure.chapters) {
            // Create chapter as a special lesson
            const chapterResult = await db.query(`
                INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, order_index, created_at)
                VALUES ($1, $2, $3, $4, 'chapter', $5, NOW())
                RETURNING id
            `, [
                chapter.title,
                chapter.description,
                courseId,
                teacherId,
                globalOrderIndex++
            ]);

            // Add lessons to this chapter
            for (const lessonRef of chapter.lessons) {
                await db.query(`
                    INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, order_index, ingested_lesson_id, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                `, [
                    lessonRef.lesson.title,
                    lessonRef.lesson.description,
                    courseId,
                    teacherId,
                    lessonRef.lesson.lesson_type,
                    globalOrderIndex++,
                    lessonRef.lesson.id
                ]);
            }
        }

        // Log the AI-assisted course creation
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'course_creation', $2, $3, NOW())
        `, [teacherId, `Created course: ${courseData.title}`, JSON.stringify({
            courseId,
            chaptersCreated: optimizedStructure.chapters.length,
            lessonsAdded: selectedLessons.length
        })]);

        await db.query('COMMIT');

        res.json({
            success: true,
            courseId,
            message: 'AI-optimized course created successfully',
            structure: {
                chapters: optimizedStructure.chapters.length,
                lessons: selectedLessons.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Optimized course creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create optimized course',
            details: error.message
        });
    }
};

/**
 * AI-powered teacher search for students
 */
const intelligentTeacherSearch = async (req, res) => {
    const { searchQuery, studentPreferences } = req.body;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        // Log teacher search for analytics
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'teacher_search', $2, $3, NOW())
        `, [req.user.id, searchQuery, JSON.stringify(studentPreferences || {})]);

        const searchResults = await geminiService.intelligentTeacherSearch(searchQuery, studentPreferences);

        res.json({
            success: true,
            results: searchResults,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('AI teacher search error:', error);
        res.status(500).json({ 
            error: 'Teacher search failed',
            details: error.message,
            fallback: 'Try a basic teacher search'
        });
    }
};

/**
 * Get personalized teacher recommendations for a student
 */
const getPersonalizedTeacherRecommendations = async (req, res) => {
    const studentId = req.user.id;
    const { preferences } = req.body;

    try {
        // Log personalized recommendation request
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'personalized_teacher_recommendations', $2, $3, NOW())
        `, [studentId, 'Get personalized teacher recommendations', JSON.stringify(preferences || {})]);

        const recommendations = await geminiService.getPersonalizedTeacherRecommendations(studentId, preferences);

        res.json({
            success: true,
            recommendations,
            timestamp: new Date().toISOString(),
            aiPowered: true
        });

    } catch (error) {
        console.error('Personalized teacher recommendations error:', error);
        res.status(500).json({ 
            error: 'Failed to get personalized recommendations',
            details: error.message
        });
    }
};

/**
 * Browse teachers by tier and specializations
 */
const browseTeachersByTier = async (req, res) => {
    const { tier, specializations, minRating, maxRate, availability, sortBy } = req.query;

    try {
        let whereConditions = ['p.is_searchable_teacher = TRUE'];
        let queryParams = [];
        let paramCount = 0;

        if (tier && ['pathfinder', 'explorer', 'navigator'].includes(tier)) {
            whereConditions.push(`p.user_tier = $${++paramCount}`);
            queryParams.push(tier);
        }

        if (minRating) {
            whereConditions.push(`p.average_rating >= $${++paramCount}`);
            queryParams.push(parseFloat(minRating));
        }

        if (maxRate) {
            whereConditions.push(`p.hourly_rate_sparks <= $${++paramCount}`);
            queryParams.push(parseFloat(maxRate));
        }

        if (availability && ['available', 'busy'].includes(availability)) {
            whereConditions.push(`p.availability_status = $${++paramCount}`);
            queryParams.push(availability);
        }

        let orderBy = 'p.ascendia_score DESC, p.average_rating DESC';
        if (sortBy === 'rating') orderBy = 'p.average_rating DESC, p.total_reviews DESC';
        else if (sortBy === 'experience') orderBy = 'p.years_experience DESC, p.total_sessions DESC';
        else if (sortBy === 'price_low') orderBy = 'p.hourly_rate_sparks ASC';
        else if (sortBy === 'price_high') orderBy = 'p.hourly_rate_sparks DESC';

        let specializationJoin = '';
        if (specializations) {
            const specArray = specializations.split(',');
            specializationJoin = `
                INNER JOIN user_specializations us ON u.id = us.user_id
                INNER JOIN specializations s ON us.specialization_id = s.id
            `;
            whereConditions.push(`s.name = ANY($${++paramCount})`);
            queryParams.push(specArray);
        }

        const query = `
            SELECT 
                u.id as user_id, u.username,
                p.display_name, p.bio, p.teacher_bio, p.location, p.timezone,
                p.is_mentor, p.is_counselor, p.is_essay_editor,
                p.hourly_rate_sparks, p.hourly_rate_usd,
                p.years_experience, p.education_level, p.languages,
                p.availability_status, p.total_sessions, p.average_rating,
                p.total_reviews, p.verified_mentor, p.user_tier, p.ascendia_score,
                p.can_host_group_sessions, p.max_students_per_session,
                COALESCE(array_agg(DISTINCT spec.name) FILTER (WHERE spec.name IS NOT NULL), '{}') as specializations
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            ${specializationJoin}
            LEFT JOIN user_specializations us2 ON u.id = us2.user_id
            LEFT JOIN specializations spec ON us2.specialization_id = spec.id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY u.id, u.username, p.display_name, p.bio, p.teacher_bio,
                     p.location, p.timezone, p.is_mentor, p.is_counselor, p.is_essay_editor,
                     p.hourly_rate_sparks, p.hourly_rate_usd, p.years_experience,
                     p.education_level, p.languages, p.availability_status, p.total_sessions,
                     p.average_rating, p.total_reviews, p.verified_mentor, p.user_tier, p.ascendia_score,
                     p.can_host_group_sessions, p.max_students_per_session
            ORDER BY ${orderBy}
            LIMIT 50
        `;

        const result = await db.query(query, queryParams);

        res.json({
            success: true,
            teachers: result.rows,
            filters: {
                tier,
                specializations,
                minRating,
                maxRate,
                availability,
                sortBy
            },
            count: result.rows.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Browse teachers error:', error);
        res.status(500).json({ 
            error: 'Failed to browse teachers',
            details: error.message
        });
    }
};

/**
 * Get teacher profile details for student view
 */
const getTeacherProfile = async (req, res) => {
    const { teacherId } = req.params;

    if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
    }

    try {
        const teacherResult = await db.query(`
            SELECT 
                u.id as user_id, u.username, u.email,
                p.display_name, p.bio, p.teacher_bio, p.location, p.timezone,
                p.is_mentor, p.is_counselor, p.is_essay_editor,
                p.hourly_rate_sparks, p.hourly_rate_usd,
                p.years_experience, p.education_level, p.languages,
                p.availability_status, p.total_sessions, p.average_rating,
                p.total_reviews, p.verified_mentor, p.user_tier, p.ascendia_score,
                p.can_host_group_sessions, p.max_students_per_session,
                p.teaching_experience, p.created_at as profile_created,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                COALESCE(array_agg(DISTINCT us.proficiency_level) FILTER (WHERE us.proficiency_level IS NOT NULL), '{}') as skill_levels
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN user_specializations us ON u.id = us.user_id
            LEFT JOIN specializations s ON us.specialization_id = s.id
            WHERE u.id = $1 AND p.is_searchable_teacher = TRUE
            GROUP BY u.id, u.username, u.email, p.display_name, p.bio, p.teacher_bio,
                     p.location, p.timezone, p.is_mentor, p.is_counselor, p.is_essay_editor,
                     p.hourly_rate_sparks, p.hourly_rate_usd, p.years_experience,
                     p.education_level, p.languages, p.availability_status, p.total_sessions,
                     p.average_rating, p.total_reviews, p.verified_mentor, p.user_tier, p.ascendia_score,
                     p.can_host_group_sessions, p.max_students_per_session, p.teaching_experience, p.created_at
        `, [teacherId]);

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({ error: 'Teacher not found or not searchable' });
        }

        const teacher = teacherResult.rows[0];

        // Get recent reviews
        const reviewsResult = await db.query(`
            SELECT 
                ur.rating, ur.review_text, ur.service_type, ur.created_at,
                u.username as reviewer_name,
                p.display_name as reviewer_display_name
            FROM user_reviews ur
            INNER JOIN users u ON ur.reviewer_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE ur.reviewed_user_id = $1
            ORDER BY ur.created_at DESC
            LIMIT 10
        `, [teacherId]);

        // Get portfolio items
        const portfolioResult = await db.query(`
            SELECT 
                title, description, item_type, url, tags, created_at
            FROM portfolio_items
            WHERE user_id = $1 AND is_public = TRUE
            ORDER BY created_at DESC
            LIMIT 5
        `, [teacherId]);

        // Get achievements
        const achievementsResult = await db.query(`
            SELECT 
                title, description, achievement_type, issuer, 
                issued_date, is_verified, created_at
            FROM user_achievements
            WHERE user_id = $1
            ORDER BY issued_date DESC, created_at DESC
            LIMIT 10
        `, [teacherId]);

        res.json({
            success: true,
            teacher: {
                ...teacher,
                recentReviews: reviewsResult.rows,
                portfolio: portfolioResult.rows,
                achievements: achievementsResult.rows
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get teacher profile error:', error);
        res.status(500).json({ 
            error: 'Failed to get teacher profile',
            details: error.message
        });
    }
};

/**
 * Get teacher availability and pricing tiers
 */
const getTeacherAvailability = async (req, res) => {
    const { teacherId } = req.params;

    try {
        const availabilityResult = await db.query(`
            SELECT 
                p.availability_status, p.hourly_rate_sparks, p.hourly_rate_usd,
                p.can_host_group_sessions, p.max_students_per_session,
                tb.tier_name, tb.max_direct_messages_per_day, tb.max_session_requests_per_day,
                tb.profile_boost_multiplier, tb.priority_support
            FROM user_profiles p
            INNER JOIN tier_benefits tb ON p.user_tier = tb.tier_name
            WHERE p.user_id = $1 AND p.is_searchable_teacher = TRUE
        `, [teacherId]);

        if (availabilityResult.rows.length === 0) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const availability = availabilityResult.rows[0];

        // Get upcoming session availability (mock data for now)
        const upcomingSessions = await db.query(`
            SELECT COUNT(*) as pending_sessions
            FROM session_requests
            WHERE mentor_id = $1 AND status IN ('pending', 'accepted')
        `, [teacherId]);

        res.json({
            success: true,
            availability: {
                ...availability,
                pendingSessions: upcomingSessions.rows[0].pending_sessions,
                estimatedResponseTime: availability.tier_name === 'navigator' ? '< 2 hours' : 
                                     availability.tier_name === 'explorer' ? '< 6 hours' : '< 24 hours'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get teacher availability error:', error);
        res.status(500).json({ 
            error: 'Failed to get teacher availability',
            details: error.message
        });
    }
};

/**
 * TALENT CRUCIBLE: Advanced mentor discovery with deep compatibility analysis
 */
const talentCrucibleMentorDiscovery = async (req, res) => {
    const { studentQuery, studentProfile } = req.body;

    if (!studentQuery) {
        return res.status(400).json({ error: 'Student query is required for Talent Crucible discovery' });
    }

    try {
        // Log Talent Crucible search for premium analytics
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'talent_crucible_discovery', $2, $3, NOW())
        `, [req.user.id, studentQuery, JSON.stringify(studentProfile || {})]);

        const discoveryResults = await geminiService.talentCrucibleMentorDiscovery(studentQuery, studentProfile);

        res.json({
            success: true,
            talentCrucible: true,
            results: discoveryResults,
            timestamp: new Date().toISOString(),
            aiPowered: true,
            premiumFeature: true
        });

    } catch (error) {
        console.error('Talent Crucible discovery error:', error);
        res.status(500).json({ 
            error: 'Talent Crucible discovery failed',
            details: error.message,
            fallback: 'Try standard mentor search'
        });
    }
};

/**
 * TALENT CRUCIBLE: Learning pathway optimization with mentor sequencing
 */
const optimizeLearningPathway = async (req, res) => {
    const { learningGoal, timeframeWeeks = 12 } = req.body;
    const studentId = req.user.id;

    if (!learningGoal) {
        return res.status(400).json({ error: 'Learning goal is required for pathway optimization' });
    }

    try {
        // Log pathway optimization request
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, course_context, created_at)
            VALUES ($1, 'learning_pathway_optimization', $2, $3, NOW())
        `, [studentId, learningGoal, JSON.stringify({ timeframeWeeks })]);

        const pathwayOptimization = await geminiService.optimizeLearningPathway(studentId, learningGoal, timeframeWeeks);

        res.json({
            success: true,
            talentCrucible: true,
            pathway: pathwayOptimization,
            timestamp: new Date().toISOString(),
            aiPowered: true,
            premiumFeature: true
        });

    } catch (error) {
        console.error('Learning pathway optimization error:', error);
        res.status(500).json({ 
            error: 'Pathway optimization failed',
            details: error.message,
            fallback: 'Consider manual mentor selection'
        });
    }
};

/**
 * TALENT CRUCIBLE: Predictive success matching based on patterns
 */
const predictiveSuccessMatching = async (req, res) => {
    const studentId = req.user.id;

    try {
        // Log predictive matching request
        await db.query(`
            INSERT INTO ai_search_logs (user_id, query_type, query_text, created_at)
            VALUES ($1, 'predictive_success_matching', 'Analyze success patterns for recommendations', NOW())
        `, [studentId]);

        const predictiveResults = await geminiService.predictiveSuccessMatching(studentId);

        res.json({
            success: true,
            talentCrucible: true,
            predictions: predictiveResults,
            timestamp: new Date().toISOString(),
            aiPowered: true,
            premiumFeature: true
        });

    } catch (error) {
        console.error('Predictive success matching error:', error);
        res.status(500).json({ 
            error: 'Predictive matching failed',
            details: error.message,
            fallback: 'Try personalized recommendations'
        });
    }
};

/**
 * Advanced mentor analytics and insights
 */
const getMentorMarketInsights = async (req, res) => {
    const { specialization, tier, timeRange = '30d' } = req.query;

    try {
        let whereClause = 'WHERE p.is_searchable_teacher = TRUE AND p.is_mentor = TRUE';
        let params = [];
        let paramCount = 0;

        if (specialization) {
            whereClause += ` AND s.name = $${++paramCount}`;
            params.push(specialization);
        }

        if (tier && ['pathfinder', 'explorer', 'navigator'].includes(tier)) {
            whereClause += ` AND p.user_tier = $${++paramCount}`;
            params.push(tier);
        }

        const timeInterval = timeRange === '7d' ? '7 days' : timeRange === '90d' ? '90 days' : '30 days';

        const insightsQuery = `
            SELECT 
                p.user_tier,
                COUNT(*) as mentor_count,
                AVG(p.ascendia_score) as avg_ascendia_score,
                AVG(p.pillar_academic) as avg_academic,
                AVG(p.pillar_community) as avg_community,
                AVG(p.pillar_mentorship) as avg_mentorship,
                AVG(p.pillar_analytical) as avg_analytical,
                AVG(p.hourly_rate_sparks) as avg_rate_sparks,
                AVG(p.average_rating) as avg_rating,
                AVG(p.total_sessions) as avg_sessions,
                COUNT(CASE WHEN ses.created_at >= NOW() - INTERVAL '${timeInterval}' THEN 1 END) as recent_sessions
            FROM user_profiles p
            INNER JOIN users u ON p.user_id = u.id
            LEFT JOIN user_specializations us ON u.id = us.user_id
            LEFT JOIN specializations s ON us.specialization_id = s.id
            LEFT JOIN sessions ses ON u.id = ses.mentor_id
            ${whereClause}
            GROUP BY p.user_tier
            ORDER BY 
                CASE p.user_tier 
                    WHEN 'navigator' THEN 3
                    WHEN 'explorer' THEN 2 
                    WHEN 'pathfinder' THEN 1
                    ELSE 0
                END DESC
        `;

        const insights = await db.query(insightsQuery, params);

        // Get top-performing mentors
        const topMentorsQuery = `
            SELECT 
                u.id, p.display_name, p.user_tier, p.ascendia_score,
                p.pillar_mentorship, p.average_rating, p.total_sessions,
                p.hourly_rate_sparks,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                COUNT(CASE WHEN ses.created_at >= NOW() - INTERVAL '${timeInterval}' THEN 1 END) as recent_activity
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN user_specializations us ON u.id = us.user_id
            LEFT JOIN specializations s ON us.specialization_id = s.id
            LEFT JOIN sessions ses ON u.id = ses.mentor_id
            ${whereClause}
            GROUP BY u.id, p.display_name, p.user_tier, p.ascendia_score,
                     p.pillar_mentorship, p.average_rating, p.total_sessions, p.hourly_rate_sparks
            ORDER BY (p.pillar_mentorship + p.ascendia_score * 0.1 + p.average_rating * 20) DESC
            LIMIT 10
        `;

        const topMentors = await db.query(topMentorsQuery, params);

        res.json({
            success: true,
            insights: {
                tierBreakdown: insights.rows,
                topPerformers: topMentors.rows,
                marketTrends: {
                    totalMentors: insights.rows.reduce((sum, tier) => sum + parseInt(tier.mentor_count), 0),
                    averageAscendiaScore: insights.rows.reduce((sum, tier) => sum + parseFloat(tier.avg_ascendia_score), 0) / insights.rows.length,
                    recentActivity: insights.rows.reduce((sum, tier) => sum + parseInt(tier.recent_sessions), 0)
                },
                filters: { specialization, tier, timeRange }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Mentor market insights error:', error);
        res.status(500).json({ 
            error: 'Failed to get market insights',
            details: error.message
        });
    }
};

/**
 * Get comprehensive AI search analytics including Talent Crucible usage
 */
const getAdvancedSearchAnalytics = async (req, res) => {
    const userId = req.user.id;
    const { timeRange = '30d' } = req.query;

    try {
        const interval = timeRange === '7d' ? '7 days' : timeRange === '90d' ? '90 days' : '30 days';

        // Get usage breakdown by search type
        const usageBreakdown = await db.query(`
            SELECT 
                query_type,
                COUNT(*) as usage_count,
                COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
                MAX(created_at) as last_used,
                CASE 
                    WHEN query_type LIKE '%talent_crucible%' THEN 'Premium'
                    WHEN query_type LIKE '%predictive%' THEN 'Premium'
                    WHEN query_type LIKE '%pathway%' THEN 'Premium'
                    ELSE 'Standard'
                END as feature_tier
            FROM ai_search_logs
            WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY query_type
            ORDER BY usage_count DESC
        `, [userId]);

        // Get search effectiveness metrics
        const effectivenessQuery = await db.query(`
            SELECT 
                DATE_TRUNC('week', created_at) as week,
                COUNT(*) as searches_performed,
                COUNT(DISTINCT query_type) as search_types_used
            FROM ai_search_logs
            WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week DESC
        `, [userId]);

        // Get recent premium feature usage
        const premiumUsage = await db.query(`
            SELECT query_type, query_text, created_at
            FROM ai_search_logs
            WHERE user_id = $1 
                AND query_type IN ('talent_crucible_discovery', 'learning_pathway_optimization', 'predictive_success_matching')
            ORDER BY created_at DESC
            LIMIT 10
        `, [userId]);

        res.json({
            success: true,
            analytics: {
                usageBreakdown: usageBreakdown.rows,
                weeklyTrends: effectivenessQuery.rows,
                premiumFeatureUsage: premiumUsage.rows,
                summary: {
                    totalSearches: usageBreakdown.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0),
                    premiumSearches: usageBreakdown.rows
                        .filter(row => row.feature_tier === 'Premium')
                        .reduce((sum, row) => sum + parseInt(row.usage_count), 0),
                    uniqueSearchTypes: usageBreakdown.rows.length,
                    activeDays: Math.max(...usageBreakdown.rows.map(row => parseInt(row.active_days)))
                }
            },
            timeRange,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Advanced search analytics error:', error);
        res.status(500).json({ 
            error: 'Failed to get advanced analytics',
            details: error.message
        });
    }
};

module.exports = {
    intelligentLessonSearch,
    optimizeCourseStructure,
    semanticLessonDiscovery,
    suggestChapters,
    getSearchAnalytics,
    getSmartRecommendations,
    createOptimizedCourse,
    // Teacher search endpoints
    intelligentTeacherSearch,
    getPersonalizedTeacherRecommendations,
    browseTeachersByTier,
    getTeacherProfile,
    getTeacherAvailability,
    // TALENT CRUCIBLE: Advanced AI features
    talentCrucibleMentorDiscovery,
    optimizeLearningPathway,
    predictiveSuccessMatching,
    getMentorMarketInsights,
    getAdvancedSearchAnalytics
};