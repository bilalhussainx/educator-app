/**
 * Test real Claude API integration with configured key
 */
require('dotenv').config({ path: './educators-edge-backend/.env' });

// Also try loading from different paths
if (!process.env.ANTHROPIC_API_KEY) {
    console.log('🔍 Trying alternative .env paths...');
    require('dotenv').config({ path: './.env' });
    require('dotenv').config();
}
const claudeInlineAnalysisService = require('./educators-edge-backend/src/services/claudeInlineAnalysisService');

async function testRealClaudeAPI() {
    console.log('🧠 Testing Real Claude API Integration...\n');

    // Check if API key is loaded
    console.log('🔑 API Key Status:', process.env.ANTHROPIC_API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
    console.log('🔑 Key Preview:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 15)}...` : 'Not found');

    const testDocument = `
The morning light filtered through the dusty windows of the old library, casting long shadows across the rows of forgotten books. Maria had always found solace in this place, but today felt different. The acceptance letter from Stanford lay crumpled in her backpack, a dream realized that somehow felt more like a burden.

She thought about her family's expectations, the years of sacrifice her parents had made working double shifts to pay for her tutoring. How could she tell them that she wasn't sure she wanted to study engineering anymore? That her heart lay with literature, with the very books that surrounded her in this sanctuary?

The weight of tradition pressed down on her shoulders like a heavy cloak. In her culture, becoming an engineer meant security, respect, a path to success that her ancestors could never have imagined. But what about her own dreams? What about the stories burning inside her, desperate to be told?
    `.trim();

    try {
        console.log('📄 Document length:', testDocument.length, 'characters');
        console.log('🚀 Calling Claude API directly...\n');

        const result = await claudeInlineAnalysisService.generateInlineComments(testDocument, {
            documentType: 'college_essay',
            analysisDepth: 'dense',
            focusAreas: ['thematic_development', 'rhetorical_strategy', 'stylistic_craft', 'intellectual_depth'],
            userLevel: 'advanced'
        });

        if (result.success) {
            console.log('✅ Claude API Success!');
            console.log('📊 Analysis Results:');
            console.log(`   - Total comments: ${result.comments.length}`);
            console.log(`   - Analysis time: ${result.analysisMetadata.analysisTime}ms`);
            console.log(`   - Using fallback: ${result.analysisMetadata.usingFallback ? 'YES' : 'NO'}`);

            if (result.analysisMetadata.usingFallback) {
                console.log(`   - Fallback reason: ${result.analysisMetadata.reason}`);
            } else {
                console.log('   - 🤖 Using REAL Claude API! 🎉');
            }

            console.log(`   - Comment types:`, result.analysisMetadata.commentTypes);

            console.log('\n🔍 Sample Claude Comments:');
            result.comments.slice(0, 5).forEach((comment, index) => {
                console.log(`\n${index + 1}. [${comment.commentType}] ${comment.category}`);
                console.log(`   Position: ${comment.startOffset}-${comment.endOffset}`);
                console.log(`   Text: "${comment.highlightedText.substring(0, 60)}${comment.highlightedText.length > 60 ? '...' : ''}"`);
                console.log(`   Message: ${comment.message}`);
                console.log(`   Suggestion: ${comment.suggestion}`);
                if (comment.alternatives && comment.alternatives.length > 0) {
                    console.log(`   Alternatives: ${comment.alternatives.slice(0, 2).join(', ')}`);
                }
                console.log(`   Confidence: ${comment.confidence}`);
            });

        } else {
            console.log('❌ Claude API Failed');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
        if (error.response) {
            console.error('API Response Status:', error.response.status);
            console.error('API Response Data:', error.response.data);
        }
    }
}

// Run the test
testRealClaudeAPI().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test script error:', error);
    process.exit(1);
});