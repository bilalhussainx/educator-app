#!/usr/bin/env node

// FILE: setupAICourseSystem.js
// Complete Setup Script for AI Course Generation System

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const db = require('./db');
const { Logger } = require('./services/aiCourseService');

const SETUP_STEPS = [
    'Database Schema',
    'Sample Data',
    'API Endpoints',
    'Frontend Integration',
    'AI Services',
    'Verification'
];

class AISystemSetup {
    constructor() {
        this.setupProgress = {};
        this.errors = [];
    }

    async runCompleteSetup() {
        console.log(`
🚀 AI Course Generation System Setup
====================================

This will set up:
✅ Enhanced database schema for AI courses
✅ Sample FreeCodeCamp data ingestion  
✅ Multi-source content aggregation
✅ AI-powered course generation
✅ Real-time AI supervision
✅ Advanced error handling & logging

Starting setup process...
        `);

        for (const step of SETUP_STEPS) {
            try {
                await this.executeStep(step);
                this.setupProgress[step] = 'completed';
                console.log(`✅ ${step} completed successfully`);
            } catch (error) {
                this.setupProgress[step] = 'failed';
                this.errors.push({ step, error: error.message });
                console.error(`❌ ${step} failed: ${error.message}`);
            }
        }

        await this.generateReport();
    }

    async executeStep(step) {
        switch (step) {
            case 'Database Schema':
                await this.setupDatabaseSchema();
                break;
            case 'Sample Data':
                await this.ingestSampleData();
                break;
            case 'API Endpoints':
                await this.setupAPIEndpoints();
                break;
            case 'Frontend Integration':
                await this.setupFrontendIntegration();
                break;
            case 'AI Services':
                await this.verifyAIServices();
                break;
            case 'Verification':
                await this.runVerificationTests();
                break;
        }
    }

