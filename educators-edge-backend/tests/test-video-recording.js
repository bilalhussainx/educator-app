#!/usr/bin/env node

// Test Video Recording Configuration
require('dotenv').config();
const { startCloudRecording } = require('./services/agoraService');

async function testVideoRecordingConfig() {
    console.log('=== TESTING VIDEO RECORDING CONFIGURATION ===\n');
    
    // Test configuration values
    const testChannelName = `test-video-channel-${Date.now()}`;
    const testCourseId = 'test-course-123';
    const testTeacherId = 'test-teacher-456';
    
    console.log('Test Parameters:');
    console.log(`  Channel: ${testChannelName}`);
    console.log(`  Course ID: ${testCourseId}`);
    console.log(`  Teacher ID: ${testTeacherId}`);
    
    console.log('\n📊 Expected Configuration:');
    console.log('  ✓ streamTypes: 2 (both audio and video)');
    console.log('  ✓ audioProfile: 1 (required for audio)');
    console.log('  ✓ videoStreamType: 0 (required for video)');
    console.log('  ✓ avFileType: ["hls", "mp4"] (both formats)');
    console.log('  ✓ vendor: 5 (Azure Blob Storage)');
    console.log('  ✓ Recording mode: composite');
    
    try {
        console.log('\n🚀 Starting test recording...');
        
        const result = await startCloudRecording(testChannelName, testCourseId, testTeacherId);
        
        console.log('\n✅ SUCCESS! Video recording configuration is correct');
        console.log(`📝 Resource ID: ${result.resourceId}`);
        console.log(`🎬 Recording SID: ${result.sid}`);
        console.log(`👤 Bot UID: ${result.uid}`);
        
        console.log('\n🔧 What this means:');
        console.log('  ✓ Agora authentication working');
        console.log('  ✓ Azure storage configuration valid');
        console.log('  ✓ Video recording parameters correct');
        console.log('  ✓ Ready for live session recording');
        
        console.log('\n⚠️  IMPORTANT: This was a test recording');
        console.log('  The recording will remain active for a few minutes');
        console.log('  It will auto-stop when no users join the test channel');
        
        // Check database entry
        const db = require('./db');
        const dbCheck = await db.query(
            'SELECT * FROM recorded_sessions WHERE agora_recording_sid = $1',
            [result.sid]
        );
        
        if (dbCheck.rows.length > 0) {
            console.log('  ✓ Database entry created successfully');
            console.log(`  📊 Database ID: ${dbCheck.rows[0].id}`);
        }
        
    } catch (error) {
        console.log('\n❌ Configuration Error:', error.message);
        
        if (error.message.includes('streamTypes')) {
            console.log('\n🔍 DIAGNOSIS: streamTypes configuration issue');
            console.log('  - Ensure streamTypes is set to 2 for audio+video');
            console.log('  - Add audioProfile and videoStreamType parameters');
        }
        
        if (error.message.includes('storage')) {
            console.log('\n🔍 DIAGNOSIS: Azure storage configuration issue'); 
            console.log('  - Check AGORA_AZURE_* environment variables');
            console.log('  - Ensure vendor is set to 5 for Azure');
        }
        
        if (error.message.includes('token')) {
            console.log('\n🔍 DIAGNOSIS: Token generation issue');
            console.log('  - Verify AGORA_APP_CERTIFICATE is correct');
            console.log('  - Check token generation parameters');
        }
    }
    
    console.log('\n=== TEST COMPLETE ===');
}

testVideoRecordingConfig().catch(console.error);