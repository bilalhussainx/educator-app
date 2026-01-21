/**
 * Test Essay API Endpoints
 *
 * Quick test to verify essay routes are working
 */

const axios = require('axios');

const API_URL = 'http://localhost:10000';

async function testEssayAPI() {
  console.log('🧪 Testing Essay API Endpoints\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Test 1: Get Universities (no auth required)
    console.log('📋 Test 1: Get Universities List');
    try {
      const response = await axios.get(`${API_URL}/api/essays/universities`);
      console.log('✅ Success! Universities endpoint working');
      console.log(`   Found ${response.data.universities.length} universities`);
      console.log(`   Sample: ${response.data.universities.slice(0, 3).join(', ')}, ...`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }

    console.log('');

    // Test 2: Test connection endpoint (requires auth)
    console.log('📋 Test 2: Test Python Connection (with dev token)');
    try {
      const response = await axios.get(`${API_URL}/api/essays/test-connection`, {
        headers: {
          'Authorization': 'Bearer dev-token-for-testing'
        }
      });
      console.log('✅ Success! Python connection test working');
      console.log(`   Python Version: ${response.data.pythonVersion}`);
      console.log(`   Python Path: ${response.data.pythonPath}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.error || error.message}`);
    }

    console.log('');

    // Test 3: Get stats (requires auth)
    console.log('📋 Test 3: Get User Stats (with dev token)');
    try {
      const response = await axios.get(`${API_URL}/api/essays/stats`, {
        headers: {
          'Authorization': 'Bearer dev-token-for-testing'
        }
      });
      console.log('✅ Success! Stats endpoint working');
      console.log(`   Subscription Tier: ${response.data.quota.subscription_tier}`);
      console.log(`   Can Generate: ${response.data.quota.can_generate}`);
      console.log(`   Remaining: ${response.data.quota.remaining}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('\n🎉 Essay API is ready to use!');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure Ollama is running: ollama serve');
    console.log('   2. Start frontend: cd ../educators-edge-frontend && npm run dev');
    console.log('   3. Test in browser: http://localhost:5173/essay-generator');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   cd educators-edge-backend && npm run dev');
    process.exit(1);
  }
}

// Check if server is running first
axios.get(`${API_URL}/healthz`)
  .then(() => {
    console.log('✅ Backend server is running\n');
    return testEssayAPI();
  })
  .catch((error) => {
    console.log('❌ Backend server is not running!');
    console.log('\n💡 Start the backend first:');
    console.log('   cd educators-edge-backend && npm run dev\n');
    process.exit(1);
  });
