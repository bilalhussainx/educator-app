#!/usr/bin/env node

// Check what files Agora actually generated
require('dotenv').config();
const axios = require('axios');

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

const getBasicAuthHeader = () => {
    const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

async function checkLastRecordingFiles() {
    console.log('=== CHECKING LAST RECORDING FILES ===\n');
    
    try {
        // Get the most recent recording from database
        const db = require('./db');
        const result = await db.query(`
            SELECT 
                agora_recording_sid,
                agora_recording_resource_id,
                video_url,
                title,
                created_at
            FROM recorded_sessions 
            WHERE agora_recording_sid IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            console.log('No recordings found in database');
            return;
        }
        
        const recording = result.rows[0];
        console.log('Last Recording Info:');
        console.log(`  Title: ${recording.title}`);
        console.log(`  SID: ${recording.agora_recording_sid}`);
        console.log(`  Resource ID: ${recording.agora_recording_resource_id}`);
        console.log(`  Current Video URL: ${recording.video_url}`);
        console.log(`  Created: ${recording.created_at}`);
        
        // Query Agora for the actual file list
        console.log('\n🔍 Querying Agora for actual files...');
        
        const queryResponse = await axios.get(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${recording.agora_recording_resource_id}/sid/${recording.agora_recording_sid}/mode/mix/query`,
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('📄 Full Agora Response:');
        console.log(JSON.stringify(queryResponse.data, null, 2));
        
        const fileList = queryResponse.data?.serverResponse?.fileList;
        if (fileList && fileList.length > 0) {
            console.log(`\n📁 Found ${fileList.length} files:`);
            fileList.forEach((file, index) => {
                const fileType = file.fileName.split('.').pop().toLowerCase();
                console.log(`  ${index + 1}. ${file.fileName}`);
                console.log(`     Type: ${fileType.toUpperCase()}`);
                console.log(`     Size: ${file.fileSize || 'unknown'} bytes`);
                if (file.sliceStartTime) console.log(`     Start Time: ${file.sliceStartTime}`);
                if (file.sliceEndTime) console.log(`     End Time: ${file.sliceEndTime}`);
                console.log('');
            });
            
            // Check for MP4 files specifically
            const mp4Files = fileList.filter(f => f.fileName.endsWith('.mp4'));
            const m3u8Files = fileList.filter(f => f.fileName.endsWith('.m3u8'));
            const tsFiles = fileList.filter(f => f.fileName.endsWith('.ts'));
            
            console.log('📊 File Type Summary:');
            console.log(`  MP4 files: ${mp4Files.length} ${mp4Files.length > 0 ? '✅' : '❌'}`);
            console.log(`  M3U8 files: ${m3u8Files.length} ${m3u8Files.length > 0 ? '✅' : '❌'}`);
            console.log(`  TS segments: ${tsFiles.length} ${tsFiles.length > 0 ? '✅' : '❌'}`);
            
            if (mp4Files.length === 0 && m3u8Files.length > 0) {
                console.log('\n⚠️  ISSUE IDENTIFIED:');
                console.log('  - Only M3U8/HLS files generated, no MP4 files');
                console.log('  - This explains why downloaded files cannot be played directly');
                console.log('  - M3U8 is a playlist format, not a video file');
                
                console.log('\n💡 SOLUTIONS:');
                console.log('  1. Wait longer - MP4 generation might take time');
                console.log('  2. Check if avFileType includes "mp4" in recording config');
                console.log('  3. Verify Agora project has MP4 generation enabled');
                console.log('  4. Consider using HLS player for M3U8 files');
            }
            
            if (mp4Files.length > 0) {
                console.log('\n✅ MP4 FILES FOUND! Recording should work correctly.');
            }
            
        } else {
            console.log('❌ No files found in Agora response');
        }
        
    } catch (error) {
        console.error('Error checking files:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkLastRecordingFiles();