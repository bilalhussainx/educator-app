/**
 * =================================================================
 * LEETCODE IDE API ROUTES
 * =================================================================
 * API routes for the LeetCode IDE integration with course system
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const LeetCodeRepoManager = require('../leetcode-repo-manager');

// Initialize repo manager
const repoManager = new LeetCodeRepoManager();

/**
 * Get problem data for IDE - from course lesson
 */
router.get('/enhanced-courses/:courseId/lessons/:lessonId/problem', async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        
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
        
        // Get problem data from repository
        const problemData = await getProblemData(problemNumber, lesson);
        
        // Add course context
        problemData.courseInfo = {
            courseId,
            lessonId,
            title: lesson.course_title,
            pattern: extractPatternFromContent(lesson.description)
        };
        
        res.json(problemData);
        
    } catch (error) {
        console.error('Error getting lesson problem:', error);
        res.status(500).json({ error: 'Failed to load problem' });
    }
});

/**
 * Get specific problem by number
 */
router.get('/problem/:problemNumber', async (req, res) => {
    try {
        const { problemNumber } = req.params;
        const problemData = await getProblemData(problemNumber);
        res.json(problemData);
    } catch (error) {
        console.error('Error getting problem:', error);
        res.status(500).json({ error: 'Failed to load problem' });
    }
});

/**
 * Run code against test cases
 */
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

/**
 * Submit code solution
 */
router.post('/submit', async (req, res) => {
    try {
        const { code, language, problemId, courseId, lessonId } = req.body;
        
        // Store submission in database
        if (courseId && lessonId) {
            const submissionId = require('crypto').randomUUID();
            
            await pool.query(`
                INSERT INTO lesson_submissions (id, lesson_id, course_id, language, code, submitted_at, status)
                VALUES ($1, $2, $3, $4, $5, NOW(), 'submitted')
            `, [submissionId, lessonId, courseId, language, code]);
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

/**
 * Get course progress and navigation
 */
router.get('/enhanced-courses/:courseId/progress', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const query = `
            SELECT 
                ec.id as course_id,
                ec.title as course_title,
                COUNT(l.id) as total_lessons,
                COUNT(CASE WHEN l.lesson_type = 'coding_problem' THEN 1 END) as total_problems
            FROM enhanced_courses ec
            LEFT JOIN lessons l ON ec.id = l.enhanced_course_id
            WHERE ec.id = $1
            GROUP BY ec.id, ec.title
        `;
        
        const result = await pool.query(query, [courseId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error getting course progress:', error);
        res.status(500).json({ error: 'Failed to load course progress' });
    }
});

/**
 * Get all lessons in a course for navigation
 */
router.get('/enhanced-courses/:courseId/lessons', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const query = `
            SELECT id, title, lesson_type, order_index, estimated_duration
            FROM lessons
            WHERE enhanced_course_id = $1
            ORDER BY order_index ASC
        `;
        
        const result = await pool.query(query, [courseId]);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error getting course lessons:', error);
        res.status(500).json({ error: 'Failed to load lessons' });
    }
});

/**
 * Helper function to get problem data from repository
 */
async function getProblemData(problemNumber, lesson = null) {
    try {
        // Ensure repository is ready
        await repoManager.setupRepository();
        
        // Get all problems to find the one we need
        const allProblems = await repoManager.getAvailableProblems();
        const problem = allProblems.find(p => p.number === problemNumber);
        
        if (!problem) {
            throw new Error(`Problem ${problemNumber} not found in repository`);
        }
        
        // Get code for all languages
        const languages = ['javascript', 'python', 'java'];
        const starterCode = {};
        const solutions = {};
        
        for (const language of languages) {
            try {
                const solutionData = await repoManager.getSolutionCode(problemNumber, language);
                solutions[language] = solutionData.code;
                starterCode[language] = repoManager.createStarterCode(solutionData.code, language);
            } catch (error) {
                console.warn(`Could not get ${language} code for problem ${problemNumber}`);
                starterCode[language] = `// ${language} solution not available`;
                solutions[language] = `// ${language} solution not available`;
            }
        }
        
        // Create problem data structure
        const problemData = {
            id: problemNumber,
            number: problemNumber,
            title: problem.title,
            description: lesson ? extractDescriptionFromContent(lesson.description) : 
                        `LeetCode Problem #${problemNumber}: ${problem.title}`,
            difficulty: estimateDifficulty(problemNumber),
            pattern: lesson ? extractPatternFromContent(lesson.description) : 'General',
            examples: generateExamplesFromCode(solutions.javascript),
            constraints: generateConstraints(problemNumber),
            hints: generateHints(problem.title),
            starterCode,
            solutions,
            testCases: generateTestCases(problemNumber)
        };
        
        return problemData;
        
    } catch (error) {
        console.error(`Error getting problem data for ${problemNumber}:`, error);
        throw error;
    }
}

/**
 * Helper functions for data extraction and generation
 */

function extractDescriptionFromContent(content) {
    // Extract problem description from lesson content
    const lines = content.split('\n');
    const descriptionStart = lines.findIndex(line => line.includes('Problem Description'));
    if (descriptionStart === -1) return 'Problem description not available.';
    
    const description = lines.slice(descriptionStart + 1, descriptionStart + 10)
        .filter(line => line.trim() && !line.startsWith('#'))
        .join('\n');
    
    return description || 'Problem description not available.';
}

function extractPatternFromContent(content) {
    const patterns = [
        'Sliding Window', 'Two Pointers', 'Fast & Slow Pointers', 'Merge Intervals',
        'Cyclic Sort', 'Tree BFS', 'Tree DFS', 'Two Heaps', 'Subsets',
        'Binary Search', 'Top K Elements', 'K-way Merge', 'Topological Sort',
        'Dynamic Programming'
    ];
    
    for (const pattern of patterns) {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
            return pattern;
        }
    }
    
    return 'General';
}

function estimateDifficulty(problemNumber) {
    const num = parseInt(problemNumber);
    if (num <= 200) return 'easy';
    if (num <= 600) return 'medium';
    return 'hard';
}

function generateExamplesFromCode(jsCode) {
    // Generate basic examples - in production, these would come from problem data
    return [
        {
            input: 'Example input',
            output: 'Expected output',
            explanation: 'Explanation of the solution approach'
        }
    ];
}

function generateConstraints(problemNumber) {
    // Generate reasonable constraints based on problem number
    return [
        '1 <= input.length <= 10⁴',
        'All values are within reasonable bounds',
        'Time limit: 2 seconds',
        'Memory limit: 256 MB'
    ];
}

function generateHints(problemTitle) {
    // Generate helpful hints based on problem title
    return [
        'Think about what data structure would be most helpful for this problem.',
        'Consider the time and space complexity of your approach.',
        'Are there any patterns or mathematical properties you can exploit?'
    ];
}

function generateTestCases(problemNumber) {
    // Generate test cases - in production, these would be comprehensive
    return [
        { input: 'test input 1', expected: 'expected output 1' },
        { input: 'test input 2', expected: 'expected output 2' },
        { input: 'edge case', expected: 'edge case output' }
    ];
}

module.exports = router;