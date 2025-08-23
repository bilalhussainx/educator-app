// =================================================================
// FILE: controllers/courseController.js (UPDATED)
// =================================================================
const db = require('../db');

// --- Existing functions remain the same ---

// Get all courses for the authenticated teacher
exports.getAllCourses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const query = `
            SELECT 
                c.id, c.title, c.description, c.created_at, c.is_published,
                COUNT(DISTINCT l.id) AS lesson_count
            FROM courses c
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.teacher_id = $1
            GROUP BY c.id
            ORDER BY c.created_at DESC;
        `;
        const coursesResult = await db.query(query, [teacherId]);
        const courses = coursesResult.rows.map(course => ({
            ...course,
            lesson_count: parseInt(course.lesson_count, 10) || 0,
            student_count: 0 // Placeholder
        }));
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Create a new course
exports.createCourse = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required.' });
        }
        const newCourseResult = await db.query(
            'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
            [title, description, teacherId]
        );
        res.status(201).json(newCourseResult.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get a single course by ID (for the teacher managing it)
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;
        const courseResult = await db.query(
            'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
            [id, teacherId]
        );
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or you do not have permission to view it.' });
        }
        const course = courseResult.rows[0];
        const lessonsResult = await db.query(
            'SELECT id, title, description, created_at FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
            [id]
        );
        const lessons = lessonsResult.rows;
        res.json({ ...course, lessons });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get all published courses for the marketplace
exports.getDiscoverableCourses = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.title, 
                c.description, 
                u.username AS teacher_name
            FROM courses c
            JOIN users u ON c.teacher_id = u.id
            WHERE c.is_published = TRUE
            ORDER BY c.created_at DESC;
        `;
        const coursesResult = await db.query(query);
        res.json(coursesResult.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update a course's publication status
exports.updateCoursePublicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_published } = req.body;
        const teacherId = req.user.id;

        if (typeof is_published !== 'boolean') {
            return res.status(400).json({ error: 'is_published must be a boolean value.' });
        }

        const updatedCourseResult = await db.query(
            `UPDATE courses 
             SET is_published = $1 
             WHERE id = $2 AND teacher_id = $3 
             RETURNING *`,
            [is_published, id, teacherId]
        );

        if (updatedCourseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or you are not authorized to modify it.' });
        }

        res.json(updatedCourseResult.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get a single PUBLISHED course by ID for the landing page
exports.getPublicCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const courseResult = await db.query(
            `SELECT c.id, c.title, c.description, u.username AS teacher_name, c.is_published
             FROM courses c
             JOIN users u ON c.teacher_id = u.id
             WHERE c.id = $1 AND c.is_published = TRUE`,
            [courseId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Published course not found.' });
        }
        const course = courseResult.rows[0];
        const lessonsResult = await db.query(
            'SELECT id, title FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
            [courseId]
        );
        const lessons = lessonsResult.rows;
        res.json({ ...course, lessons });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- NEW: Enroll the current student in a course ---
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Check if the course exists and is published
        const courseResult = await db.query(
            'SELECT id FROM courses WHERE id = $1 AND is_published = TRUE',
            [courseId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or is not available for enrollment.' });
        }

        // Create the enrollment record
        const newEnrollmentResult = await db.query(
            'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *',
            [studentId, courseId]
        );

        res.status(201).json(newEnrollmentResult.rows[0]);

    } catch (err) {
        // Handle unique constraint violation (student already enrolled)
        if (err.code === '23505') {
            return res.status(409).json({ error: 'You are already enrolled in this course.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
// // =================================================================
// // FILE: controllers/courseController.js (UPDATED)
// // =================================================================
// const db = require('../db');

// // --- Existing functions (getAllCourses, createCourse, getCourseById, etc.) remain the same ---

// // Get all courses for the authenticated teacher
// exports.getAllCourses = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const query = `
//             SELECT 
//                 c.id, c.title, c.description, c.created_at, c.is_published,
//                 COUNT(DISTINCT l.id) AS lesson_count
//             FROM courses c
//             LEFT JOIN lessons l ON c.id = l.course_id
//             WHERE c.teacher_id = $1
//             GROUP BY c.id
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query, [teacherId]);
//         const courses = coursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             student_count: 0 // Placeholder
//         }));
//         res.json(courses);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Create a new course
// exports.createCourse = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const { title, description } = req.body;
//         if (!title) {
//             return res.status(400).json({ error: 'Title is required.' });
//         }
//         const newCourseResult = await db.query(
//             'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//             [title, description, teacherId]
//         );
//         res.status(201).json(newCourseResult.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single course by ID (for the teacher managing it)
// exports.getCourseById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const teacherId = req.user.id;
//         const courseResult = await db.query(
//             'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
//             [id, teacherId]
//         );
//         if (courseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you do not have permission to view it.' });
//         }
//         const course = courseResult.rows[0];
//         const lessonsResult = await db.query(
//             'SELECT id, title, description, created_at FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
//             [id]
//         );
//         const lessons = lessonsResult.rows;
//         res.json({ ...course, lessons });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get all published courses for the marketplace
// exports.getDiscoverableCourses = async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 c.id, 
//                 c.title, 
//                 c.description, 
//                 u.username AS teacher_name
//             FROM courses c
//             JOIN users u ON c.teacher_id = u.id
//             WHERE c.is_published = TRUE
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query);
//         res.json(coursesResult.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Update a course's publication status
// exports.updateCoursePublicationStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { is_published } = req.body;
//         const teacherId = req.user.id;

