// educators-edge-backend/routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { addTierInfo } = require('../middleware/tierMiddleware');
const profileController = require('../controllers/profileController');

// All routes require authentication
router.use(verifyToken);

// Add tier information to all requests
router.use(addTierInfo);

// --- SEARCH AND DISCOVERY ROUTES (MUST COME BEFORE /:userId ROUTE) ---

// Search profiles (mentors, counselors, essay editors)
router.get('/search/profiles', profileController.searchProfiles);

// Get teachers for AI search integration
router.get('/data/teachers', profileController.getTeachersForAISearch);

// Get all specializations (optionally filtered by category)
router.get('/data/specializations', profileController.getSpecializations);

// --- PROFILE MANAGEMENT ROUTES ---

// Update own profile
router.put('/update', profileController.updateProfile);

// Get current user's own profile
router.get('/', profileController.getProfile);

// --- SPECIALIZATIONS MANAGEMENT ---

// Update user's specializations
router.put('/specializations/update', profileController.updateSpecializations);

// --- REVIEWS AND RATINGS ---

// Add review for a user
router.post('/reviews/add', profileController.addReview);

// --- PORTFOLIO MANAGEMENT ---

// Get user's portfolio items
router.get('/:userId/portfolio', async (req, res) => {
    const { userId } = req.params;
    const isOwner = req.user.id === userId;

    try {
        const db = require('../db');
        
        const portfolioQuery = await db.query(`
            SELECT * FROM portfolio_items
            WHERE user_id = $1 ${isOwner ? '' : 'AND is_public = true'}
            ORDER BY created_at DESC
        `, [userId]);

        res.json({ portfolio: portfolioQuery.rows });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Add portfolio item
router.post('/portfolio/add', async (req, res) => {
    const userId = req.user.id;
    const { title, description, item_type, url, file_path, tags, is_public } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const db = require('../db');
        
        const result = await db.query(`
            INSERT INTO portfolio_items (user_id, title, description, item_type, url, file_path, tags, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [userId, title, description, item_type, url, file_path, tags || [], is_public !== false]);

        res.status(201).json({ success: true, item: result.rows[0] });

    } catch (error) {
        console.error('Error adding portfolio item:', error);
        res.status(500).json({ error: 'Failed to add portfolio item' });
    }
});

// Update portfolio item
router.put('/portfolio/:itemId', async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { title, description, item_type, url, file_path, tags, is_public } = req.body;

    try {
        const db = require('../db');
        
        const result = await db.query(`
            UPDATE portfolio_items 
            SET title = $1, description = $2, item_type = $3, url = $4, 
                file_path = $5, tags = $6, is_public = $7
            WHERE id = $8 AND user_id = $9
            RETURNING *
        `, [title, description, item_type, url, file_path, tags, is_public, itemId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portfolio item not found or unauthorized' });
        }

        res.json({ success: true, item: result.rows[0] });

    } catch (error) {
        console.error('Error updating portfolio item:', error);
        res.status(500).json({ error: 'Failed to update portfolio item' });
    }
});

// Delete portfolio item
router.delete('/portfolio/:itemId', async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;

    try {
        const db = require('../db');
        
        const result = await db.query(`
            DELETE FROM portfolio_items 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `, [itemId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portfolio item not found or unauthorized' });
        }

        res.json({ success: true, message: 'Portfolio item deleted' });

    } catch (error) {
        console.error('Error deleting portfolio item:', error);
        res.status(500).json({ error: 'Failed to delete portfolio item' });
    }
});

// --- ACHIEVEMENTS MANAGEMENT ---

// Add achievement
router.post('/achievements/add', async (req, res) => {
    const userId = req.user.id;
    const { title, description, achievement_type, issuer, issued_date, expiry_date, verification_url } = req.body;

    if (!title || !achievement_type) {
        return res.status(400).json({ error: 'Title and achievement type are required' });
    }

    try {
        const db = require('../db');
        
        const result = await db.query(`
            INSERT INTO user_achievements (user_id, title, description, achievement_type, issuer, issued_date, expiry_date, verification_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [userId, title, description, achievement_type, issuer, issued_date, expiry_date, verification_url]);

        res.status(201).json({ success: true, achievement: result.rows[0] });

    } catch (error) {
        console.error('Error adding achievement:', error);
        res.status(500).json({ error: 'Failed to add achievement' });
    }
});

// Update availability status
router.patch('/availability', async (req, res) => {
    const userId = req.user.id;
    const { availability_status } = req.body;

    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(availability_status)) {
        return res.status(400).json({ error: 'Invalid availability status' });
    }

    try {
        const db = require('../db');
        
        await db.query(`
            INSERT INTO user_profiles (user_id, availability_status, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                availability_status = EXCLUDED.availability_status,
                updated_at = NOW()
        `, [userId, availability_status]);

        res.json({ success: true, availability_status });

    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// Get user statistics for dashboard
router.get('/stats/dashboard', async (req, res) => {
    const userId = req.user.id;

    try {
        const db = require('../db');
        
        // Get various statistics
        const stats = await db.query(`
            SELECT 
                up.total_sessions,
                up.average_rating,
                up.total_reviews,
                (SELECT COUNT(*) FROM session_requests WHERE mentor_id = $1) as sessions_as_mentor,
                (SELECT COUNT(*) FROM session_requests WHERE requester_id = $1) as sessions_as_student,
                (SELECT COUNT(*) FROM essay_editing_requests WHERE editor_id = $1) as essays_edited,
                (SELECT COUNT(*) FROM essay_editing_requests WHERE student_id = $1) as essays_submitted,
                (SELECT COUNT(*) FROM direct_messages WHERE sender_id = $1 OR recipient_id = $1) as total_messages,
                COALESCE(uw.z_credit_balance, 0) as spark_balance
            FROM user_profiles up
            LEFT JOIN user_wallets uw ON up.user_id = uw.user_id
            WHERE up.user_id = $1
        `, [userId]);

        const profileStats = stats.rows[0] || {
            total_sessions: 0,
            average_rating: 0,
            total_reviews: 0,
            sessions_as_mentor: 0,
            sessions_as_student: 0,
            essays_edited: 0,
            essays_submitted: 0,
            total_messages: 0,
            spark_balance: 0
        };

        res.json({ stats: profileStats });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get user profile (own profile or public profile) - MUST BE LAST ROUTE
router.get('/:userId', profileController.getProfile);

module.exports = router;