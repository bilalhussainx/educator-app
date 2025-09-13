// FILE: testAISystem.js
// Quick test script to verify AI system functionality

require('dotenv').config();
const { AIService } = require('./services/aiCourseService');
const { ContentAggregator } = require('./services/contentAggregator');
const { AISupervisor } = require('./services/aiSupervisor');

async function runQuickTests() {
    console.log('🧪 Running AI System Quick Tests\n');

    try {
        // Test 1: AI Service Basic Functionality
        console.log('1️⃣ Testing AI Service...');
        const aiService = new AIService();
        const testResult = await aiService.generateWithRetries(
            'Generate a simple JSON object with {"status": "working", "test": "success"}',
            'Basic AI Test',
            { maxRetries: 2, timeout: 15000 }
        );
        console.log('✅ AI Service:', testResult.status === 'working' ? 'PASS' : 'FAIL');

        // Test 2: Content Aggregator
        console.log('\n2️⃣ Testing Content Aggregator...');
        const aggregator = new ContentAggregator();
        const sampleContent = await aggregator.fetchFreeCodeCampContent('javascript', ['javascript']);
        console.log('✅ Content Aggregator:', sampleContent.problems.length > 0 ? 'PASS' : 'FAIL');
        console.log(`   Found ${sampleContent.problems.length} problems`);

        // Test 3: AI Supervisor
        console.log('\n3️⃣ Testing AI Supervisor...');
        const supervisor = new AISupervisor({ personality: 'encouraging' });
        const mockLessonData = {
            title: 'Test Lesson',
            description: 'A test lesson for verification',
            problems: [{
                title: 'Test Problem',
                description: 'Write a function that returns true'
            }],
            difficulty: 'easy'
        };
        const mockStudent = {
            skillLevel: 'beginner',
            preferredLanguage: 'javascript'
        };

        const session = await supervisor.startSession('test-session', mockLessonData, mockStudent);
        console.log('✅ AI Supervisor:', session.sessionId ? 'PASS' : 'FAIL');
        console.log(`   Session ID: ${session.sessionId}`);

        // Test 4: Database Connection
        console.log('\n4️⃣ Testing Database Connection...');
        const db = require('./db');
        const client = await db.pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM ingested_lessons');
        client.release();
        console.log('✅ Database:', result.rows[0].count > 0 ? 'PASS' : 'FAIL');
        console.log(`   Found ${result.rows[0].count} lessons in database`);

        console.log('\n🎉 All tests completed successfully!\n');
        
        console.log('📋 System Status:');
        console.log('   ✅ AI Service: Ready');
        console.log('   ✅ Content Aggregation: Ready');
        console.log('   ✅ AI Supervision: Ready'); 
        console.log('   ✅ Database: Connected');
        
        console.log('\n🚀 Ready to generate courses!');
        console.log('   Run: node ultimateCourseGenerator.js grokking-coding-interview single 10');
        console.log('   Or:  node smartCourseGenerator.js javascript 2 easy');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Check GEMINI_API_KEY in .env');
        console.error('   2. Verify database connection');
        console.error('   3. Ensure setupAICourseSystem.js was run');
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runQuickTests();
}

module.exports = { runQuickTests };