//         if (typeof is_published !== 'boolean') {
//             return res.status(400).json({ error: 'is_published must be a boolean value.' });
//         }

//         const updatedCourseResult = await db.query(
//             `UPDATE courses 
//              SET is_published = $1 
//              WHERE id = $2 AND teacher_id = $3 
//              RETURNING *`,
//             [is_published, id, teacherId]
//         );

//         if (updatedCourseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you are not authorized to modify it.' });
//         }

//         res.json(updatedCourseResult.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // --- NEW: Get a single PUBLISHED course by ID for the landing page ---
// exports.getPublicCourseById = async (req, res) => {
//     try {
//         const { courseId } = req.params;

//         // 1. Fetch the main course details, ensuring it's published.
//         // Join with the users table to get the teacher's name.
//         const courseResult = await db.query(
//             `SELECT c.id, c.title, c.description, u.username AS teacher_name, c.is_published
//              FROM courses c
//              JOIN users u ON c.teacher_id = u.id
//              WHERE c.id = $1 AND c.is_published = TRUE`,
//             [courseId]
//         );

//         if (courseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Published course not found.' });
//         }
//         const course = courseResult.rows[0];

//         // 2. Fetch all associated lesson titles for the syllabus.
//         const lessonsResult = await db.query(
//             'SELECT id, title FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
//             [courseId]
//         );
//         const lessons = lessonsResult.rows;

//         // 3. Combine them into a single response object.
//         res.json({ ...course, lessons });

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // =================================================================
// // FILE: controllers/courseController.js (UPDATED)
// // =================================================================
// const db = require('../db');

// // --- Existing functions (getAllCourses, createCourse, getCourseById) remain the same ---

// // Get all courses for the authenticated teacher
// exports.getAllCourses = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const query = `
//             SELECT 
//                 c.id, c.title, c.description, c.created_at, c.is_published,
//                 COUNT(DISTINCT l.id) AS lesson_count
//             FROM courses c
//             LEFT JOIN lessons l ON c.id = l.course_id
//             WHERE c.teacher_id = $1
//             GROUP BY c.id
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query, [teacherId]);
//         const courses = coursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             student_count: 0 // Placeholder
//         }));
//         res.json(courses);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Create a new course
// exports.createCourse = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const { title, description } = req.body;
//         if (!title) {
//             return res.status(400).json({ error: 'Title is required.' });
//         }
//         const newCourseResult = await db.query(
//             'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//             [title, description, teacherId]
//         );
//         res.status(201).json(newCourseResult.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single course by ID (for the teacher managing it)
// exports.getCourseById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const teacherId = req.user.id;
//         const courseResult = await db.query(
//             'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
//             [id, teacherId]
//         );
//         if (courseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you do not have permission to view it.' });
//         }
//         const course = courseResult.rows[0];
//         const lessonsResult = await db.query(
//             'SELECT id, title, description, created_at FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
//             [id]
//         );
//         const lessons = lessonsResult.rows;
//         res.json({ ...course, lessons });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get all published courses for the marketplace
// exports.getDiscoverableCourses = async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 c.id, 
//                 c.title, 
//                 c.description, 
//                 u.username AS teacher_name
//             FROM courses c
//             JOIN users u ON c.teacher_id = u.id
//             WHERE c.is_published = TRUE
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query);
//         res.json(coursesResult.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // --- NEW: Update a course's publication status ---
// exports.updateCoursePublicationStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { is_published } = req.body;
//         const teacherId = req.user.id;

//         if (typeof is_published !== 'boolean') {
//             return res.status(400).json({ error: 'is_published must be a boolean value.' });
//         }

//         const updatedCourseResult = await db.query(
//             `UPDATE courses 
//              SET is_published = $1 
//              WHERE id = $2 AND teacher_id = $3 
//              RETURNING *`,
//             [is_published, id, teacherId]
//         );

//         if (updatedCourseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you are not authorized to modify it.' });
//         }

//         res.json(updatedCourseResult.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // =================================================================
// // FILE: controllers/courseController.js (UPDATED)
// // =================================================================
// const db = require('../db');

