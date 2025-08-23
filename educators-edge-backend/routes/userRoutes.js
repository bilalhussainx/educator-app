/*
 * =================================================================
 * FOLDER: src/routes/
 * FILE:   userRoutes.js (NEW FILE for APE)
 * =================================================================
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware'); // Adjust the path to your auth middleware if it's different

// --- APE User Goal Routes ---

// @route   GET /api/users/goal
// @desc    Get the current user's goal
// @access  Private
router.get('/goal', verifyToken, userController.getUserGoal);

// @route   POST /api/users/goal
// @desc    Create or update the user's goal
// @access  Private
router.post('/goal', verifyToken, userController.saveOrUpdateUserGoal);

// @route   GET /api/users/next-action
// @desc    Get the next pending adaptive action for the user
// @access  Private
router.get('/next-action', verifyToken, userController.getNextAction);

// @route   POST /api/actions/:actionId/complete
// @desc    Mark an adaptive action as completed
// @access  Private
// NOTE: We put this in userRoutes for convenience, but it could be its own routes file.
router.post('/actions/:actionId/complete', verifyToken, userController.completeAction);
router.post('/actions/solve-problem/:actionId', verifyToken, userController.solveGeneratedProblem);

module.exports = router;