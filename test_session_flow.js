// Test script to verify session flow
const db = require('./educators-edge-backend/db');

async function testSessionFlow() {
    console.log('🧪 Testing Session Flow...\n');

    try {
        // 1. Check session_requests
        console.log('1️⃣ Checking session_requests...');
        const requests = await db.query(`
            SELECT sr.id, sr.requester_id, sr.mentor_id, sr.status, sr.session_type,
                   student.username as student_username,
                   mentor.username as mentor_username
            FROM session_requests sr
            LEFT JOIN users student ON sr.requester_id = student.id
            LEFT JOIN users mentor ON sr.mentor_id = mentor.id
            ORDER BY sr.created_at DESC
            LIMIT 5
        `);
        console.log(`   Found ${requests.rows.length} session requests:`);
        requests.rows.forEach(r => {
            console.log(`   - ${r.student_username} → ${r.mentor_username} (${r.session_type}) - ${r.status}`);
        });

        // 2. Check sessions
        console.log('\n2️⃣ Checking sessions...');
        const sessions = await db.query(`
            SELECT s.id, s.student_id, s.mentor_id, s.status, s.session_type,
                   student.username as student_username,
                   mentor.username as mentor_username
            FROM sessions s
            LEFT JOIN users student ON s.student_id = student.id
            LEFT JOIN users mentor ON s.mentor_id = mentor.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);
        console.log(`   Found ${sessions.rows.length} sessions:`);
        sessions.rows.forEach(s => {
            console.log(`   - ${s.student_username} ↔ ${s.mentor_username} (${s.session_type}) - ${s.status}`);
        });

        // 3. Check if sessions have proper user mapping
        console.log('\n3️⃣ Testing user query for sessions...');
        const testUserId = '09b275f8-3aa1-49ed-9683-f4d26f1008d5'; // bilalhussain.v12

        const userSessions = await db.query(`
            SELECT s.*,
                   student.username as student_username,
                   student_profile.display_name as student_display_name,
                   mentor.username as mentor_username,
                   mentor_profile.display_name as mentor_display_name,
                   CASE
                       WHEN s.student_id = $1 THEN 'student'
                       WHEN s.mentor_id = $1 THEN 'mentor'
                   END as user_role_in_session
            FROM sessions s
            JOIN users student ON s.student_id = student.id
            LEFT JOIN user_profiles student_profile ON student.id = student_profile.user_id
            JOIN users mentor ON s.mentor_id = mentor.id
            LEFT JOIN user_profiles mentor_profile ON mentor.id = mentor_profile.user_id
            WHERE (s.student_id = $1 OR s.mentor_id = $1)
            ORDER BY s.scheduled_time DESC, s.created_at DESC
        `, [testUserId]);

        console.log(`   User ${testUserId} has ${userSessions.rows.length} sessions:`);
        userSessions.rows.forEach(s => {
            console.log(`   - Session #${s.id}: ${s.session_type} with ${s.user_role_in_session === 'student' ? s.mentor_username : s.student_username} (${s.status})`);
        });

        // 4. Check session_requests for the same user
        console.log('\n4️⃣ Testing user query for session requests...');
        const userRequests = await db.query(`
            (SELECT sr.*,
                    u.username as other_username,
                    up.display_name as other_display_name,
                    'incoming' as request_direction
             FROM session_requests sr
             JOIN users u ON sr.requester_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE sr.mentor_id = $1)
            UNION ALL
            (SELECT sr.*,
                    u.username as other_username,
                    up.display_name as other_display_name,
                    'outgoing' as request_direction
             FROM session_requests sr
             JOIN users u ON sr.mentor_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE sr.requester_id = $1)
            ORDER BY created_at DESC
        `, [testUserId]);

        console.log(`   User ${testUserId} has ${userRequests.rows.length} session requests:`);
        userRequests.rows.forEach(r => {
            console.log(`   - ${r.request_direction}: ${r.session_type} - ${r.status}`);
        });

        console.log('\n✅ Session flow test completed!');
        console.log('\n📊 Summary:');
        console.log(`   Total session_requests: ${requests.rows.length}`);
        console.log(`   Total sessions: ${sessions.rows.length}`);
        console.log(`   User's sessions: ${userSessions.rows.length}`);
        console.log(`   User's requests: ${userRequests.rows.length}`);

    } catch (error) {
        console.error('❌ Error testing session flow:', error);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testSessionFlow();
