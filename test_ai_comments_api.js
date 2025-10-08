require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:10000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testAICommentsAPI() {
    try {
        console.log('🔐 Authenticating...');

        // First, login to get a token
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: TEST_USER_EMAIL,
            password: TEST_PASSWORD
        });

        const token = loginRes.data.token;
        console.log('✓ Authenticated successfully');

        // Test 1: Get coaching prompts
        console.log('\n📋 Testing GET coaching prompts...');
        const promptsRes = await axios.get(`${API_URL}/api/ai-comments/coaching-prompts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Found ${promptsRes.data.prompts.length} coaching prompts`);
        promptsRes.data.prompts.slice(0, 3).forEach(p => {
            console.log(`  - ${p.name} (${p.category})`);
        });

        // Test 2: Generate comments
        console.log('\n✨ Testing comment generation...');
        const testDocument = `
            This essay discusses the importance of artificial intelligence in modern society.
            AI has transformed many industries and continues to reshape how we work and live.
            Machine learning algorithms are becoming increasingly sophisticated.
            Deep learning neural networks can now recognize patterns that humans might miss.
            The future of AI holds both promise and challenges that we must navigate carefully.
            Ethical considerations are paramount when developing AI systems.
            We must ensure that AI benefits all of humanity, not just a privileged few.
            Transparency and accountability are essential principles in AI development.
            As AI becomes more powerful, we need robust governance frameworks.
            The integration of AI into everyday life is accelerating rapidly.
        `.trim();

        const generateRes = await axios.post(`${API_URL}/api/ai-comments/generate`, {
            documentContent: testDocument,
            documentType: 'essay',
            targetComments: 10,
            promptTemplate: 'Essay Coach - Comprehensive',
            rememberPrevious: false
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (generateRes.data.success) {
            console.log(`✓ Generated ${generateRes.data.comments.length} comments`);
            console.log(`  Metadata:`, generateRes.data.metadata);

            // Show first comment
            if (generateRes.data.comments.length > 0) {
                const firstComment = generateRes.data.comments[0];
                console.log('\n📝 Sample Comment:');
                console.log(`  Type: ${firstComment.comment_type}`);
                console.log(`  Severity: ${firstComment.severity}`);
                console.log(`  Category: ${firstComment.category}`);
                console.log(`  Message: ${firstComment.message}`);
                console.log(`  Highlighted: "${firstComment.highlighted_text}"`);
            }
        }

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testAICommentsAPI();
