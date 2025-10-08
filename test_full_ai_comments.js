/**
 * Test full AI comment generation with Claude API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testFullAIComments() {
    console.log('🧪 Testing Full AI Comment System with Claude API\n');

    try {
        // Test with a longer, more realistic essay
        const essayContent = `
The Impact of Technology on Modern Education

In recent years, technology has fundamentally transformed the educational landscape.
From online learning platforms to artificial intelligence tutors, the integration of
digital tools has created unprecedented opportunities for personalized learning experiences.

However, this transformation is not without its challenges. Students today face the
dual burden of mastering traditional academic skills while also developing digital
literacy. Teachers must adapt their pedagogical approaches to accommodate both in-person
and remote learning environments.

The pandemic accelerated this shift, forcing educational institutions to rapidly adopt
technologies they had previously resisted. This sudden change revealed both the potential
and limitations of digital education. While some students thrived in the flexible online
environment, others struggled with the lack of face-to-face interaction and structured
learning spaces.

Looking forward, the future of education likely lies in a hybrid model that combines
the best aspects of traditional and digital learning. Success will require not just
technological infrastructure, but also comprehensive training for educators and
equitable access for all students.
        `.trim();

        console.log('📝 Essay length:', essayContent.length, 'characters');
        console.log('📊 Requesting 50 AI comments...\n');

        const startTime = Date.now();

        const response = await axios.post(
            `${BASE_URL}/api/ai-comments/generate`,
            {
                documentContent: essayContent,
                documentType: 'essay',
                targetComments: 50,
                promptTemplate: 'Essay Coach - Comprehensive',
                sessionId: null
            },
            {
                headers: {
                    'Authorization': 'Bearer dev-token-for-testing'
                },
                timeout: 120000 // 2 minute timeout for Claude API
            }
        );

        const elapsed = Date.now() - startTime;

        if (response.data.success) {
            console.log('✅ SUCCESS! AI Comments Generated\n');
            console.log('📊 RESULTS:');
            console.log('   Comments generated:', response.data.comments?.length || response.data.metadata?.totalComments);
            console.log('   Generation time:', response.data.metadata?.generationTimeMs || elapsed, 'ms');
            console.log('   Using fallback:', response.data.metadata?.fallbackMode ? 'YES ⚠️' : 'NO (Claude API) ✅');
            console.log('   Prompt used:', response.data.metadata?.promptUsed);

            if (response.data.metadata?.fallbackMode) {
                console.log('\n⚠️  WARNING: System is using fallback mode!');
                console.log('   This means Claude API is not being called.');
                console.log('   Check the backend logs for errors.');
            } else {
                console.log('\n🎉 Claude API is working! You should see 20-50+ comprehensive comments.');
            }

            // Show a sample comment
            if (response.data.comments && response.data.comments.length > 0) {
                console.log('\n📋 SAMPLE COMMENT:');
                const sample = response.data.comments[0];
                console.log('   Category:', sample.category || sample.comment_type);
                console.log('   Severity:', sample.severity);
                console.log('   Message:', (sample.message || '').substring(0, 100) + '...');
                console.log('   Suggestion:', (sample.suggestion || '').substring(0, 100) + '...');
            }

            // Show category breakdown
            if (response.data.comments && response.data.comments.length > 0) {
                const categories = {};
                response.data.comments.forEach(c => {
                    const cat = c.category || c.comment_type || 'Unknown';
                    categories[cat] = (categories[cat] || 0) + 1;
                });

                console.log('\n📂 COMMENT CATEGORIES:');
                Object.entries(categories).forEach(([cat, count]) => {
                    console.log(`   ${cat}: ${count}`);
                });
            }

        } else {
            console.log('❌ FAILED:', response.data.error || 'Unknown error');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:');

        if (error.code === 'ECONNREFUSED') {
            console.log('   Backend server is not running on port 10000');
            console.log('   Run: cd educators-edge-backend && node server.js');
        } else if (error.response) {
            console.log('   HTTP Status:', error.response.status);
            console.log('   Error:', error.response.data?.error || error.response.data);
        } else {
            console.log('   Error:', error.message);
        }
    }
}

testFullAIComments();
