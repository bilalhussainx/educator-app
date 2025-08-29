// =================================================================
// FILE: controllers/courseController.js (UPDATED)
// =================================================================
const db = require('../db');
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini AI Configuration ---
// This should be placed at the top with other requires.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



// --- Helper function to reliably parse JSON from AI responses ---
function sanitizeAndParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') throw new Error("AI response is null or not a string.");
    const jsonRegex = /\[[\s\S]*\]/; // Specifically look for an array
    const match = rawText.match(jsonRegex);
    if (match && match[0]) {
        try { return JSON.parse(match[0]); } catch (e) {
            console.error("Failed to parse the extracted JSON array:", match[0]);
            throw new Error(`AI response contained malformed JSON. Details: ${e.message}`);
        }
    }
    console.error("DEBUG: AI Raw Response that failed sanitization:", rawText);
    throw new Error("No valid JSON array found in the AI response.");
}


// --- Existing functions from your file ---

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
            // IMPORTANT: Fetch lessons ordered by their order_index
            'SELECT id, title, description, order_index, lesson_type FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
            [id]
        );
        const lessons = lessonsResult.rows;
        res.json({ ...course, lessons });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- THIS IS THE NEW, FULLY IMPLEMENTED AI SORTER FUNCTION ---
/**
 * AI-powered controller to sort lessons within an existing course.
 */
exports.sortCourseLessonsWithAI = async (req, res) => {
    const { id: courseId } = req.params; // The route will be /:id/sort-with-ai
    const teacherId = req.user.id;

    console.log(`[AI Sorter] Received request to sort course ID: ${courseId}`);

    const client = await db.pool.connect();
    try {
        // 1. Verify the teacher owns this course for security
        const courseResult = await client.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
        if (courseResult.rows.length === 0 || courseResult.rows[0].teacher_id !== teacherId) {
            client.release();
            return res.status(403).json({ error: 'You are not authorized to modify this course.' });
        }

        // 2. Fetch all lessons for the given course
        const lessonsResult = await client.query(
            'SELECT id, title, description FROM lessons WHERE course_id = $1',
            [courseId]
        );
        const lessons = lessonsResult.rows;

        if (lessons.length < 2) {
            client.release();
            return res.status(400).json({ message: 'Course has fewer than 2 lessons. No sorting needed.' });
        }

        // 3. Ask Gemini for the precise order with a powerful prompt
        const prompt = `
            You are an expert JavaScript curriculum designer with a PhD in pedagogy.
            Your task is to re-order the following list of JavaScript lessons for a course to create the most effective and logical learning path, from easiest to most difficult.

            CRITICAL PRINCIPLES FOR ORDERING:
            1.  **Foundations First:** Lessons on basic syntax (variables, data types) MUST come before lessons on logic (loops, conditionals), which MUST come before lessons on functions and objects.
            2.  **Build Sequentially:** Ensure each lesson builds upon knowledge from the previous ones. For example, a lesson on '.map()' should come after a lesson on basic arrays.
            3.  **Simple to Complex:** Simple, single-concept lessons should come before complex, multi-concept projects (like 'Build a Palindrome Checker').

            Here is the list of JavaScript lessons to sort, each with its unique ID, title, and description:
            ${JSON.stringify(lessons, null, 2)}

            Your response MUST be ONLY a single, raw JSON array of the lesson IDs, in the new, correct order.
            Example Response: ["uuid-for-easiest-lesson", "uuid-for-next-lesson", "uuid-for-hardest-lesson"]
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const sortedIds = sanitizeAndParseJson(responseText);

        if (!Array.isArray(sortedIds) || sortedIds.length !== lessons.length) {
            throw new Error(`AI returned an invalid or incomplete list of sorted IDs.`);
        }

        // 4. Update the database with the new order in a single transaction
        await client.query('BEGIN');
        const updatePromises = sortedIds.map((lessonId, index) => {
            return client.query('UPDATE lessons SET order_index = $1 WHERE id = $2', [index, lessonId]);
        });
        await Promise.all(updatePromises);
        await client.query('COMMIT');
        
        console.log(`[AI Sorter] Successfully sorted ${sortedIds.length} lessons for course ${courseId}.`);
        res.status(200).json({ message: 'Course lessons have been successfully organized with AI.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[AI Sorter] FAILED to sort course ${courseId}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred while sorting the course.' });
    } finally {
        client.release();
    }
};
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

// --- NEW: Sort course lessons with AI ---
exports.sortCourseLessonsWithAI = async (req, res) => {
    try {
        const { courseId } = req.params;
        const teacherId = req.user.id;

        // Verify the teacher owns the course
        const courseResult = await db.query(
            'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
            [courseId, teacherId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or you do not have permission to modify it.' });
        }

        // For now, return a placeholder response
        // TODO: Implement AI sorting logic
        res.json({ message: 'AI sorting functionality coming soon' });

    } catch (err) {
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
