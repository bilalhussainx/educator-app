const db = require('./educators-edge-backend/db');

async function debugSessionRequest() {
    console.log('🔍 Debugging Session Request Issue...\n');

    try {
        // Get user IDs
        const student = await db.query('SELECT id, username, email FROM users WHERE email = $1', ['bilalhussain.v12@gmail.com']);
        const teacher = await db.query('SELECT id, username, email FROM users WHERE email = $1', ['bilalhussain.v1@gmail.com']);

        console.log('=== USER IDS ===');
        console.log('Student:', student.rows[0] || 'NOT FOUND');
        console.log('Teacher:', teacher.rows[0] || 'NOT FOUND');

        if (student.rows.length === 0 || teacher.rows.length === 0) {
            console.log('\n❌ User not found! Checking by username instead...');

            const studentByUsername = await db.query('SELECT id, username, email FROM users WHERE username LIKE $1', ['%bilalhussain.v12%']);
            const teacherByUsername = await db.query('SELECT id, username, email FROM users WHERE username LIKE $1', ['%bilalhussain.v1%']);

            console.log('\nFound by username:');
            console.log('Students:', studentByUsername.rows);
            console.log('Teachers:', teacherByUsername.rows);

            if (studentByUsername.rows.length === 0) {
                console.log('\n❌ No student found. Exiting.');
                process.exit(1);
            }

            if (teacherByUsername.rows.length === 0) {
                console.log('\n❌ No teacher found. Exiting.');
                process.exit(1);
            }
        }

        const studentId = student.rows[0]?.id || student.rows[0]?.id;
        const teacherId = teacher.rows[0]?.id || teacher.rows[0]?.id;

        console.log('\nUsing IDs:');
        console.log('Student ID:', studentId);
        console.log('Teacher ID:', teacherId);

        // Check recent session requests from this student to this teacher
        console.log('\n=== SESSION REQUESTS (Student → Teacher) ===');
        const specificRequests = await db.query(`
            SELECT sr.*,
                   requester.username as requester_username,
                   mentor.username as mentor_username
            FROM session_requests sr
            LEFT JOIN users requester ON sr.requester_id = requester.id
            LEFT JOIN users mentor ON sr.mentor_id = mentor.id
            WHERE sr.requester_id = $1 AND sr.mentor_id = $2
            ORDER BY sr.created_at DESC
            LIMIT 10
        `, [studentId, teacherId]);

        console.log(`Found ${specificRequests.rows.length} requests from student to teacher:`);
        specificRequests.rows.forEach(r => {
            console.log(`  - ID: ${r.id}`);
            console.log(`    From: ${r.requester_username} → To: ${r.mentor_username}`);
            console.log(`    Type: ${r.session_type} | Status: ${r.status}`);
            console.log(`    Created: ${r.created_at}`);
            console.log(`    Description: ${r.description?.substring(0, 50)}...`);
            console.log('');
        });

        // Check what the API would return for incoming requests to teacher
        console.log('=== WHAT TEACHER SEES (API Query) ===');
        const incomingQuery = await db.query(`
            SELECT sr.*,
                   u.username as student_username,
                   up.display_name as student_display_name
            FROM session_requests sr
            JOIN users u ON sr.requester_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE sr.mentor_id = $1
            ORDER BY sr.created_at DESC
            LIMIT 10
        `, [teacherId]);

        console.log(`Teacher should see ${incomingQuery.rows.length} incoming requests total`);
        console.log('\nFirst 5:');
        incomingQuery.rows.slice(0, 5).forEach(r => {
            console.log(`  - From: ${r.student_username} (${r.student_display_name || 'no display name'})`);
            console.log(`    Type: ${r.session_type} | Status: ${r.status}`);
            console.log(`    Created: ${r.created_at}`);
            console.log('');
        });

        // Check if requester_id column exists vs student_id
        console.log('=== TABLE SCHEMA CHECK ===');
        const schemaCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'session_requests'
            AND column_name IN ('requester_id', 'student_id', 'mentor_id')
        `);
        console.log('Columns in session_requests:', schemaCheck.rows.map(r => r.column_name));

    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

debugSessionRequest();
