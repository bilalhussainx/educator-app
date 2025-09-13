/**
 * =================================================================
 * LEETCODE ROUTES - REAL SOLUTIONS INTEGRATION
 * =================================================================
 * Routes for serving real LeetCode problems from GitHub repository
 */

const express = require('express');
const router = express.Router();
const leetcodeController = require('../controllers/leetcodeController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all available LeetCode problems
router.get('/problems', verifyToken, leetcodeController.getAllProblems);

// Get specific problem for IDE (similar to enhanced course lessons endpoint)
router.get('/problems/:problemNumber/ide', verifyToken, leetcodeController.getProblemForIDE);

// Get solution for specific problem
router.get('/problems/:problemNumber/solution', verifyToken, leetcodeController.getProblemSolution);

// Get repository statistics
router.get('/stats', verifyToken, leetcodeController.getStatistics);

// === IDE INTEGRATION ROUTES ===

// Get problem data for IDE - from course lesson
router.get('/enhanced-courses/:courseId/lessons/:lessonId/problem', async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const pool = require('../db');
        const LeetCodeRepoManager = require('../leetcode-repo-manager');
        
        // Get lesson details from database
        const lessonQuery = `
            SELECT l.*, ec.title as course_title 
            FROM lessons l
            JOIN enhanced_courses ec ON l.enhanced_course_id = ec.id
            WHERE l.id = $1 AND ec.id = $2
        `;
        
        const lessonResult = await pool.query(lessonQuery, [lessonId, courseId]);
        
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        
        const lesson = lessonResult.rows[0];
        
        // Extract problem number from lesson title (e.g., "Problem 0001: Two Sum")
        const problemMatch = lesson.title.match(/Problem (\d{4}):/);
        if (!problemMatch) {
            return res.status(400).json({ error: 'Invalid lesson format - no problem number found' });
        }
        
        const problemNumber = problemMatch[1];
        
        // Use existing controller to get problem data
        req.params.problemNumber = problemNumber;
        await leetcodeController.getProblemForIDE(req, res);
        
    } catch (error) {
        console.error('Error getting lesson problem:', error);
        res.status(500).json({ error: 'Failed to load problem' });
    }
});

// Run code against test cases
router.post('/run', async (req, res) => {
    try {
        const { code, language, problemId, testCases } = req.body;
        
        // For now, return mock results - in production you'd use a code execution service
        const mockResults = testCases.map((testCase, idx) => {
            // Simple mock logic - randomly pass/fail for demonstration
            const passed = Math.random() > 0.3; // 70% pass rate
            return {
                passed,
                input: testCase.input,
                expected: testCase.expected,
                actual: passed ? testCase.expected : '[wrong output]',
                error: !passed ? 'Logic error in implementation' : undefined
            };
        });
        
        res.json({
            success: true,
            testResults: mockResults,
            executionTime: Math.floor(Math.random() * 200) + 50, // Random execution time
            memoryUsage: `${(Math.random() * 10 + 10).toFixed(1)} MB`
        });
        
    } catch (error) {
        console.error('Error running code:', error);
        res.status(500).json({ error: 'Failed to run code' });
    }
});

// Submit code solution
router.post('/submit', async (req, res) => {
    try {
        const { code, language, problemId, courseId, lessonId } = req.body;
        const pool = require('../db');
        
        // Store submission in database
        if (courseId && lessonId) {
            const submissionId = require('crypto').randomUUID();
            
            // Create submissions table if it doesn't exist
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS lesson_submissions (
                        id UUID PRIMARY KEY,
                        lesson_id UUID REFERENCES lessons(id),
                        course_id UUID REFERENCES enhanced_courses(id),
                        language VARCHAR(50),
                        code TEXT,
                        submitted_at TIMESTAMP DEFAULT NOW(),
                        status VARCHAR(50) DEFAULT 'submitted'
                    )
                `);
                
                await pool.query(`
                    INSERT INTO lesson_submissions (id, lesson_id, course_id, language, code, submitted_at, status)
                    VALUES ($1, $2, $3, $4, $5, NOW(), 'submitted')
                `, [submissionId, lessonId, courseId, language, code]);
            } catch (dbError) {
                console.warn('Could not store submission:', dbError.message);
            }
        }
        
        // Mock submission result - in production, run against hidden test cases
        const success = Math.random() > 0.2; // 80% success rate for demo
        
        res.json({
            success,
            message: success ? 'Accepted! Great job!' : 'Wrong Answer - Try again!',
            submissionId: success ? require('crypto').randomUUID() : null
        });
        
    } catch (error) {
        console.error('Error submitting code:', error);
        res.status(500).json({ error: 'Failed to submit code' });
    }
});

module.exports = router;