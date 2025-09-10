// educators-edge-backend/controllers/profileController.js
const db = require('../db');

/**
 * Get or create user profile
 */
const getProfile = async (req, res) => {
    const userId = req.params.userId || req.user.id;

    try {
        // Get user profile with user information
        const profileQuery = await db.query(`
            SELECT 
                u.id, u.username, u.email, u.role,
                up.display_name, up.bio, up.location, up.timezone, up.profile_image_url,
                up.is_mentor, up.is_counselor, up.is_essay_editor,
                up.hourly_rate_z_credits, up.hourly_rate_usd, up.years_experience,
                up.education_level, up.languages, up.availability_status,
                up.total_sessions, up.average_rating, up.total_reviews, up.verified_mentor,
                COALESCE(uw.z_credit_balance, 0) as spark_balance
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_wallets uw ON u.id = uw.user_id
            WHERE u.id = $1
        `, [userId]);

        if (profileQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profile = profileQuery.rows[0];

        // Get user specializations (handle case where table might not exist)
        let specializationsQuery = { rows: [] };
        try {
            specializationsQuery = await db.query(`
                SELECT s.id, s.name, s.category, s.description,
                       us.proficiency_level, us.years_experience
                FROM user_specializations us
                JOIN specializations s ON us.specialization_id = s.id
                WHERE us.user_id = $1
                ORDER BY s.category, s.name
            `, [userId]);
        } catch (specializationsError) {
            console.log('Specializations table not found, using empty array:', specializationsError.message);
        }

        // Get recent reviews
        const reviewsQuery = await db.query(`
            SELECT ur.rating, ur.review_text, ur.service_type, ur.created_at,
                   reviewer.username as reviewer_username
            FROM user_reviews ur
            JOIN users reviewer ON ur.reviewer_id = reviewer.id
            WHERE ur.reviewed_user_id = $1
            ORDER BY ur.created_at DESC
            LIMIT 10
        `, [userId]);

        // Get achievements
        const achievementsQuery = await db.query(`
            SELECT * FROM user_achievements
            WHERE user_id = $1
            ORDER BY issued_date DESC
        `, [userId]);

        // Get portfolio items (only public ones if not the owner)
        const isOwner = req.user.id === userId;
        const portfolioQuery = await db.query(`
            SELECT * FROM portfolio_items
            WHERE user_id = $1 ${isOwner ? '' : 'AND is_public = true'}
            ORDER BY created_at DESC
        `, [userId]);

        // Get tier information from user_profiles (enhanced with tier system)
        const tierQuery = await db.query(`
            SELECT ascendia_score, user_tier, tier_updated_at, is_searchable_teacher,
                   can_host_group_sessions, max_students_per_session, teacher_bio
            FROM user_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        const tierInfo = tierQuery.rows[0] || { ascendia_score: 0, user_tier: 'bronze' };

        res.json({
            ...profile,
            specializations: specializationsQuery.rows,
            reviews: reviewsQuery.rows,
            achievements: achievementsQuery.rows,
            portfolio: portfolioQuery.rows,
            ...tierInfo,
            tier: tierInfo.user_tier,
            tierName: tierInfo.user_tier?.charAt(0).toUpperCase() + tierInfo.user_tier?.slice(1) || 'Bronze'
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const {
        display_name, bio, location, timezone, profile_image_url,
        is_mentor, is_counselor, is_essay_editor,
        hourly_rate_z_credits, hourly_rate_usd, years_experience,
        education_level, languages, availability_status, is_searchable_teacher
    } = req.body;

    try {
        const result = await db.query(`
            INSERT INTO user_profiles (
                user_id, display_name, bio, location, timezone, profile_image_url,
                is_mentor, is_counselor, is_essay_editor,
                hourly_rate_z_credits, hourly_rate_usd, years_experience,
                education_level, languages, availability_status, is_searchable_teacher, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                bio = EXCLUDED.bio,
                location = EXCLUDED.location,
                timezone = EXCLUDED.timezone,
                profile_image_url = EXCLUDED.profile_image_url,
                is_mentor = EXCLUDED.is_mentor,
                is_counselor = EXCLUDED.is_counselor,
                is_essay_editor = EXCLUDED.is_essay_editor,
                hourly_rate_z_credits = EXCLUDED.hourly_rate_z_credits,
                hourly_rate_usd = EXCLUDED.hourly_rate_usd,
                years_experience = EXCLUDED.years_experience,
                education_level = EXCLUDED.education_level,
                languages = EXCLUDED.languages,
                availability_status = EXCLUDED.availability_status,
                is_searchable_teacher = EXCLUDED.is_searchable_teacher,
                updated_at = NOW()
            RETURNING *
        `, [
            userId, display_name, bio, location, timezone, profile_image_url,
            is_mentor, is_counselor, is_essay_editor,
            hourly_rate_z_credits, hourly_rate_usd, years_experience,
            education_level, languages, availability_status, is_searchable_teacher
        ]);

        res.json({ success: true, profile: result.rows[0] });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

/**
 * Search profiles (mentors, counselors, essay editors)
 */
const searchProfiles = async (req, res) => {
    const {
        service_type, // 'mentor', 'counselor', 'essay_editor', 'all'
        specialization,
        location,
        max_rate_z,
        max_rate_usd,
        min_rating,
        availability,
        education_level,
        languages,
        page = 1,
        limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT 
                u.id, u.username,
                up.display_name, up.bio, up.location, up.profile_image_url,
                up.is_mentor, up.is_counselor, up.is_essay_editor,
                up.hourly_rate_z_credits, up.hourly_rate_usd, up.years_experience,
                up.education_level, up.languages, up.availability_status,
                up.total_sessions, up.average_rating, up.total_reviews, up.verified_mentor,
                up.z_index, up.user_tier, up.is_searchable_teacher, 
                up.can_host_group_sessions, up.max_students_per_session, up.teacher_bio,
                COALESCE(uw.z_credit_balance, 0) as spark_balance,
                ab.id as ai_bot_id, ab.personality_type, ab.specialization_focus as ai_specialization,
                CASE WHEN ab.id IS NOT NULL THEN true ELSE false END as is_ai_bot
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_wallets uw ON u.id = uw.user_id
            LEFT JOIN ai_bots ab ON u.id = ab.user_id AND ab.is_active = TRUE
            WHERE (up.is_searchable_teacher = TRUE OR (up.is_mentor = TRUE OR up.is_counselor = TRUE OR up.is_essay_editor = TRUE) OR ab.id IS NOT NULL)
        `;
        
        const queryParams = [];
        let paramCount = 0;

        // Service type filter
        if (service_type && service_type !== 'all') {
            paramCount++;
            if (service_type === 'mentor') {
                query += ` AND up.is_mentor = true`;
            } else if (service_type === 'counselor') {
                query += ` AND up.is_counselor = true`;
            } else if (service_type === 'essay_editor') {
                query += ` AND up.is_essay_editor = true`;
            }
        } else {
            query += ` AND (up.is_mentor = true OR up.is_counselor = true OR up.is_essay_editor = true)`;
        }

        // Specialization filter
        if (specialization) {
            paramCount++;
            query += ` AND s.name ILIKE $${paramCount}`;
            queryParams.push(`%${specialization}%`);
        }

        // Location filter
        if (location) {
            paramCount++;
            query += ` AND up.location ILIKE $${paramCount}`;
            queryParams.push(`%${location}%`);
        }

        // Rate filters
        if (max_rate_z) {
            paramCount++;
            query += ` AND (up.hourly_rate_z_credits <= $${paramCount} OR up.hourly_rate_z_credits = 0)`;
            queryParams.push(parseFloat(max_rate_z));
        }

        if (max_rate_usd) {
            paramCount++;
            query += ` AND (up.hourly_rate_usd <= $${paramCount} OR up.hourly_rate_usd = 0)`;
            queryParams.push(parseFloat(max_rate_usd));
        }

        // Rating filter
        if (min_rating) {
            paramCount++;
            query += ` AND up.average_rating >= $${paramCount}`;
            queryParams.push(parseFloat(min_rating));
        }

        // Availability filter
        if (availability) {
            paramCount++;
            query += ` AND up.availability_status = $${paramCount}`;
            queryParams.push(availability);
        }

        // Education level filter
        if (education_level) {
            paramCount++;
            query += ` AND up.education_level = $${paramCount}`;
            queryParams.push(education_level);
        }

        // Languages filter
        if (languages) {
            paramCount++;
            query += ` AND up.languages && $${paramCount}`;
            queryParams.push([languages]);
        }

        // Order and pagination (prioritize AI bots, then tier and rating)
        query += ` 
            ORDER BY 
                CASE WHEN ab.id IS NOT NULL THEN 1 ELSE 2 END,
                up.z_index DESC, 
                up.verified_mentor DESC, 
                up.average_rating DESC, 
                up.total_reviews DESC, 
                u.username
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        queryParams.push(parseInt(limit), offset);

        const result = await db.query(query, queryParams);

        // Get specializations for each user (handle missing table)
        const userIds = result.rows.map(user => user.id);
        let specializationsByUser = {};
        
        if (userIds.length > 0) {
            try {
                const specializationsQuery = await db.query(`
                    SELECT us.user_id, s.name, s.category, us.proficiency_level
                    FROM user_specializations us
                    JOIN specializations s ON us.specialization_id = s.id
                    WHERE us.user_id = ANY($1)
                `, [userIds]);

                specializationsByUser = specializationsQuery.rows.reduce((acc, spec) => {
                    if (!acc[spec.user_id]) acc[spec.user_id] = [];
                    acc[spec.user_id].push(spec);
                    return acc;
                }, {});
            } catch (specializationsError) {
                console.log('Specializations table not found, using empty specializations:', specializationsError.message);
            }
        }

        result.rows.forEach(user => {
            user.specializations = specializationsByUser[user.id] || [];
        });

        res.json({
            profiles: result.rows,
            page: parseInt(page),
            hasMore: result.rows.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error searching profiles:', error);
        res.status(500).json({ error: 'Failed to search profiles' });
    }
};

/**
 * Get all specializations
 */
const getSpecializations = async (req, res) => {
    const { category } = req.query;

    try {
        let query = 'SELECT * FROM specializations';
        const queryParams = [];

        if (category) {
            query += ' WHERE category = $1';
            queryParams.push(category);
        }

        query += ' ORDER BY category, name';

        const result = await db.query(query, queryParams);

        res.json({
            specializations: result.rows,
            categories: [...new Set(result.rows.map(s => s.category))]
        });

    } catch (error) {
        console.error('Error fetching specializations:', error);
        res.status(500).json({ error: 'Failed to fetch specializations' });
    }
};

/**
 * Add/update user specializations
 */
const updateSpecializations = async (req, res) => {
    const userId = req.user.id;
    const { specializations } = req.body; // Array of { specialization_id, proficiency_level, years_experience }

    if (!Array.isArray(specializations)) {
        return res.status(400).json({ error: 'Specializations must be an array' });
    }

    try {
        // Delete existing specializations
        await db.query('DELETE FROM user_specializations WHERE user_id = $1', [userId]);

        // Insert new specializations
        if (specializations.length > 0) {
            const insertQuery = `
                INSERT INTO user_specializations (user_id, specialization_id, proficiency_level, years_experience)
                VALUES ${specializations.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(', ')}
            `;
            
            const params = [userId];
            specializations.forEach(spec => {
                params.push(spec.specialization_id, spec.proficiency_level, spec.years_experience || 0);
            });

            await db.query(insertQuery, params);
        }

        res.json({ success: true, message: 'Specializations updated successfully' });

    } catch (error) {
        console.error('Error updating specializations:', error);
        res.status(500).json({ error: 'Failed to update specializations' });
    }
};

/**
 * Add user review
 */
const addReview = async (req, res) => {
    const reviewerId = req.user.id;
    const { reviewed_user_id, session_id, rating, review_text, service_type } = req.body;

    if (!reviewed_user_id || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Valid reviewed_user_id and rating (1-5) are required' });
    }

    if (reviewerId === reviewed_user_id) {
        return res.status(400).json({ error: 'Cannot review yourself' });
    }

    try {
        // Insert review
        const result = await db.query(`
            INSERT INTO user_reviews (reviewer_id, reviewed_user_id, session_id, rating, review_text, service_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [reviewerId, reviewed_user_id, session_id, rating, review_text, service_type]);

        // Update user's average rating
        await db.query(`
            UPDATE user_profiles 
            SET 
                average_rating = (
                    SELECT ROUND(AVG(rating)::numeric, 2)
                    FROM user_reviews 
                    WHERE reviewed_user_id = $1
                ),
                total_reviews = (
                    SELECT COUNT(*) 
                    FROM user_reviews 
                    WHERE reviewed_user_id = $1
                ),
                updated_at = NOW()
            WHERE user_id = $1
        `, [reviewed_user_id]);

        res.status(201).json({ success: true, review: result.rows[0] });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'You have already reviewed this user for this session' });
        }
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
};

/**
 * Get teachers for AI search integration
 * This provides structured data for the AI teacher search system
 */
const getTeachersForAISearch = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id as user_id, u.username, u.email,
                up.display_name, up.bio, up.teacher_bio, up.location, up.timezone,
                up.is_mentor, up.is_counselor, up.is_essay_editor,
                up.hourly_rate_z_credits, up.hourly_rate_usd,
                up.years_experience, up.education_level, up.languages,
                up.availability_status, up.total_sessions, up.average_rating,
                up.total_reviews, up.verified_mentor, up.teaching_experience,
                up.z_index, up.user_tier, up.is_searchable_teacher,
                up.can_host_group_sessions, up.max_students_per_session,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                COALESCE(array_agg(DISTINCT us.proficiency_level) FILTER (WHERE us.proficiency_level IS NOT NULL), '{}') as skill_levels,
                COALESCE(array_agg(DISTINCT c.title) FILTER (WHERE c.title IS NOT NULL), '{}') as created_courses,
                COALESCE(AVG(ur.rating), 0) as detailed_rating
            FROM users u
            INNER JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_specializations us ON u.id = us.user_id
            LEFT JOIN specializations s ON us.specialization_id = s.id
            LEFT JOIN courses c ON u.id = c.teacher_id AND c.status = 'published'
            LEFT JOIN user_reviews ur ON u.id = ur.reviewed_user_id
            WHERE (up.is_searchable_teacher = TRUE OR up.user_tier IN ('silver', 'gold'))
                AND up.availability_status IN ('available', 'busy')
                AND (up.is_mentor = TRUE OR up.is_counselor = TRUE OR up.is_essay_editor = TRUE)
            GROUP BY u.id, u.username, u.email, up.display_name, up.bio, up.teacher_bio, 
                     up.location, up.timezone, up.is_mentor, up.is_counselor, up.is_essay_editor,
                     up.hourly_rate_z_credits, up.hourly_rate_usd, up.years_experience, 
                     up.education_level, up.languages, up.availability_status, up.total_sessions,
                     up.average_rating, up.total_reviews, up.verified_mentor, up.teaching_experience,
                     up.z_index, up.user_tier, up.is_searchable_teacher, up.can_host_group_sessions,
                     up.max_students_per_session
            ORDER BY up.ascendia_score DESC, up.average_rating DESC
            LIMIT 50
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            teachers: result.rows,
            count: result.rows.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching teachers for AI search:', error);
        res.status(500).json({ 
            error: 'Failed to fetch teachers for AI search',
            details: error.message
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    searchProfiles,
    getSpecializations,
    updateSpecializations,
    addReview,
    getTeachersForAISearch
};