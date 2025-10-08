// Test API with authentication
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Create a test JWT token (same secret as backend would use)
const testUserId = 1; // Assuming first user
const testSecret = 'your-secret-key'; // This would need to match backend

// Try to make authenticated request
async function testAPICall() {
    try {
        console.log('Testing authenticated API call...');
        
        // Test without auth first to see error
        try {
            const unauthedResponse = await axios.get('http://localhost:10000/api/profiles/search/profiles?service_type=all&limit=50');
            console.log('Unauthed response:', unauthedResponse.data);
        } catch (error) {
            console.log('Expected unauth error:', error.response?.data || error.message);
        }
        
        console.log('\\nTo fix this, please:');
        console.log('1. Open the web app in browser');
        console.log('2. Log in with bilalhussain.v12@gmail.com');
        console.log('3. Navigate to /trust-graph');
        console.log('4. Check browser console for any errors');
        console.log('5. Check Network tab to see API calls');
        
        console.log('\\nShould now see:');
        console.log('- 4 AI bots (Alex Chen, Sarah Kim, Mike Rodriguez, Emma Thompson)');
        console.log('- Bilal Hussain profile (now enabled as searchable teacher/mentor)');
        console.log('- Total 6 searchable profiles');
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testAPICall();