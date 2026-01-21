#!/usr/bin/env node

// Test Agora Authentication
require('dotenv').config();
const axios = require('axios');

async function testAgoraAuth() {
    console.log('=== TESTING AGORA AUTHENTICATION ===\n');
    
    const { AGORA_APP_ID, AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET } = process.env;
    
    // Check environment variables
    console.log('1. ENVIRONMENT VARIABLES:');
    console.log(`   AGORA_APP_ID: ${AGORA_APP_ID ? '✓ SET' : '❌ MISSING'}`);
    console.log(`   AGORA_CUSTOMER_ID: ${AGORA_CUSTOMER_ID ? '✓ SET' : '❌ MISSING'}`);
    console.log(`   AGORA_CUSTOMER_SECRET: ${AGORA_CUSTOMER_SECRET ? '✓ SET' : '❌ MISSING'}`);
    
    if (!AGORA_APP_ID || !AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET) {
        console.log('\n❌ Missing Agora credentials! Check your .env file.');
        return;
    }
    
    // Test Basic Auth construction
    console.log('\n2. AUTHENTICATION SETUP:');
    const credentials = `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`;
    const basicAuth = `Basic ${Buffer.from(credentials).toString('base64')}`;
    console.log(`   Credentials format: ${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET.substring(0,8)}...`);
    console.log(`   Basic Auth header: ${basicAuth.substring(0,50)}...`);
    
    // Test a simple Agora API call
    console.log('\n3. API CONNECTIVITY TEST:');
    try {
        const testUrl = `https://api.agora.io/v1/apps/${AGORA_APP_ID}/usage`;
        console.log(`   Testing URL: ${testUrl}`);
        
        const response = await axios.get(testUrl, {
            headers: {
                'Authorization': basicAuth,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`   ✅ SUCCESS! Status: ${response.status}`);
        console.log(`   📊 API Response: Authentication working correctly`);
        
    } catch (error) {
        const errorData = error.response?.data;
        console.log(`   ❌ API Error: ${error.message}`);
        
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Response:`, JSON.stringify(errorData, null, 2));
            
            if (error.response.status === 401) {
                console.log('\n🔍 DIAGNOSIS: Invalid credentials');
                console.log('   - Check that AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET are correct');
                console.log('   - Verify these are your RESTful API credentials, not App Certificate');
                console.log('   - Go to Agora Console → Project → RESTful API');
            } else if (error.response.status === 404) {
                console.log('\n🔍 DIAGNOSIS: Invalid App ID');
                console.log('   - Check that AGORA_APP_ID is correct');
                console.log('   - Verify the App ID exists in your Agora Console');
            }
        }
    }
    
    console.log('\n=== AUTHENTICATION TEST COMPLETE ===');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. If auth fails, double-check your Agora Console credentials');
    console.log('2. Make sure you\'re using RESTful API credentials, not App Certificate');
    console.log('3. Verify your Agora project has cloud recording enabled');
    console.log('4. Check if your Agora account has sufficient credits');
}

testAgoraAuth();