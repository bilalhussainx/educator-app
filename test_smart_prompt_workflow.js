/**
 * Test Smart Prompt to Inline Comments Workflow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testSmartPromptWorkflow() {
    console.log('🧪 Testing Smart Prompt → Inline Comments Workflow\n');

    const essayContent = `
The digital revolution has fundamentally transformed how we connect and communicate.
Social media platforms have created unprecedented opportunities for global interaction,
yet they have also introduced new challenges to mental health and personal privacy.

Young people today navigate a complex digital landscape. They balance the benefits
of constant connectivity with the risks of cyberbullying, addiction, and information
overload. The pressure to maintain a perfect online persona can lead to anxiety and
feelings of inadequacy.

Parents and educators struggle to guide children through these challenges. Traditional
rules about screen time and internet safety often feel inadequate in the face of
rapidly evolving technology. Schools are beginning to implement digital citizenship
programs, but many questions remain about the best approaches.

Looking forward, we must find ways to harness technology's benefits while mitigating
its harms. This requires collective effort from tech companies, policymakers, educators,
and families. Only through thoughtful collaboration can we create a healthier digital
future for the next generation.
    `.trim();

    try {
        console.log('📝 Essay length:', essayContent.length, 'characters');
        console.log('💡 Smart Prompt: "Make your narrative more universally relatable"');
        console.log('\n⏳ Sending prompt to AI...\n');

        const response = await axios.post(
            `${BASE_URL}/api/ai/smart-prompts`,
            {
                prompt: 'Make your narrative more universally relatable - what examples or themes in your story about social media and digital well-being will resonate with general readers?',
                documentContent: essayContent,
                documentType: 'college_essay',
                wordCount: essayContent.split(/\s+/).length,
                requirements: {
                    type: 'college_essay',
                    length: 'medium',
                    audience: 'admissions_committee',
                    purpose: 'personal_narrative',
                    tone: 'authentic'
                }
            },
            {
                headers: {
                    'Authorization': 'Bearer dev-token-for-testing'
                },
                timeout: 120000
            }
        );

        if (response.data.success) {
            console.log('✅ SUCCESS!\n');
            console.log('📊 RESULTS:');
            console.log('   Comments generated:', response.data.comments?.length || response.data.metadata?.totalComments);
            console.log('   Using fallback:', response.data.metadata?.fallbackMode ? 'YES' : 'NO (Claude API)');
            console.log('   Original prompt:', response.data.metadata?.originalPrompt?.substring(0, 80) + '...');

            if (response.data.comments && response.data.comments.length > 0) {
                console.log('\n📋 SAMPLE INLINE COMMENTS:\n');

                response.data.comments.slice(0, 3).forEach((comment, idx) => {
                    console.log(`${idx + 1}. [${comment.category}] ${comment.severity}`);
                    console.log(`   Text: "${comment.highlightedText.substring(0, 60)}..."`);
                    console.log(`   Message: ${comment.message}`);
                    console.log(`   Suggestion: ${comment.suggestion.substring(0, 100)}...`);
                    console.log('');
                });

                // Group by category
                const categories = {};
                response.data.comments.forEach(c => {
                    categories[c.category] = (categories[c.category] || 0) + 1;
                });

                console.log('📂 COMMENTS BY CATEGORY:');
                Object.entries(categories).forEach(([cat, count]) => {
                    console.log(`   ${cat}: ${count}`);
                });

                console.log('\n✅ The workflow is complete!');
                console.log('   These inline comments would now appear in the essay editor.');
                console.log('   Users can click each comment to see suggestions and apply them.\n');
            }
        } else {
            console.log('❌ FAILED:', response.data.error);
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

testSmartPromptWorkflow();
