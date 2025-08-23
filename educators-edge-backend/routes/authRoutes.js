/*
 * =================================================================
 * FILE: routes/authRoutes.js
 * =================================================================
 * DESCRIPTION: This file defines the specific API endpoints for authentication,
 * like `/register` and `/login`, and maps them to controller functions.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// --- Public Routes ---
// These routes do not require a user to be logged in.
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- Protected Route Example ---
// This is an example of a route that a user can only access if they
// provide a valid JWT. The `verifyToken` middleware runs first.
router.get('/profile', verifyToken, (req, res) => {
    // Because verifyToken was successful, we have access to req.userId
    // We could now fetch this user's profile from the database.
    res.json({
        message: `Welcome user ${req.userId}! This is protected content.`,
    });
});


module.exports = router;