    async setupDatabaseSchema() {
        const client = await db.pool.connect();
        
        try {
            await Logger.info('Setting up enhanced database schema');

            // Enhanced courses table
            await client.query(`
                CREATE TABLE IF NOT EXISTS enhanced_courses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    teacher_id UUID REFERENCES users(id),
                    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
                    estimated_duration VARCHAR(50),
                    target_audience TEXT,
                    learning_outcomes JSONB DEFAULT '[]',
                    prerequisites JSONB DEFAULT '[]',
                    metadata JSONB DEFAULT '{}',
                    language VARCHAR(50) DEFAULT 'javascript',
                    course_type VARCHAR(50) DEFAULT 'standard',
                    is_published BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // AI tutors table
            await client.query(`
                CREATE TABLE IF NOT EXISTS ai_tutors (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    personality VARCHAR(50) DEFAULT 'encouraging',
                    specialization JSONB DEFAULT '[]',
                    teaching_style TEXT,
                    response_patterns JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Content sources table
            await client.query(`
                CREATE TABLE IF NOT EXISTS content_sources (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    source_type VARCHAR(50) NOT NULL, -- 'freeCodeCamp', 'leetCode', 'ai_generated'
                    source_url TEXT,
                    content_data JSONB NOT NULL,
                    difficulty VARCHAR(20),
                    language VARCHAR(50),
                    topics TEXT[],
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_updated TIMESTAMP DEFAULT NOW()
                );
            `);

            // AI sessions table for real-time supervision
            await client.query(`
                CREATE TABLE IF NOT EXISTS ai_supervision_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    student_id UUID REFERENCES users(id),
                    lesson_id UUID REFERENCES lessons(id),
                    session_data JSONB DEFAULT '{}',
                    start_time TIMESTAMP DEFAULT NOW(),
                    end_time TIMESTAMP,
                    hints_used INTEGER DEFAULT 0,
                    progress_metrics JSONB DEFAULT '{}',
                    ai_interventions JSONB DEFAULT '[]'
                );
            `);

            // Course generation logs
            await client.query(`
                CREATE TABLE IF NOT EXISTS course_generation_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    generation_type VARCHAR(50), -- 'smart', 'ultimate', 'popular_clone'
                    input_parameters JSONB,
                    generated_course_id UUID REFERENCES enhanced_courses(id),
                    ai_tokens_used INTEGER,
                    generation_time_ms INTEGER,
                    success BOOLEAN DEFAULT false,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Create indexes for performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_enhanced_courses_language_published 
                ON enhanced_courses (language, is_published);
                
                CREATE INDEX IF NOT EXISTS idx_content_sources_type_difficulty 
                ON content_sources (source_type, difficulty);
                
                CREATE INDEX IF NOT EXISTS idx_ai_sessions_student_lesson 
                ON ai_supervision_sessions (student_id, lesson_id);
            `);

            await Logger.info('Database schema setup completed');

        } finally {
            client.release();
        }
    }

    async ingestSampleData() {
        const client = await db.pool.connect();
        
        try {
            await Logger.info('Ingesting sample data for testing');

            // Check if we have FreeCodeCamp lessons
            const { rows } = await client.query('SELECT COUNT(*) FROM ingested_lessons');
            const lessonCount = parseInt(rows[0].count);

            if (lessonCount === 0) {
                await Logger.warn('No FreeCodeCamp lessons found. Please run hydrateDb.js first.');
                
                // Insert some sample problems for testing
                await this.insertSampleProblems(client);
            } else {
                await Logger.info(`Found ${lessonCount} existing lessons in database`);
            }

            // Add sample content sources
            await client.query(`
                INSERT INTO content_sources (source_type, content_data, difficulty, language, topics)
                VALUES 
                ('leetCode', $1, 'medium', 'javascript', ARRAY['arrays', 'hash-table']),
                ('ai_generated', $2, 'easy', 'javascript', ARRAY['loops', 'conditionals'])
                ON CONFLICT DO NOTHING
            `, [
                JSON.stringify({
                    title: "Two Sum",
                    description: "Find two numbers that add up to target",
                    solution: "function twoSum(nums, target) { /* solution */ }"
                }),
                JSON.stringify({
                    title: "Count Even Numbers",
                    description: "Count how many even numbers are in an array",
                    solution: "function countEvens(arr) { return arr.filter(n => n % 2 === 0).length; }"
                })
            ]);

        } finally {
            client.release();
        }
    }

    async insertSampleProblems(client) {
        const sampleProblems = [
            {
                title: "Hello World",
                description: "Write a function that returns 'Hello, World!'",
                solution: "function helloWorld() { return 'Hello, World!'; }",
                language: "javascript",
                difficulty: "easy"
            },
            {
                title: "Add Two Numbers",
                description: "Write a function that adds two numbers",
                solution: "function add(a, b) { return a + b; }",
                language: "javascript", 
                difficulty: "easy"
            }
        ];

        for (const problem of sampleProblems) {
            await client.query(`
                INSERT INTO ingested_lessons (
                    title, description, solution_files, language, 
                    lesson_type, chapter, sub_chapter
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (title, language) DO NOTHING
            `, [
                problem.title,
                problem.description,
                JSON.stringify({ javascript: problem.solution }),
                problem.language,
                'algorithmic',
                'Sample Problems',
                'Basic JavaScript'
            ]);
        }

        await Logger.info('Sample problems inserted');
    }

    async setupAPIEndpoints() {
        const routerCode = `
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
            message: \`Generated \${courses.length} courses successfully\`
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
        const { studentProfile } = req.body;
        
        // Get lesson data
        const db = require('../db');
        const client = await db.pool.connect();
        const lessonResult = await client.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
        client.release();
        
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        const supervisor = new AISupervisor();
        const session = await supervisor.startSession(
            \`session_\${Date.now()}\`,
            lessonResult.rows[0],
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
        `;

        await fs.writeFile(
            path.join(__dirname, 'routes', 'aiCourseRoutes.js'),
            routerCode
        );

        await Logger.info('API endpoints created');
    }

    async setupFrontendIntegration() {
        // Create integration documentation
        const integrationGuide = `
# Frontend Integration Guide

## AI Course Generation

### Smart Course Generation
\`\`\`javascript
// Generate courses from FreeCodeCamp content
const generateSmartCourse = async (options) => {
    const response = await fetch('/api/generate-smart-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });
    return response.json();
};
\`\`\`

### Premium Course Generation  
\`\`\`javascript
// Generate Grokking-style courses
const generatePremiumCourse = async (courseType, options) => {
    const response = await fetch('/api/generate-premium-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType, options })
    });
    return response.json();
};
\`\`\`

## AI Supervision Integration

### Start Supervision Session
\`\`\`javascript
const startAISupervision = async (lessonId, studentProfile) => {
    const response = await fetch(\`/api/start-supervision/\${lessonId}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfile })
    });
    return response.json();
};
\`\`\`

### Real-time Code Analysis
\`\`\`javascript
const analyzeCode = async (sessionId, codeChange) => {
    const response = await fetch(\`/api/analyze-code/\${sessionId}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeChange })
    });
    return response.json();
};
\`\`\`

## Integration with AscentIDE.tsx

Add this to your AscentIDE component:

\`\`\`typescript
// AI Supervision Hook
const useAISupervision = (lessonId: string) => {
    const [session, setSession] = useState(null);
    const [analysis, setAnalysis] = useState(null);

    const startSupervision = async (studentProfile) => {
        const result = await startAISupervision(lessonId, studentProfile);
        setSession(result.session);
    };

    const analyzeCodeChange = async (codeChange) => {
        if (!session) return;
        const result = await analyzeCode(session.sessionId, codeChange);
        setAnalysis(result.analysis);
    };

    return { session, analysis, startSupervision, analyzeCodeChange };
};
\`\`\`
        `;

        await fs.mkdir(path.join(__dirname, 'docs'), { recursive: true });
        await fs.writeFile(
            path.join(__dirname, 'docs', 'frontend-integration.md'),
            integrationGuide
        );

        await Logger.info('Frontend integration guide created');
    }

    async verifyAIServices() {
        // Test AI service connectivity
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not found in environment variables');
        }

        const { AIService } = require('./services/aiCourseService');
        const aiService = new AIService();

        // Test AI service with a simple prompt
        try {
            await aiService.generateWithRetries(
                'Generate a simple JSON object with {"test": "success"}',
                'Service Verification Test',
                { maxRetries: 1, timeout: 10000 }
            );
            await Logger.info('AI services verified successfully');
        } catch (error) {
            throw new Error(`AI service verification failed: ${error.message}`);
        }
    }

    async runVerificationTests() {
        const client = await db.pool.connect();
        
        try {
            // Verify database tables exist
            const tables = [
                'enhanced_courses', 'ai_tutors', 'content_sources',
                'ai_supervision_sessions', 'course_generation_logs'
            ];

            for (const table of tables) {
                const result = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);

                if (!result.rows[0].exists) {
                    throw new Error(`Table ${table} was not created`);
                }
            }

            // Verify sample data
            const { rows } = await client.query('SELECT COUNT(*) FROM content_sources');
            if (parseInt(rows[0].count) === 0) {
                throw new Error('No sample data found in content_sources');
            }

            await Logger.info('All verification tests passed');

        } finally {
            client.release();
        }
    }

