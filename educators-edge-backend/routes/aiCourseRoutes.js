
// FILE: routes/aiCourseRoutes.js
const express = require('express');
const router = express.Router();
const { SmartCourseGenerator } = require('../smartCourseGenerator');
const { UltimateCourseGenerator } = require('../ultimateCourseGenerator');
const { AISupervisor } = require('../services/aiSupervisor');

// Generate smart course from FreeCodeCamp content
router.post('/generate-smart-course', async (req, res) => {
    try {
        const { targetLanguage, maxCourses, difficulty, focusAreas } = req.body;
        
        const generator = new SmartCourseGenerator();
        const courses = await generator.generateCoursesFromFreeCodeCamp({
            targetLanguage,
            maxCourses: parseInt(maxCourses) || 3,
            difficulty,
            focusAreas: focusAreas ? focusAreas.split(',') : []
        });

        res.json({
            success: true,
            courses,
            message: `Generated ${courses.length} courses successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate premium course (Grokking-style)
router.post('/generate-premium-course', async (req, res) => {
    try {
        const { courseType, options } = req.body;
        
        const generator = new UltimateCourseGenerator();
        const course = await generator.createPremiumCourse(courseType, options);

        res.json({
            success: true,
            course,
            message: 'Premium course generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start AI supervision session
router.post('/start-supervision/:lessonId', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { studentProfile, isEnhancedCourse } = req.body;
        
        const db = require('../db');
        const client = await db.pool.connect();
        
        let lessonData;
        
        if (isEnhancedCourse) {
            // For enhanced courses, get course data instead of lesson
            const courseResult = await client.query('SELECT * FROM enhanced_courses WHERE id = $1', [lessonId]);
            if (courseResult.rows.length === 0) {
                client.release();
                return res.status(404).json({ error: 'Enhanced course not found' });
            }
            lessonData = {
                id: lessonId,
                title: courseResult.rows[0].title,
                description: courseResult.rows[0].description,
                difficulty_level: courseResult.rows[0].difficulty_level,
                language: courseResult.rows[0].language,
                type: 'enhanced_course',
                metadata: courseResult.rows[0].metadata
            };
        } else {
            // Regular lesson lookup
            const lessonResult = await client.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
            if (lessonResult.rows.length === 0) {
                client.release();
                return res.status(404).json({ error: 'Lesson not found' });
            }
            lessonData = lessonResult.rows[0];
        }
        
        client.release();

        const supervisor = new AISupervisor();
        const session = await supervisor.startSession(
            `session_${Date.now()}`,
            lessonData,
            studentProfile
        );

        res.json({
            success: true,
            session
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Analyze code changes during supervision
router.post('/analyze-code/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { codeChange } = req.body;
        
        const supervisor = new AISupervisor();
        const analysis = await supervisor.analyzeCodeChange(sessionId, codeChange);

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
        