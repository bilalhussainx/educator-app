const db = require('./educators-edge-backend/db');

async function debugSessionRequests() {
    try {
        console.log('🔍 Checking session requests and sessions...\n');

        // Check all session requests
        const requests = await db.query(`
            SELECT sr.*,
                   requester.username as requester_username,
                   mentor.username as mentor_username
            FROM session_requests sr
            LEFT JOIN users requester ON sr.requester_id = requester.id
            LEFT JOIN users mentor ON sr.mentor_id = mentor.id
            WHERE sr.status = 'pending'
            ORDER BY sr.created_at DESC
            LIMIT 5
        `);

        console.log('📋 Pending Session Requests:');
        if (requests.rows.length === 0) {
            console.log('   ❌ No pending requests found');
        } else {
            requests.rows.forEach((req, i) => {
                console.log(`   ${i + 1}. ID: ${req.id}`);
                console.log(`      From: ${req.requester_username} (ID: ${req.requester_id})`);
                console.log(`      To: ${req.mentor_username} (ID: ${req.mentor_id})`);
                console.log(`      Type: ${req.session_type}`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Description: ${req.description}`);
                console.log('');
            });
        }

        // Check all sessions
        const sessions = await db.query(`
            SELECT s.*,
                   student.username as student_username,
                   mentor.username as mentor_username
            FROM sessions s
            LEFT JOIN users student ON s.student_id = student.id
            LEFT JOIN users mentor ON s.mentor_id = mentor.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);

        console.log('📋 Recent Sessions:');
        if (sessions.rows.length === 0) {
            console.log('   ❌ No sessions found');
        } else {
            sessions.rows.forEach((sess, i) => {
                console.log(`   ${i + 1}. ID: ${sess.id}`);
                console.log(`      Student: ${sess.student_username} (ID: ${sess.student_id})`);
                console.log(`      Mentor: ${sess.mentor_username} (ID: ${sess.mentor_id})`);
                console.log(`      Type: ${sess.session_type}`);
                console.log(`      Status: ${sess.status}`);
                console.log(`      Mode: ${sess.session_mode || 'not set'}`);
                console.log('');
            });
        }

        // Check accepted requests
        const acceptedRequests = await db.query(`
            SELECT sr.*,
                   requester.username as requester_username,
                   mentor.username as mentor_username
            FROM session_requests sr
            LEFT JOIN users requester ON sr.requester_id = requester.id
            LEFT JOIN users mentor ON sr.mentor_id = mentor.id
            WHERE sr.status = 'accepted'
            ORDER BY sr.created_at DESC
            LIMIT 5
        `);

        console.log('📋 Accepted Session Requests (should have corresponding sessions):');
        if (acceptedRequests.rows.length === 0) {
            console.log('   ❌ No accepted requests found');
        } else {
            acceptedRequests.rows.forEach((req, i) => {
                console.log(`   ${i + 1}. ID: ${req.id}`);
                console.log(`      From: ${req.requester_username}`);
                console.log(`      To: ${req.mentor_username}`);
                console.log(`      Status: ${req.status}`);
                console.log('');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugSessionRequests();
