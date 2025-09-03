#!/usr/bin/env node

// Diagnose Agora Recording Issues
require('dotenv').config();
const axios = require('axios');
const db = require('./db');

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

const getBasicAuthHeader = () => {
    const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

async function diagnoseAgoraRecordings() {
    console.log('=== DIAGNOSING AGORA RECORDINGS ===\n');
    
    try {
        // Get recent recordings from database
        const recordings = await db.query(`
            SELECT 
                id, 
                agora_recording_sid,
                agora_recording_resource_id,
                processing_status,
                video_url,
                created_at,
                title
            FROM recorded_sessions 
            WHERE agora_recording_sid IS NOT NULL
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        console.log(`Found ${recordings.rows.length} recordings to diagnose:\n`);
        
        for (const recording of recordings.rows) {
            const { agora_recording_sid: sid, agora_recording_resource_id: resourceId } = recording;
            
            console.log(`🔍 CHECKING RECORDING: ${recording.title}`);
            console.log(`   Database ID: ${recording.id}`);
            console.log(`   Agora SID: ${sid}`);
            console.log(`   Resource ID: ${resourceId || 'NOT SET'}`);
            console.log(`   Current Status: ${recording.processing_status}`);
            console.log(`   Video URL: ${recording.video_url || 'MISSING'}`);
            
            if (!sid) {
                console.log(`   ❌ No Agora SID found - recording never started properly\n`);
                continue;
            }
            
            // Try to query this recording from Agora
            try {
                console.log(`   📞 Querying Agora for files...`);
                
                if (!resourceId) {
                    console.log(`   ❌ No resource ID - cannot query Agora API\n`);
                    continue;
                }
                
                const queryUrl = `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;
                console.log(`   🌐 Query URL: ${queryUrl}`);
                
                const response = await axios.get(queryUrl, {
                    headers: {
                        'Authorization': getBasicAuthHeader(),
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log(`   ✅ Agora Response Status: ${response.status}`);
                console.log(`   📄 Response Data:`, JSON.stringify(response.data, null, 4));
                
                const fileList = response.data?.serverResponse?.fileList;
                if (fileList && fileList.length > 0) {
                    console.log(`   📁 Found ${fileList.length} files:`);
                    fileList.forEach(file => {
                        console.log(`      - ${file.fileName} (${file.fileSize || 'unknown size'})`);
                    });
                    
                    // Try to construct Azure URL
                    const mp4File = fileList.find(f => f.fileName.endsWith('.mp4'));
                    const targetFile = mp4File || fileList[0];
                    
                    if (targetFile) {
                        const azureUrl = `https://${process.env.AGORA_AZURE_ACCESS_KEY}.blob.core.windows.net/${process.env.AGORA_AZURE_BUCKET}/${targetFile.fileName}`;
                        console.log(`   🔗 Constructed Azure URL: ${azureUrl}`);
                        
                        // Try to access the file
                        try {
                            const headResponse = await axios.head(azureUrl, { timeout: 5000 });
                            console.log(`   ✅ File accessible! Status: ${headResponse.status}`);
                            
                            // Update database with the found URL
                            await db.query(
                                'UPDATE recorded_sessions SET video_url = $1, updated_at = NOW() WHERE id = $2',
                                [azureUrl, recording.id]
                            );
                            console.log(`   💾 Updated database with video URL`);
                            
                        } catch (urlError) {
                            console.log(`   ❌ File not accessible: ${urlError.message}`);
                            console.log(`   🔍 This might mean the file wasn't uploaded to Azure`);
                        }
                    }
                } else {
                    console.log(`   ❌ No files found in Agora response`);
                    console.log(`   🔍 Recording may have failed or files expired`);
                }
                
            } catch (agoraError) {
                const errorData = agoraError.response?.data;
                console.log(`   ❌ Agora API Error: ${agoraError.message}`);
                
                if (errorData) {
                    console.log(`   📄 Error Details:`, JSON.stringify(errorData, null, 4));
                    
                    if (errorData.code === 404) {
                        console.log(`   🔍 Recording not found - it may have expired or failed`);
                    } else if (errorData.code === 432) {
                        console.log(`   🔍 Recording was too short or had no audio/video`);
                    }
                }
            }
            
            console.log(''); // Empty line between recordings
        }
        
    } catch (error) {
        console.error('Diagnosis failed:', error.message);
    }
    
    console.log('=== DIAGNOSIS COMPLETE ===');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. If files are found but not accessible, check Azure storage permissions');
    console.log('2. If no files found, recordings may be too short or failed to start');
    console.log('3. Check Agora console for recording logs and billing status');
    console.log('4. Ensure live sessions have active audio/video before recording');
}

diagnoseAgoraRecordings();