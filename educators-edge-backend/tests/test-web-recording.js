#!/usr/bin/env node

// Test Web Page Recording with detailed error reporting
require('dotenv').config();
const { startWebPageRecording } = require('./services/webPageRecordingService');

async function testWebPageRecording() {
    console.log('=== TESTING WEB PAGE RECORDING ===\n');
    
    // Test parameters
    const testSessionId = `test-web-session-${Date.now()}`;
    const testCourseId = '1';
    const testTeacherId = 'test-teacher-web';
    
    console.log('Test Parameters:');
    console.log(`  Session ID: ${testSessionId}`);
    console.log(`  Course ID: ${testCourseId}`);
    console.log(`  Teacher ID: ${testTeacherId}`);
    console.log(`  Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`  Recording URL: ${process.env.FRONTEND_URL}/session/${testSessionId}`);
    
    console.log('\n📊 Expected Configuration:');
    console.log('  ✓ Mode: web (web page recording)');
    console.log('  ✓ videoWidth: 1920 (in serviceParam)');
    console.log('  ✓ videoHeight: 1080 (in serviceParam)');
    console.log('  ✓ url: Frontend session URL');
    console.log('  ✓ extensionServices: web_recorder_service');
    
    try {
        console.log('\n🚀 Starting web page recording test...');
        
        const result = await startWebPageRecording(testSessionId, testCourseId, testTeacherId);
        
        console.log('\n✅ SUCCESS! Web page recording started');
        console.log(`📝 Resource ID: ${result.resourceId}`);
        console.log(`🎬 Recording SID: ${result.sid}`);
        console.log(`👤 Bot UID: ${result.uid}`);
        console.log(`🎯 Recording Type: ${result.recordingType}`);
        
        console.log('\n✅ Web page recording is working correctly!');
        console.log('🎉 You can now use this for live educational sessions.');
        
    } catch (error) {
        console.log('\n❌ Web Page Recording Failed');
        console.log(`Error: ${error.message}`);
        
        // Parse the error for specific issues
        if (error.message.includes('videoWidth')) {
            console.log('\n🔍 DIAGNOSIS: videoWidth parameter issue');
            console.log('  - Check if videoWidth is in serviceParam section');
            console.log('  - Ensure it\'s an integer, not in transcodingConfig');
        }
        
        if (error.message.includes('services not selected')) {
            console.log('\n🔍 DIAGNOSIS: Web recording service not enabled');
            console.log('  - Web page recording might not be available for your Agora project');
            console.log('  - Contact Agora support to enable web recording');
        }
        
        if (error.message.includes('url')) {
            console.log('\n🔍 DIAGNOSIS: URL parameter issue');
            console.log('  - Check FRONTEND_URL environment variable');
            console.log('  - Ensure the URL is accessible');
        }
        
        if (error.message.includes('53')) {
            console.log('\n🔍 DIAGNOSIS: Web recording not enabled (Error 53)');
            console.log('  - This Agora project doesn\'t have web recording enabled');
            console.log('  - You may need to upgrade your Agora plan');
            console.log('  - Or contact Agora support to enable the feature');
        }
        
        if (error.message.includes('extensionServiceConfig')) {
            console.log('\n🔍 DIAGNOSIS: Extension service configuration issue');
            console.log('  - Check the extensionServices array structure');
            console.log('  - Verify serviceName: web_recorder_service');
        }
        
        console.log('\n💡 ALTERNATIVE SOLUTION:');
        console.log('  If web recording isn\'t available, we can fall back to:');
        console.log('  1. Screen sharing + regular video recording');
        console.log('  2. Individual recording mode');
        console.log('  3. Composite recording with screen share priority');
    }
    
    console.log('\n=== TEST COMPLETE ===');
}

testWebPageRecording().catch(console.error);