// // Get all courses for the authenticated teacher
// exports.getAllCourses = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const query = `
//             SELECT 
//                 c.id, c.title, c.description, c.created_at,
//                 COUNT(DISTINCT l.id) AS lesson_count
//             FROM courses c
//             LEFT JOIN lessons l ON c.id = l.course_id
//             WHERE c.teacher_id = $1
//             GROUP BY c.id
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query, [teacherId]);
//         const courses = coursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             student_count: 0 // Placeholder
//         }));
//         res.json(courses);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Create a new course
// exports.createCourse = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const { title, description } = req.body;
//         if (!title) {
//             return res.status(400).json({ error: 'Title is required.' });
//         }
//         const newCourseResult = await db.query(
//             'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//             [title, description, teacherId]
//         );
//         res.status(201).json(newCourseResult.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single course by ID (for the teacher managing it)
// exports.getCourseById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const teacherId = req.user.id;
//         const courseResult = await db.query(
//             'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
//             [id, teacherId]
//         );
//         if (courseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you do not have permission to view it.' });
//         }
//         const course = courseResult.rows[0];
//         const lessonsResult = await db.query(
//             'SELECT id, title, description, created_at FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
//             [id]
//         );
//         const lessons = lessonsResult.rows;
//         res.json({ ...course, lessons });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // --- NEW: Get all published courses for the marketplace ---
// exports.getDiscoverableCourses = async (req, res) => {
//     try {
//         // This query fetches all published courses and joins with the users table
//         // to get the teacher's username.
//         const query = `
//             SELECT 
//                 c.id, 
//                 c.title, 
//                 c.description, 
//                 u.username AS teacher_name
//             FROM courses c
//             JOIN users u ON c.teacher_id = u.id
//             WHERE c.is_published = TRUE
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query);
        
//         // In the future, we can add lesson_count and student_count here as well.
//         res.json(coursesResult.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // =================================================================
// // FILE: controllers/courseController.js (UPDATED)
// // =================================================================
// const db = require('../db');

// // Get all courses for the authenticated teacher
// exports.getAllCourses = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const query = `
//             SELECT 
//                 c.id, c.title, c.description, c.created_at,
//                 COUNT(DISTINCT l.id) AS lesson_count
//             FROM courses c
//             LEFT JOIN lessons l ON c.id = l.course_id
//             WHERE c.teacher_id = $1
//             GROUP BY c.id
//             ORDER BY c.created_at DESC;
//         `;
//         const coursesResult = await db.query(query, [teacherId]);
//         const courses = coursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             student_count: 0 // Placeholder
//         }));
//         res.json(courses);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Create a new course
// exports.createCourse = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const { title, description } = req.body;
//         if (!title) {
//             return res.status(400).json({ error: 'Title is required.' });
//         }
//         const newCourseResult = await db.query(
//             'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//             [title, description, teacherId]
//         );
//         res.status(201).json(newCourseResult.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // --- NEW: Get a single course by ID, including its lessons ---
// exports.getCourseById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const teacherId = req.user.id;

//         // 1. Fetch the main course details, ensuring the teacher owns it.
//         const courseResult = await db.query(
//             'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
//             [id, teacherId]
//         );
//         if (courseResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Course not found or you do not have permission to view it.' });
//         }
//         const course = courseResult.rows[0];

//         // 2. Fetch all associated lessons for that course.
//         const lessonsResult = await db.query(
//             'SELECT id, title, description, created_at FROM lessons WHERE course_id = $1 ORDER BY created_at ASC',
//             [id]
//         );
//         const lessons = lessonsResult.rows;

//         // 3. Combine them into a single response object.
//         res.json({ ...course, lessons });

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // =================================================================
// // NEW FILE: controllers/courseController.js
// // =================================================================
// const db = require('../db');

// // Get all courses for the authenticated teacher, including student and lesson counts
// exports.getAllCourses = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
        
//         // This query fetches all courses for a teacher and calculates the number of
//         // lessons and unique students for each course.
//         const query = `
//             SELECT 
//                 c.id, 
//                 c.title, 
//                 c.description, 
//                 c.created_at,
//                 COUNT(DISTINCT l.id) AS lesson_count
//             FROM courses c
//             LEFT JOIN lessons l ON c.id = l.course_id
//             WHERE c.teacher_id = $1
//             GROUP BY c.id
//             ORDER BY c.created_at DESC;
//         `;
//         // NOTE: student_count will be added later when enrollments are implemented.
        
//         const coursesResult = await db.query(query, [teacherId]);
        
//         // Convert counts from string to integer
//         const courses = coursesResult.rows.map(course => ({
//             ...course,
//             lesson_count: parseInt(course.lesson_count, 10) || 0,
//             student_count: 0 // Placeholder for now
//         }));

//         res.json(courses);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Create a new course
// exports.createCourse = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const { title, description } = req.body;

//         if (!title) {
//             return res.status(400).json({ error: 'Title is required.' });
//         }

//         const newCourseResult = await db.query(
//             'INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//             [title, description, teacherId]
//         );

//         res.status(201).json(newCourseResult.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
