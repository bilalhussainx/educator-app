const db = require('./educators-edge-backend/db');

async function testSessionQuery() {
    try {
        const userId = 'eb03e344-252f-42ab-8187-602fc30384fa'; // bilalhussain.v1
        
        console.log('Testing FIXED session requests query...');
        console.log('User ID:', userId);
        
        const query = `
            SELECT sr.*, 
                   u.username as student_username, 
                   up.display_name as student_display_name
            FROM session_requests sr
            JOIN users u ON sr.requester_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE sr.mentor_id = $1
            ORDER BY sr.created_at DESC
        `;
        
        console.log('Executing query:', query);
        console.log('With params:', [userId]);
        
        const result = await db.query(query, [userId]);
        
        console.log('Query result rows:', result.rows.length);
        console.log('Query result data:', result.rows);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSessionQuery();