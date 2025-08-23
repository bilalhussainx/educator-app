/**
 * @file stuckPointService.js
 * @description This version fixes a database error by adding explicit type
 * casting to UUIDs in the SQL queries.
 */
const db = require('../db');

/**
 * This is the AI analysis function you created.
 * It's included here directly for simplicity, but in a larger application,
 * you would import it from its own file.
 */
function analyzeSubmissionsForStuckPoint({ student_id, teacher_id, lesson_id, problem_id, submissions }) {
    const submission_window_minutes = 15; // Time window to analyze
    const max_attempts = 3; // Number of failures on the same test to trigger an alert

    const now = new Date();
    const windowStartTime = new Date(now.getTime() - submission_window_minutes * 60000);

    const recentSubmissions = submissions.filter(sub => {
        const submissionTime = new Date(sub.timestamp);
        return submissionTime >= windowStartTime && submissionTime <= now;
    });

    const failedTestCounts = new Map();
    for (const submission of recentSubmissions) {
        if (submission.failed_tests && Array.isArray(submission.failed_tests)) {
            for (const testName of submission.failed_tests) {
                failedTestCounts.set(testName, (failedTestCounts.get(testName) || 0) + 1);
            }
        }
    }

    for (const [testName, count] of failedTestCounts.entries()) {
        if (count >= max_attempts) {
            const studentFirstName = student_id.split('_')[1] || 'The student';
            const formattedStudentName = studentFirstName.charAt(0).toUpperCase() + studentFirstName.slice(1);
            const formattedTestName = testName.replace(/_/g, ' ');

            return {
                alert_type: "stuck_point",
                student_id,
                teacher_id,
                message: `${formattedStudentName} seems to be stuck on the edge case for ${formattedTestName} in the ${problem_id} problem.`,
                details: {
                    lesson_id,
                    problem_id,
                    stuck_on_test: testName,
                    attempts_on_test: count
                }
            };
        }
    }
    return null;
}


/**
 * --- REWRITTEN `findStuckPoints` ---
 * This service now uses the AI detector to find stuck points for all of a teacher's students.
 * @param {string} teacherId - The ID of the teacher.
 * @returns {Promise<Array>} - A promise that resolves to an array of teacher alerts.
 */
