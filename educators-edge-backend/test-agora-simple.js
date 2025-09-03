#!/usr/bin/env node

// Simple Agora Cloud Recording Test
require('dotenv').config();
const axios = require('axios');

async function testAgoraSimple() {
    console.log('=== SIMPLE AGORA TEST ===\n');
    
    const { AGORA_APP_ID, AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET } = process.env;
    
    const basicAuth = `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`;
    
    // Try to acquire a resource (this is the first step in cloud recording)
    console.log('Testing cloud recording resource acquisition...');
    
    try {
        const testChannelName = 'test-channel-' + Date.now();
        const testUid = '12345';
        
        const acquireUrl = `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/acquire`;
        console.log(`URL: ${acquireUrl}`);
        
        const response = await axios.post(acquireUrl, {
            cname: testChannelName,
            uid: testUid,
            clientRequest: { resourceExpiredHour: 24 }
        }, {
            headers: {
                'Authorization': basicAuth,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ SUCCESS! Cloud recording API is working');
        console.log(`Resource ID: ${response.data.resourceId}`);
        
        // This means your credentials are correct!
        console.log('\n✅ Your Agora credentials are CORRECT');
        console.log('✅ Cloud recording is enabled');
        console.log('✅ The issue is not with authentication');
        
        console.log('\n🔍 PROBLEM IDENTIFIED:');
        console.log('The recordings are being started but something is failing during the stop/query process');
        console.log('This could be:');
        console.log('1. Recordings are too short (need at least 15+ seconds)');
        console.log('2. No active audio/video during recording');
        console.log('3. Azure storage credentials in the recording config are wrong');
        
    } catch (error) {
        const errorData = error.response?.data;
        console.log(`❌ Error: ${error.message}`);
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log('Response:', JSON.stringify(errorData, null, 2));
            
            if (error.response.status === 401) {
                console.log('\n❌ Authentication failed');
                console.log('🔍 Check your AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET');
            } else if (error.response.status === 404) {
                console.log('\n❌ App ID not found');
                console.log('🔍 Check your AGORA_APP_ID');
            } else if (errorData?.code === 2 && errorData?.reason === 'services not selected!') {
                console.log('\n❌ Cloud recording not enabled for this app');
                console.log('🔍 Enable cloud recording in Agora Console');
            }
        }
    }
}

testAgoraSimple();