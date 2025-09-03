#!/usr/bin/env node

// Test Agora Recording Process
require('dotenv').config();
const db = require('./db');

async function testRecordingFlow() {
    console.log('=== TESTING RECORDING DATABASE ===\n');
    
    try {
        // Check if recorded_sessions table exists and show recent entries
        const recentRecordings = await db.query(`
            SELECT 
                id, 
                agora_recording_sid, 
                processing_status, 
                video_url, 
                created_at,
                updated_at,
                title
            FROM recorded_sessions 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log(`Found ${recentRecordings.rows.length} recent recordings:`);
        
        if (recentRecordings.rows.length > 0) {
            recentRecordings.rows.forEach((recording, index) => {
                console.log(`\n${index + 1}. Recording ID: ${recording.id}`);
                console.log(`   Title: ${recording.title || 'No title'}`);
                console.log(`   Agora SID: ${recording.agora_recording_sid || 'No SID'}`);
                console.log(`   Status: ${recording.processing_status}`);
                console.log(`   Video URL: ${recording.video_url || 'No URL'}`);
                console.log(`   Created: ${recording.created_at}`);
                console.log(`   Updated: ${recording.updated_at}`);
                
                if (recording.video_url) {
                    const isAzureUrl = recording.video_url.includes('virtualclassroom.blob.core.windows.net');
                    console.log(`   Azure URL: ${isAzureUrl ? '✓ YES' : '✗ NO'}`);
                }
            });
        } else {
            console.log('No recordings found. Try starting a live session and recording first.');
        }
        
        // Check for stuck processing recordings
        const stuckRecordings = await db.query(`
            SELECT COUNT(*) as count 
            FROM recorded_sessions 
            WHERE processing_status = 'processing' 
            AND created_at < NOW() - INTERVAL '30 minutes'
        `);
        
        if (stuckRecordings.rows[0].count > 0) {
            console.log(`\n⚠️  Found ${stuckRecordings.rows[0].count} recordings stuck in 'processing' status for > 30 minutes`);
            console.log('   These may indicate failed recordings that need cleanup.');
        }
        
        console.log('\n=== TEST COMPLETE ===');
        console.log('\nTo test recording:');
        console.log('1. Start a live session via the frontend');
        console.log('2. Click "Start Recording" in the session');  
        console.log('3. Record for 10-30 seconds');
        console.log('4. Click "Stop Recording"');
        console.log('5. Check backend logs and run this script again');
        
    } catch (error) {
        console.error('Database test failed:', error.message);
        console.log('\nMake sure your database is running and accessible.');
    } finally {
        process.exit(0);
    }
}

testRecordingFlow();