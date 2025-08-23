// =================================================================
// FILE: controllers/studentController.js (UPDATED)
// =================================================================
const db = require('../db');

// Get all courses a student is enrolled in, along with their progress
exports.getEnrolledCourses = async (req, res) => {
    try {
        const studentId = req.user.id;
        const query = `
            SELECT 
                c.id,
                c.title,
                c.description,
                COUNT(DISTINCT l.id) AS lesson_count,
                COUNT(DISTINCT s.lesson_id) AS lessons_completed
            FROM courses c
            JOIN enrollments e ON c.id = e.course_id
            LEFT JOIN lessons l ON c.id = l.course_id
            LEFT JOIN submissions s ON l.id = s.lesson_id AND s.student_id = e.student_id
            WHERE e.student_id = $1
            GROUP BY c.id
            ORDER BY c.title;
        `;
        const enrolledCoursesResult = await db.query(query, [studentId]);
        const enrolledCourses = enrolledCoursesResult.rows.map(course => ({
            ...course,
            lesson_count: parseInt(course.lesson_count, 10) || 0,
            lessons_completed: parseInt(course.lessons_completed, 10) || 0,
        }));
        res.json(enrolledCourses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- NEW: Get a single enrolled course for the current student, with progress ---
exports.getEnrolledCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // 1. Verify enrollment first for security.
        const enrollmentCheck = await db.query(
            'SELECT * FROM enrollments WHERE course_id = $1 AND student_id = $2',
            [courseId, studentId]
        );

        if (enrollmentCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You are not enrolled in this course.' });
        }

        // 2. Fetch course details and the teacher's name.
        const courseQuery = `
            SELECT c.id, c.title, c.description, u.username AS teacher_name
            FROM courses c
            JOIN users u ON c.teacher_id = u.id
            WHERE c.id = $1;
        `;
        const courseResult = await db.query(courseQuery, [courseId]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found.' });
        }
        const course = courseResult.rows[0];

        // 3. Fetch all lessons for the course and check the completion status for the student.
        const lessonsQuery = `
            SELECT 
                l.id, 
                l.title, 
                l.description,
                EXISTS (
                    SELECT 1 
                    FROM submissions s 
                    WHERE s.lesson_id = l.id AND s.student_id = $1
                ) AS is_completed
            FROM lessons l
            WHERE l.course_id = $2
            ORDER BY l.created_at ASC;
        `;
        const lessonsResult = await db.query(lessonsQuery, [studentId, courseId]);
        const lessons = lessonsResult.rows;

        // 4. Combine and send the response.
        res.json({ ...course, lessons });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// // =================================================================
// // NEW FILE: controllers/studentController.js
// // =================================================================
// const db = require('../db');

// // Get all courses a student is enrolled in, along with their progress
// exports.getEnrolledCourses = async (req, res) => {
//     try {
//         const studentId = req.user.id;

//         // This query does the following:
//         // 1. Selects course details.
//         // 2. Counts the total number of lessons for each course.
//         // 3. Counts the number of unique lessons the student has submitted for in each course.
//         // 4. Joins enrollments, courses, lessons, and submissions tables.
//         // 5. Filters by the current student ID.
//         const query = `
//             SELECT 
//                 c.id,
//                 c.title,
//                 c.description,
//                 COUNT(DISTINCT l.id) AS lesson_count,
//                 COUNT(DISTINCT s.lesson_id) AS lessons_completed
//             FROM courses c
//             JOIN enrollments e ON c.id = e.course_id
//             LEFT JOIN lessons l ON c.id = l.course_id
//             LEFT JOIN submissions s ON l.id = s.lesson_id AND s.student_id = e.student_id
//             WHERE e.student_id = $1
//             GROUP BY c.id
//             ORDER BY c.title;
//         `;

//         const enrolledCoursesResult = await db.query(query, [studentId]);

//         const enrolledCourses = enrolledCoursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             lessons_completed: parseInt(course.lessons_completed, 10) || 0,
//         }));

//         res.json(enrolledCourses);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