exports.findStuckPoints = async (teacherId) => {
    try {
        console.log(`[AI SERVICE LOG] Starting stuck point analysis for teacher_id: ${teacherId}`);
        const allAlerts = [];

        // 1. Get all lessons for this teacher
        // FIXED: Added ::uuid cast to the teacherId parameter
        const lessonsResult = await db.query('SELECT id, title AS problem_id FROM lessons WHERE teacher_id = $1::uuid', [teacherId]);
        const lessons = lessonsResult.rows;

        if (lessons.length === 0) {
            console.log('[AI SERVICE LOG] Teacher has no lessons. Skipping analysis.');
            return [];
        }

        const lessonIds = lessons.map(l => l.id);

        // 2. Get all recent, failed submissions for those lessons
        const submissionsQuery = `
            SELECT 
                student_id, 
                lesson_id, 
                run_at AS "timestamp", 
                failed_tests
            FROM test_runs 
            -- FIXED: Changed cast from ::text[] to ::uuid[] to match the likely column type
            WHERE lesson_id = ANY($1::uuid[]) 
              AND success = FALSE 
              AND run_at > NOW() - INTERVAL '1 day'
            ORDER BY student_id, lesson_id, run_at;
        `;
        const submissionsResult = await db.query(submissionsQuery, [lessonIds]);
        const allSubmissions = submissionsResult.rows;

        // 3. Group submissions by student and lesson
        const submissionsByStudentLesson = allSubmissions.reduce((acc, sub) => {
            const key = `${sub.student_id}|${sub.lesson_id}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push({
                timestamp: sub.timestamp,
                failed_tests: sub.failed_tests || []
            });
            return acc;
        }, {});

        // 4. Run the AI analyzer for each student/lesson combination
        for (const key in submissionsByStudentLesson) {
            const [student_id, lesson_id] = key.split('|');
            const lessonInfo = lessons.find(l => l.id === lesson_id);

            const analysisInput = {
                student_id,
                teacher_id: teacherId,
                lesson_id,
                problem_id: lessonInfo ? lessonInfo.problem_id : 'unknown problem',
                submissions: submissionsByStudentLesson[key]
            };

            const alert = analyzeSubmissionsForStuckPoint(analysisInput);
            if (alert) {
                allAlerts.push(alert);
            }
        }

        console.log(`[AI SERVICE LOG] Analysis complete. Found ${allAlerts.length} stuck point(s).`);
        return allAlerts;

    } catch (err) {
        console.error('[AI SERVICE LOG] Error in findStuckPoints:', err.message);
        return [];
    }
};
// MVP
// /**
//  * --- UPDATED: Analyzes test runs to find un-dismissed stuck points ---
//  * This version correctly counts only the failures that have occurred since the last dismissal.
//  */
// const db = require('../db');

// exports.findStuckPoints = async (teacherId) => {
//     try {
//         console.log(`[SERVICE LOG] findStuckPoints service called for teacher_id: ${teacherId}`);

//         const query = `
//             WITH latest_dismissal AS (
//                 SELECT
//                     student_id,
//                     lesson_id,
//                     MAX(dismissed_at) AS last_dismissal_time
//                 FROM stuck_point_dismissals
//                 WHERE teacher_id = $1
//                 GROUP BY student_id, lesson_id
//             ),
//             failures_since_dismissal AS (
//                 SELECT
//                     tr.student_id,
//                     tr.lesson_id,
//                     COUNT(*) as new_failure_count,
//                     MAX(tr.run_at) as last_failure_time
//                 FROM test_runs tr
//                 LEFT JOIN latest_dismissal ld ON ld.student_id::TEXT = tr.student_id::TEXT AND ld.lesson_id::TEXT = tr.lesson_id::TEXT
//                 WHERE
//                     tr.success = FALSE
//                     AND (ld.last_dismissal_time IS NULL OR tr.run_at > ld.last_dismissal_time)
//                 GROUP BY tr.student_id, tr.lesson_id
//             )
//             SELECT
//                 fsd.student_id,
//                 u.username AS student_username,
//                 fsd.lesson_id,
//                 l.title AS lesson_title,
//                 fsd.new_failure_count AS failure_count, -- Renaming for consistency with frontend
//                 fsd.last_failure_time
//             FROM failures_since_dismissal fsd
//             JOIN users u ON u.id::TEXT = fsd.student_id::TEXT
//             JOIN lessons l ON l.id::TEXT = fsd.lesson_id::TEXT
//             WHERE
//                 fsd.new_failure_count > 2
//                 AND l.teacher_id = $1
//             ORDER BY fsd.last_failure_time DESC;
//         `;

//         const { rows } = await db.query(query, [teacherId]);
        
//         console.log(`[SERVICE LOG] Database query for stuck points returned ${rows.length} row(s).`);
//         return rows;

//     } catch (err) {
//         console.error('[SERVICE LOG] Error in findStuckPoints:', err.message);
//         return [];
//     }
// };
// ______________________________________________________________________________
// exports.findStuckPoints = async (teacherId) => {
//     try {
//         console.log(`[SERVICE LOG] findStuckPoints service called for teacher_id: ${teacherId}`);

//         const query = `
//             WITH latest_dismissal AS (
//                 SELECT
//                     student_id,
//                     lesson_id,
//                     MAX(dismissed_at) AS last_dismissal_time
//                 FROM stuck_point_dismissals
//                 WHERE teacher_id = $1
//                 GROUP BY student_id, lesson_id
//             ),
//             failures_since_dismissal AS (
//                 SELECT
//                     tr.student_id,
//                     tr.lesson_id,
//                     COUNT(*) as new_failure_count,
//                     MAX(tr.run_at) as last_failure_time
//                 FROM test_runs tr
//                 LEFT JOIN latest_dismissal ld ON ld.student_id::TEXT = tr.student_id::TEXT AND ld.lesson_id::TEXT = tr.lesson_id::TEXT
//                 WHERE
//                     tr.success = FALSE
//                     AND (ld.last_dismissal_time IS NULL OR tr.run_at > ld.last_dismissal_time)
//                 GROUP BY tr.student_id, tr.lesson_id
//             )
//             SELECT
//                 fsd.student_id,
//                 u.username AS student_username,
//                 fsd.lesson_id,
//                 l.title AS lesson_title,
//                 fsd.new_failure_count AS failure_count, -- Renaming for consistency with frontend
//                 fsd.last_failure_time
//             FROM failures_since_dismissal fsd
//             JOIN users u ON u.id::TEXT = fsd.student_id::TEXT
//             JOIN lessons l ON l.id::TEXT = fsd.lesson_id::TEXT
//             WHERE
//                 fsd.new_failure_count > 2
//                 AND l.teacher_id = $1
//             ORDER BY fsd.last_failure_time DESC;
//         `;

//         const { rows } = await db.query(query, [teacherId]);
        
//         console.log(`[SERVICE LOG] Database query for stuck points returned ${rows.length} row(s).`);
//         return rows;

//     } catch (err) {
//         console.error('[SERVICE LOG] Error in findStuckPoints:', err.message);
//         return [];
//     }
// };
// // FILE: services/stuckPointService.js

// const db = require('../db');

// /**
//  * Analyzes test runs to find students who are repeatedly failing.
//  * @param {string} teacherId - The ID of the teacher to find stuck students for.
//  * @returns {Promise<Array>} - A promise that resolves to an array of stuck point alerts.
//  */
// exports.findStuckPoints = async (teacherId) => {
//     try {
//         console.log(`[SERVICE LOG] findStuckPoints service called for teacher_id: ${teacherId}`);

//         // UPDATED QUERY: This version adds explicit type casting (::TEXT) to the JOIN
//         // conditions to prevent silent failures due to data type mismatches (e.g., UUID vs TEXT).
//         const query = `
//             WITH failures AS (
//                 SELECT
//                     student_id,
//                     lesson_id,
//                     COUNT(*) as failure_count,
//                     MAX(run_at) as last_failure_time
//                 FROM test_runs
//                 WHERE success = FALSE
//                 GROUP BY student_id, lesson_id
//             )
//             SELECT
//                 f.student_id,
//                 u.username AS student_username,
//                 f.lesson_id,
//                 l.title AS lesson_title,
//                 f.failure_count,
//                 f.last_failure_time
//             FROM failures f
//             JOIN users u ON u.id::TEXT = f.student_id::TEXT
//             JOIN lessons l ON l.id::TEXT = f.lesson_id::TEXT
//             WHERE f.failure_count > 2 AND l.teacher_id = $1
//             ORDER BY f.last_failure_time DESC;
//         `;

//         const { rows } = await db.query(query, [teacherId]);
        
//         console.log(`[SERVICE LOG] Database query for stuck points returned ${rows.length} row(s).`);
//         if (rows.length > 0) {
//             console.log('[SERVICE LOG] Returned data:', JSON.stringify(rows, null, 2));
//         }

//         return rows;

//     } catch (err) {
//         console.error('[SERVICE LOG] Error in findStuckPoints:', err.message);
//         return [];
//     }
// };

// // =================================================================
// // FILE: services/stuckPointService.js (NEW)
// // =================================================================
// // DESCRIPTION: This service analyzes test run data to identify
// // students who may be stuck on a particular lesson.
// const db = require('../db');

// /**
//  * Analyzes recent test runs to find students who are repeatedly failing.
//  * @param {string} teacherId - The ID of the teacher to find stuck students for.
//  * @returns {Promise<Array>} - A promise that resolves to an array of stuck point alerts.
//  */
// exports.findStuckPoints = async (teacherId) => {
//     try {
//         // This query finds students who have failed a test run for the same lesson
//         // at least 3 times in the last 24 hours. This is a simple but effective heuristic.
//         const query = `
//             WITH recent_failures AS (
//                 SELECT
//                     student_id,
//                     lesson_id,
//                     COUNT(*) as failure_count,
//                     MAX(run_at) as last_failure_time
//                 FROM test_runs
//                 WHERE success = FALSE AND run_at > NOW() - INTERVAL '1 day'
//                 GROUP BY student_id, lesson_id
//             )
//             SELECT
//                 rf.student_id,
//                 u.username AS student_username,
//                 rf.lesson_id,
//                 l.title AS lesson_title,
//                 rf.failure_count,
//                 rf.last_failure_time
//             FROM recent_failures rf
//             JOIN users u ON u.id = rf.student_id
//             JOIN lessons l ON l.id = rf.lesson_id
//             WHERE rf.failure_count >= 3 AND l.teacher_id = $1
//             ORDER BY rf.last_failure_time DESC;
//         `;

//         const { rows } = await db.query(query, [teacherId]);
//         return rows;

//     } catch (err) {
//         console.error('Error finding stuck points:', err.message);
//         return []; // Return an empty array on error
//     }
// };