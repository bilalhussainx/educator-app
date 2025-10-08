const db = require('./educators-edge-backend/db');

async function debugLiveSessions() {
    try {
        console.log('🔍 Debugging Live Sessions...\n');

        const userId1 = '09b275f8-3aa1-49ed-9683-f4d26f1008d5'; // bilalhussain.v12
        const userId2 = 'eb03e344-252f-42ab-8187-602fc30384fa'; // bilalhussain.v1

        // Check session requests
        const requests = await db.query(`
            SELECT sr.*,
                   requester.username as requester_username,
                   mentor.username as mentor_username
            FROM session_requests sr
            LEFT JOIN users requester ON sr.requester_id = requester.id
            LEFT JOIN users mentor ON sr.mentor_id = mentor.id
            WHERE (sr.requester_id IN ($1, $2) OR sr.mentor_id IN ($1, $2))
            ORDER BY sr.created_at DESC
            LIMIT 10
        `, [userId1, userId2]);

        console.log('📋 Session Requests:');
        console.log('═══════════════════════════════════════════════════\n');
        if (requests.rows.length === 0) {
            console.log('   ❌ No session requests found\n');
        } else {
            requests.rows.forEach((req, i) => {
                console.log(`   ${i + 1}. REQUEST ID: ${req.id}`);
                console.log(`      From: ${req.requester_username} → To: ${req.mentor_username}`);
                console.log(`      Type: ${req.session_type}`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Created: ${req.created_at}`);
                console.log('');
            });
        }

        // Check sessions
        const sessions = await db.query(`
            SELECT s.*,
                   student.username as student_username,
                   mentor.username as mentor_username
            FROM sessions s
            LEFT JOIN users student ON s.student_id = student.id
            LEFT JOIN users mentor ON s.mentor_id = mentor.id
            WHERE (s.student_id IN ($1, $2) OR s.mentor_id IN ($1, $2))
            ORDER BY s.created_at DESC
            LIMIT 10
        `, [userId1, userId2]);

        console.log('📋 Sessions:');
        console.log('═══════════════════════════════════════════════════\n');
        if (sessions.rows.length === 0) {
            console.log('   ❌ No sessions found\n');
        } else {
            sessions.rows.forEach((sess, i) => {
                console.log(`   ${i + 1}. SESSION ID: ${sess.id}`);
                console.log(`      Student: ${sess.student_username} ↔ Mentor: ${sess.mentor_username}`);
                console.log(`      Type: ${sess.session_type}`);
                console.log(`      Status: ${sess.status}`);
                console.log(`      Mode: ${sess.session_mode || '⚠️  NOT SET'}`);
                console.log(`      Started: ${sess.started_at || 'Not started'}`);
                console.log(`      Created: ${sess.created_at}`);
                console.log('');
            });
        }

        // Summary
        console.log('═══════════════════════════════════════════════════');
        console.log('SUMMARY:');
        console.log(`  • Total Requests: ${requests.rows.length}`);
        console.log(`  • Total Sessions: ${sessions.rows.length}`);
        console.log(`  • Pending Requests: ${requests.rows.filter(r => r.status === 'pending').length}`);
        console.log(`  • Accepted Requests: ${requests.rows.filter(r => r.status === 'accepted').length}`);
        console.log(`  • Active Sessions: ${sessions.rows.filter(s => s.status === 'active').length}`);
        console.log(`  • Sessions with mode set: ${sessions.rows.filter(s => s.session_mode).length}`);
        console.log(`  • Sessions WITHOUT mode: ${sessions.rows.filter(s => !s.session_mode).length}`);
        console.log('═══════════════════════════════════════════════════');

        // Check if there are active sessions without mode
        const activeSessions = sessions.rows.filter(s => s.status === 'active');
        if (activeSessions.length > 0) {
            console.log('\n⚠️  ACTIVE SESSIONS DETECTED:\n');
            activeSessions.forEach(sess => {
                console.log(`   Session ${sess.id}:`);
                console.log(`   Status: ${sess.status}`);
                console.log(`   Mode: ${sess.session_mode || '❌ NOT SET - THIS IS THE PROBLEM!'}`);
                console.log(`   Student will be routed to: ${sess.session_mode === 'essay' ? 'Essay Editor' : 'Code Editor (default)'}`);
                console.log('');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugLiveSessions();