    async generateReport() {
        const successCount = Object.values(this.setupProgress).filter(status => status === 'completed').length;
        const failureCount = this.errors.length;

        const report = `
🎯 AI Course Generation System Setup Report
==========================================

✅ Completed Steps: ${successCount}/${SETUP_STEPS.length}
❌ Failed Steps: ${failureCount}

${failureCount === 0 ? '🎉 SETUP COMPLETED SUCCESSFULLY!' : '⚠️ SETUP COMPLETED WITH ERRORS'}

## Setup Status:
${SETUP_STEPS.map(step => 
    `${this.setupProgress[step] === 'completed' ? '✅' : '❌'} ${step}`
).join('\n')}

${failureCount > 0 ? `
## Errors Encountered:
${this.errors.map(err => `❌ ${err.step}: ${err.error}`).join('\n')}
` : ''}

## What's Available Now:

🤖 **AI Course Generation:**
   - Smart courses from FreeCodeCamp content
   - Premium courses (Grokking-style patterns)  
   - Multi-source content aggregation
   - Advanced error handling & rate limiting

🎓 **AI Supervision:**
   - Real-time code analysis
   - Personalized hints and guidance
   - Performance tracking
   - Adaptive difficulty

🚀 **Usage Examples:**

1. Generate Smart Course:
   \`node smartCourseGenerator.js javascript 3 intermediate "algorithms,data-structures"\`

2. Generate Premium Course:
   \`node ultimateCourseGenerator.js grokking-coding-interview single 50\`

3. Generate All Popular Courses:
   \`node ultimateCourseGenerator.js all\`

## API Endpoints:
- POST /api/generate-smart-course
- POST /api/generate-premium-course  
- POST /api/start-supervision/:lessonId
- POST /api/analyze-code/:sessionId

## Next Steps:
1. Review generated courses in your dashboard
2. Integrate AI supervision with AscentIDE
3. Customize AI personalities and teaching styles
4. Set up monitoring and analytics

📖 Documentation: ./docs/frontend-integration.md
🗂️ Logs: ./logs/ai-course-generation.log

Happy coding! 🎉
        `;

        console.log(report);
        
        await fs.writeFile(
            path.join(__dirname, 'SETUP_REPORT.md'),
            report
        );

        await Logger.info('Setup completed', { 
            successfulSteps: successCount,
            failedSteps: failureCount,
            totalSteps: SETUP_STEPS.length
        });
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new AISystemSetup();
    setup.runCompleteSetup().catch(console.error);
}

module.exports = { AISystemSetup };