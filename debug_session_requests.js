const db = require('./educators-edge-backend/db');

async function checkSessionRequests() {
    try {
        console.log('=== All Session Requests ===');
        const allRequests = await db.query('SELECT * FROM session_requests ORDER BY created_at DESC');
        console.log('Total requests:', allRequests.rows.length);
        allRequests.rows.forEach(row => {
            console.log('ID:', row.id, 'Requester:', row.requester_id, 'Mentor:', row.mentor_id, 'Status:', row.status, 'Type:', row.session_type);
        });

        console.log('\n=== All Users ===');
        const allUsers = await db.query('SELECT id, username, role FROM users ORDER BY username');
        allUsers.rows.forEach(row => {
            console.log('ID:', row.id, 'Username:', row.username, 'Role:', row.role);
        });

        console.log('\n=== Incoming requests for bilalhussain.v1 ===');
        const bilalV1Id = 'eb03e344-252f-42ab-8187-602fc30384fa';
        const incomingRequests = await db.query(`
            SELECT sr.*, 
                   u.username as student_username, 
                   up.display_name as student_display_name
            FROM session_requests sr
            JOIN users u ON sr.requester_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE sr.mentor_id = $1
            ORDER BY sr.created_at DESC
        `, [bilalV1Id]);
        
        console.log('Incoming requests count:', incomingRequests.rows.length);
        incomingRequests.rows.forEach(row => {
            console.log('Request:', row.id, 'From:', row.student_username, 'Type:', row.session_type, 'Status:', row.status);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSessionRequests();