const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function checkRecordings() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, title, video_url, processing_status FROM recorded_sessions ORDER BY created_at DESC LIMIT 5');
        
        console.log('Sample recordings:');
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Title: ${r.title}, URL: ${r.video_url}, Status: ${r.processing_status}`);
        });
        
        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
        await client.end();
    }
}

checkRecordings();