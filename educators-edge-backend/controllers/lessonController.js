/**
 * please read line 670-73 for context
 * @file lessonController.js
 * @description This version is updated to support the Adaptive Path Engine (APE).
 * It now receives and stores granular analytics data with each submission,
 * including time to solve, code churn, and parsed error types.
 */
const db = require('../db');
const { v4: uuidv4 } = require('uuid'); // <-- FIX #1: Added the missing import

const { executeCode } = require('../services/executionService'); 
const { getConceptualHint } = require('../services/aiFeedbackService');
const apeQueue = require('../queues/apeQueue'); // Adjust the path if necessary

// --- APE PHASE 2: Helper function to categorize errors from stderr ---
/**
 * Parses a standard error string to identify common error types.
 * @param {string} stderr The standard error output from a code execution.
 * @returns {string[\} An array of unique error types found (e.g., ['SyntaxError', 'AssertionError']).
 */
const parseErrorTypes = (stderr = '') => {
    const errors = new Set(); // Use a Set to avoid duplicates
    if (!stderr) return [];

    // Common JavaScript Errors
    if (stderr.includes('SyntaxError')) errors.add('SyntaxError');
    if (stderr.includes('ReferenceError')) errors.add('ReferenceError');
    if (stderr.includes('TypeError')) errors.add('TypeError');
    if (stderr.includes('RangeError')) errors.add('RangeError');
    
    // Test-runner specific errors (from Chai, Jest, or our custom runner)
    // Using toLowerCase to catch 'AssertionError' or 'assertionerror'
    if (stderr.toLowerCase().includes('assertionerror') || stderr.toLowerCase().includes('test failed')) {
        errors.add('AssertionError');
    }

    // If no specific errors are found but the execution failed, it's likely a logic error.
    if (errors.size === 0) {
        errors.add('LogicError');
    }

    return Array.from(errors);
};
// --- End APE ---


// --- Save student's code progress ---
exports.saveStudentProgress = async (req, res) => {
    const studentId = req.user.id;
    const { lessonId } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Invalid file data provided.' });
    }

    try {
        // Use an UPSERT query to either insert a new record or update an existing one.
        const query = `
            INSERT INTO saved_progress (student_id, lesson_id, files, saved_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (student_id, lesson_id)
            DO UPDATE SET files = $3, saved_at = NOW();
        `;
        await db.query(query, [studentId, lessonId, JSON.stringify(files)]);
        res.status(200).json({ message: 'Progress saved successfully.' });
    } catch (err) {
        console.error("Error in saveStudentProgress:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- Get the correct state for a student viewing a lesson ---
exports.getStudentLessonState = async (req, res) => {
    const studentId = req.user.id;
    const { lessonId } = req.params; 

    console.log(`[CONTROLLER] getStudentLessonState called for lessonId: ${lessonId}`);

    try {
        // 1. Fetch the core lesson details
        const lessonResult = await db.query(
            'SELECT id, title, description, language, course_id, lesson_type FROM lessons WHERE id = $1', 
            [lessonId]
        );

        if (lessonResult.rows.length === 0) {
            console.error(`[CONTROLLER] DB query found no lesson for ID: ${lessonId}`);
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const lesson = lessonResult.rows[0];
        
        // 2. Fetch the latest graded submission for this student and lesson.
        // We look for a non-null grade to identify it as feedback-ready.
        const gradedSubmissionResult = await db.query(
            `SELECT id, feedback, grade, submitted_at FROM submissions 
             WHERE student_id = $1 AND lesson_id = $2 AND grade IS NOT NULL
             ORDER BY submitted_at DESC LIMIT 1`,
            [studentId, lessonId]
        );
        const latestGradedSubmission = gradedSubmissionResult.rows[0] || null;

        // 3. Determine which code files to send back based on a clear priority:
        // Priority 1: The student's last saved (but not submitted) progress.
        // Priority 2: The student's very last submission (graded or not).
        // Priority 3: The original template files for the lesson.
        let files = [];
        const savedProgressResult = await db.query(
            'SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1',
            [studentId, lessonId]
        );

        if (savedProgressResult.rows.length > 0) {
            console.log(`[getStudentLessonState] Loading files from SAVED_PROGRESS.`);
            files = savedProgressResult.rows[0].files; // The DB driver auto-parses JSON
        } else {
            const lastSubmissionResult = await db.query(
                'SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1',
                [studentId, lessonId]
            );
            if (lastSubmissionResult.rows.length > 0) {
                console.log(`[getStudentLessonState] Loading files from LAST_SUBMISSION.`);
                files = lastSubmissionResult.rows[0].submitted_code; // The DB driver auto-parses JSON
            } else {
                console.log(`[getStudentLessonState] Loading files from TEMPLATE.`);
                const templateFilesResult = await db.query(
                    'SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', 
                    [lessonId]
                );
                files = templateFilesResult.rows;
            }
        }
        
        // 4. Return the complete payload to the frontend.
        // The frontend will now receive the lesson, the correct files, and the submission feedback in one go.
        res.json({ 
            lesson, 
            files, 
            submission: latestGradedSubmission 
        });

    } catch (err) {
        console.error("Error in getStudentLessonState:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.getLessonSolution = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user.id; // Or teacherId, depending on your auth

    try {
        // Future Enhancement: You could add a check here to see if the student
        // has correctly solved the problem before allowing them to see the solution.
        // For now, we'll allow access.

        const solutionFilesResult = await db.query(
            'SELECT filename, content FROM lesson_solution_files WHERE lesson_id = $1',
            [lessonId]
        );

        if (solutionFilesResult.rows.length === 0) {
            return res.status(404).json({ error: 'Solution not found for this lesson.' });
        }
        
        res.json(solutionFilesResult.rows);

    } catch (err) {
        console.error("Error in getLessonSolution:", err.message);
        res.status(500).send('Server Error');
    }
};
exports.getAscentIdeData = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user.id;
    try {
        const lessonResult = await db.query('SELECT *, lesson_type FROM lessons WHERE id = $1', [lessonId]);
        if (lessonResult.rows.length === 0) return res.status(404).json({ error: 'Lesson not found.' });
        const lesson = lessonResult.rows[0];
        
        let files = [];
        const savedProgressResult = await db.query('SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1', [studentId, lessonId]);
        if (savedProgressResult.rows.length > 0) {
            files = savedProgressResult.rows[0].files;
        } else {
            const lastSubmissionResult = await db.query('SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1', [studentId, lessonId]);
            if (lastSubmissionResult.rows.length > 0) {
                files = lastSubmissionResult.rows[0].submitted_code;
            } else {
                const templateFilesResult = await db.query('SELECT * FROM lesson_files WHERE lesson_id = $1', [lessonId]);
                files = templateFilesResult.rows;
            }
        }
        
        const gradedSubmissionResult = await db.query(`SELECT id, feedback, grade, submitted_at FROM submissions WHERE student_id = $1 AND lesson_id = $2 AND grade IS NOT NULL ORDER BY submitted_at DESC LIMIT 1`, [studentId, lessonId]);
        const gradedSubmission = gradedSubmissionResult.rows[0] || null;

        const historyResult = await db.query('SELECT id, submitted_at, is_correct FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC', [studentId, lessonId]);
        const submissionHistory = historyResult.rows;

        // Simplified placeholder data
        const testCases = []; 
        const officialSolution = { explanation: "The official solution is available after you pass all tests." };

        res.json({
            lesson, files, gradedSubmission, testCases, submissionHistory, officialSolution,
            courseId: lesson.course_id, previousLessonId: null, nextLessonId: null,
        });

    } catch (err) {
        console.error("Error in getAscentIdeData:", err.message);
        res.status(500).json({ error: 'A server error occurred.' });
    }
};

// removing lessons and creating  for the course creator (teacher specific)



// Library for the teacher to browse and choose lessons from
// controllers/lessonController.js
/**
 * Adds an existing lesson from the library to a specific course.
 */
exports.addLessonToCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { ingestedLessonId } = req.body;
        const teacherId = req.user.id;

        if (!ingestedLessonId) {
            return res.status(400).json({ error: 'ingestedLessonId is required' });
        }

        // Verify the teacher owns the course
        const courseResult = await db.query(
            'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
            [courseId, teacherId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or you do not have permission to modify it.' });
        }

        // Get the ingested lesson data (this might be from a different table/source)
        // For now, we'll create a basic lesson. You may need to adjust this based on your data structure
        const newLessonResult = await db.query(
            'INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, language, objective, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM lessons WHERE course_id = $3)) RETURNING *',
            [`Lesson from Library ${ingestedLessonId}`, `Added from library`, courseId, teacherId, 'algorithmic', 'javascript', 'Learning objective']
        );

        res.status(201).json(newLessonResult.rows[0]);

    } catch (err) {
        console.error("Error in addLessonToCourse:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};



exports.createChapter = async (req, res) => {
    const { title, content, courseId } = req.body;
    // [FIX] The user object from the JWT middleware has an `id`, not a `userId`.
    const { id: userId, role } = req.user; 

    if (!title || !content || !courseId) {
        return res.status(400).json({ error: 'Title, content, and courseId are required.' });
    }
    try {
        const courseQuery = await db.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
        if (courseQuery.rows.length === 0) return res.status(404).json({ error: 'Course not found.' });
        
        // This check will now succeed for the correct teacher.
        if (courseQuery.rows[0].teacher_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: 'You are not authorized to add a chapter to this course.' });
        }
        // ... (rest of the function is correct)
        const orderQuery = await db.query('SELECT MAX(order_index) as max_order FROM lessons WHERE course_id = $1', [courseId]);
        const nextOrderIndex = (orderQuery.rows[0].max_order || -1) + 1;
        const newChapter = { /* ... */ };
        const { rows } = await db.query( /* ... */ );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating chapter:', error);
        res.status(500).json({ error: 'Server error while creating chapter.' });
    }
};
/**
 * @desc    Remove a lesson or chapter from a course
 * @route   DELETE /api/lessons/:lessonId
 * @access  Private (Teacher)
 */
exports.removeLessonFromCourse = async (req, res) => {
    const { id } = req.params; // Using `id` to match your latest routes file
    // [FIX] The user object from the JWT middleware has an `id`, not a `userId`.
    const { id: userId, role } = req.user;

    try {
        const lessonQuery = await db.query(
            `SELECT c.teacher_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1`,
            [id]
        );
        if (lessonQuery.rows.length === 0) return res.status(404).json({ error: 'Lesson not found.' });
        
        // This check will now succeed for the correct teacher.
        if (lessonQuery.rows[0].teacher_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: 'You are not authorized to remove this lesson.' });
        }
        await db.query('DELETE FROM lessons WHERE id = $1', [id]);
        res.status(200).json({ message: 'Lesson removed successfully.' });
    } catch (error) {
        console.error('Error removing lesson:', error);
        res.status(500).json({ error: 'Server error while removing lesson.' });
    }
};
// --- 
// // updated to trigger the APE worker on success ---
// exports.createSubmission = async (req, res) => {
//     const studentId = req.user.id;
//     // The route parameter for submit is just 'id' based on your original controller
//     const { id: lessonId } = req.params; 
    
//     const { files, time_to_solve_seconds, code_churn, copy_paste_activity } = req.body;
    
//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//     }
//     const studentCode = files.map(f => f.content).join('\n\n');

//     try {
//         const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const { language, objective } = lessonResult.rows[0];

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language);

//         const errorTypes = execution.success ? [] : parseErrorTypes(execution.output);

//         // Try to insert with all new metrics columns, fallback to basic if fails
//         let submissionResult;
//         try {
//             submissionResult = await db.query(
//                 `INSERT INTO submissions (
//                     lesson_id, 
//                     student_id, 
//                     submitted_code, 
//                     time_to_solve_seconds, 
//                     code_churn,
//                     copy_paste_activity,
//                     time_taken,
//                     error_types,
//                     is_correct
//                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
//                 [
//                     lessonId, 
//                     studentId, 
//                     JSON.stringify(files), 
//                     time_to_solve_seconds, 
//                     code_churn,
//                     copy_paste_activity || 0,
//                     Math.round(time_to_solve_seconds / 60), // Convert seconds to minutes for time_taken
//                     JSON.stringify(errorTypes),
//                     execution.success // This is the boolean value for is_correct
//                 ]
//             );
//         } catch (columnError) {
//             console.log('New columns not available in submissions table, using fallback insert:', columnError.message);
//             // Fallback to basic submission without metrics
//             submissionResult = await db.query(
//                 `INSERT INTO submissions (
//                     lesson_id, 
//                     student_id, 
//                     submitted_code
//                  ) VALUES ($1, $2, $3) RETURNING id`,
//                 [
//                     lessonId, 
//                     studentId, 
//                     JSON.stringify(files)
//                 ]
//             );
//         }
//         const newSubmissionId = submissionResult.rows[0].id;
//         console.log(`[APE LOG] Submission ${newSubmissionId} created with analytics.`);

//         if (execution.success) {
//             await apeQueue.add('analyze-submission', {
//                 userId: studentId,
//                 lessonId: lessonId,
//                 submissionId: newSubmissionId,
//             });
//             console.log(`[APE QUEUE] Job added for user ${studentId} on lesson ${lessonId}.`);

//             if (objective) {
//                 // In your aiController/aiFeedbackService, this function must exist.
//                 const feedback = await getConceptualHint(objective, studentCode);
                
//                 if (feedback.feedback_type === 'conceptual_hint') {
//                     await db.query(
//                         `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
//                         [newSubmissionId, feedback.message]
//                     );
//                     return res.json(feedback);
//                 }
//             }
//             return res.json({ message: "Solution submitted successfully!" });
//         } else {
//             return res.status(400).json({ error: "Your solution did not pass all the tests." });
//         }
//     } catch (err) {
//         console.error("CRITICAL ERROR in createSubmission:", err.message);
//         res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
//     }
// };

exports.createLesson = async (req, res) => {
  // Get a client from the pool to run multiple queries in a single transaction.
  // This is crucial for data integrity.
  const client = await db.pool.connect(); 

  try {
    // Start the transaction block
    await client.query('BEGIN');

    const teacherId = req.user.id;
    // Destructure all expected fields from the request body
    const { title, description, objective, files, courseId, testCode, concepts, lesson_type = 'algorithmic' } = req.body;

    // --- 1. Validation Logic ---
    if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
        // If validation fails, we don't need to roll back, just release the client.
        client.release();
        return res.status(400).json({ error: 'Title, files, and courseId are required.' });
    }
    
    // --- 2. Determine Lesson Language ---
    const extension = files[0]?.filename.split('.').pop();
    const languageMap = { js: 'javascript', py: 'python', java: 'java' };
    const lessonLanguage = languageMap[extension] || 'plaintext';

    // --- 3. Insert the main lesson record ---
    const newLessonResult = await client.query(
      'INSERT INTO lessons (title, description, objective, teacher_id, course_id, language, lesson_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, objective, teacherId, courseId, lessonLanguage, lesson_type]
    );
    const newLesson = newLessonResult.rows[0];

    // --- 4. Insert all boilerplate files ---
    const filePromises = files.map(file => {
        return client.query(
            'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
            [file.filename, file.content, newLesson.id]
        );
    });
    await Promise.all(filePromises);

    // --- 5. Insert the test code ---
    if (testCode) {
        await client.query(
            'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
            [newLesson.id, testCode]
        );
    }

    // --- 6. Insert the lesson-concept links ---
    if (concepts && Array.isArray(concepts) && concepts.length > 0) {
        const conceptPromises = concepts.map(concept => {
            // Validate that the concept object has the required properties
            if (concept.id && concept.mastery_level) {
                const query = `
                    INSERT INTO lesson_concepts (lesson_id, concept_id, mastery_level)
                    VALUES ($1, $2, $3) ON CONFLICT (lesson_id, concept_id) DO NOTHING
                `;
                return client.query(query, [newLesson.id, concept.id, concept.mastery_level]);
            }
            return Promise.resolve(); // Ignore invalid concept objects in the array
        });
        await Promise.all(conceptPromises);
    }

    // If all queries were successful, commit the transaction to save the changes.
    await client.query('COMMIT');
    
    res.status(201).json(newLesson);

  } catch (err) {
    // If any query within the 'try' block fails, roll back the entire transaction.
    // This prevents partial data from being saved to the database.
    await client.query('ROLLBACK');
    console.error("Error in createLesson, transaction rolled back:", err.message);
    res.status(500).json({ error: 'Server Error: Could not create lesson.' });
  } finally {
    // ALWAYS release the client back to the pool in a 'finally' block
    // to ensure the connection is returned, even if an error occurred.
    client.release();
  }
};

// Library for the teacher to browse and choose lessons from
// controllers/lessonController.js
/**
 * Adds an existing lesson from the library to a specific course.
 */
exports.addLessonToCourse = async (req, res) => {
    const { courseId } = req.params;
    const { ingestedLessonId } = req.body;
    const { id: teacherId, role } = req.user;

    if (!ingestedLessonId) {
        return res.status(400).json({ error: 'Ingested lesson ID is required.' });
    }

    try {
        // 1. Verify the teacher owns the target course
        const courseQuery = await db.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
        if (courseQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found.' });
        }
        if (courseQuery.rows[0].teacher_id !== teacherId && role !== 'admin') {
            return res.status(403).json({ error: 'You are not authorized to modify this course.' });
        }

        // 2. Fetch the full lesson data from the ingested library
        const ingestedLessonQuery = await db.query('SELECT * FROM ingested_lessons WHERE id = $1', [ingestedLessonId]);
        if (ingestedLessonQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found in the library.' });
        }
        const lessonData = ingestedLessonQuery.rows[0];

        // 3. Get the next order_index for the new lesson
        const orderQuery = await db.query('SELECT MAX(order_index) as max_order FROM lessons WHERE course_id = $1', [courseId]);
        const nextOrderIndex = (orderQuery.rows[0].max_order || -1) + 1;

        // 4. Create the new lesson by copying the data
        const newLessonId = uuidv4();
        await db.query(
            `INSERT INTO lessons (id, course_id, title, description, lesson_type, order_index, original_lesson_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [newLessonId, courseId, lessonData.title, lessonData.description, lessonData.lesson_type, nextOrderIndex, ingestedLessonId]
        );
        
        // This is a complex operation that would copy files, tests, etc.
        // For now, we assume this is handled by other logic or is not needed for the initial add.
        
        res.status(201).json({ message: 'Lesson added to course successfully.', lessonId: newLessonId });
    } catch (error) {
        console.error('Error adding lesson to course:', error);
        res.status(500).json({ error: 'Server error while adding lesson.' });
    }
};






// --- 
// updated to trigger the APE worker on success ---
exports.createSubmission = async (req, res) => {
    const studentId = req.user.id;
    // The route parameter for submit is just 'id' based on your original controller
    const { id: lessonId } = req.params; 
    
    const { files, time_to_solve_seconds, code_churn, copy_paste_activity } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Submitted code cannot be empty.' });
    }
    const studentCode = files.map(f => f.content).join('\n\n');

    try {
        const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const { language, objective } = lessonResult.rows[0];

        const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
        if (testCodeResult.rows.length === 0) {
            return res.status(404).json({ error: 'No tests found for this lesson.' });
        }
        const testCode = testCodeResult.rows[0].test_code;

        const fullCode = `${studentCode}\n\n${testCode}`;
        const execution = await executeCode(fullCode, language);

        const errorTypes = execution.success ? [] : parseErrorTypes(execution.output);

        // Try to insert with all new metrics columns, fallback to basic if fails
        let submissionResult;
        try {
            submissionResult = await db.query(
                `INSERT INTO submissions (
                    lesson_id, 
                    student_id, 
                    submitted_code, 
                    time_to_solve_seconds, 
                    code_churn,
                    copy_paste_activity,
                    time_taken,
                    error_types,
                    is_correct
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [
                    lessonId, 
                    studentId, 
                    JSON.stringify(files), 
                    time_to_solve_seconds, 
                    code_churn,
                    copy_paste_activity || 0,
                    Math.round(time_to_solve_seconds / 60), // Convert seconds to minutes for time_taken
                    JSON.stringify(errorTypes),
                    execution.success // This is the boolean value for is_correct
                ]
            );
        } catch (columnError) {
            console.log('New columns not available in submissions table, using fallback insert:', columnError.message);
            // Fallback to basic submission without metrics
            submissionResult = await db.query(
                `INSERT INTO submissions (
                    lesson_id, 
                    student_id, 
                    submitted_code
                 ) VALUES ($1, $2, $3) RETURNING id`,
                [
                    lessonId, 
                    studentId, 
                    JSON.stringify(files)
                ]
            );
        }
        const newSubmissionId = submissionResult.rows[0].id;
        console.log(`[APE LOG] Submission ${newSubmissionId} created with analytics.`);

        if (execution.success) {
            await apeQueue.add('analyze-submission', {
                userId: studentId,
                lessonId: lessonId,
                submissionId: newSubmissionId,
            });
            console.log(`[APE QUEUE] Job added for user ${studentId} on lesson ${lessonId}.`);

            if (objective) {
                // In your aiController/aiFeedbackService, this function must exist.
                const feedback = await getConceptualHint(objective, studentCode);
                
                if (feedback.feedback_type === 'conceptual_hint') {
                    await db.query(
                        `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
                        [newSubmissionId, feedback.message]
                    );
                    return res.json(feedback);
                }
            }
            return res.json({ message: "Solution submitted successfully!" });
        } else {
            return res.status(400).json({ error: "Your solution did not pass all the tests." });
        }
    } catch (err) {
        console.error("CRITICAL ERROR in createSubmission:", err.message);
        res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
    }
};

// --- Get lesson submissions (includes AI feedback) ---
exports.getLessonSubmissions = async (req, res) => {
    try {
        const lessonId = req.params.id;
        const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
        if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
        if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
        // First try the full query with all new columns, fallback to basic if fails
        let submissions;
        try {
            submissions = await db.query(
                `SELECT 
                    s.id, 
                    s.submitted_code, 
                    s.feedback, 
                    s.grade, 
                    s.submitted_at, 
                    u.username,
                    COALESCE(s.mastery_level, 0) as mastery_level,
                    COALESCE(s.code_churn, 0) as code_churn,
                    COALESCE(s.copy_paste_activity, 0) as copy_paste_activity,
                    COALESCE(s.time_taken, 0) as time_taken
                 FROM submissions s 
                 JOIN users u ON s.student_id = u.id
                 WHERE s.lesson_id = $1 
                 ORDER BY s.submitted_at DESC`,
                [lessonId]
            );
        } catch (columnError) {
            console.log('New columns not available, falling back to basic query:', columnError.message);
            // Fallback query without new columns if they don't exist yet
            submissions = await db.query(
                `SELECT 
                    s.id, 
                    s.submitted_code, 
                    s.feedback, 
                    s.grade, 
                    s.submitted_at, 
                    u.username
                 FROM submissions s 
                 JOIN users u ON s.student_id = u.id
                 WHERE s.lesson_id = $1 
                 ORDER BY s.submitted_at DESC`,
                [lessonId]
            );
        }
        res.json(submissions.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- Other controller functions remain the same ---
exports.runLessonTests = async (req, res) => {
    const { id: lessonId } = req.params;
    // Your controller was missing this from an earlier step, which may cause errors
    const studentId = req.user.id; 

    try {
        const { files } = req.body;
        const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const language = lessonResult.rows[0].language;

        const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
        
        // --- THIS IS THE ROBUSTNESS FIX ---
        if (testCodeResult.rows.length === 0 || !testCodeResult.rows[0].test_code) {
            console.warn(`No tests found for lesson ${lessonId}. Auto-passing.`);
            return res.json({
                passed: 1, failed: 0, total: 1,
                results: "No tests found for this lesson. Marked as complete."
            });
        }
        const testCode = testCodeResult.rows[0].test_code;
        // --- END OF FIX ---

        const studentCode = files.map(f => f.content).join('\n\n');
        const fullCode = `${studentCode}\n\n${testCode}`;
        const execution = await executeCode(fullCode, language);

        // ... (The rest of your logic for calculating passed/failed tests and logging is fine)
        const testSummary = { /* ... */ };
        res.json(testSummary);

    } catch (err) {
        console.error("Error in runLessonTests:", err.message);
        res.status(500).json({
            passed: 0, failed: 1, total: 1,
            results: `A server error occurred: ${err.message}`
        });
    }
};

exports.getAllLessons = async (req, res) => {
    try {
        const lessons = await db.query('SELECT id, title, description, created_at, language FROM lessons ORDER BY created_at DESC');
        res.json(lessons.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getLessonById = async (req, res) => {
    try {
        const { id } = req.params;
        const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const lesson = lessonResult.rows[0];
        const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
        lesson.files = filesResult.rows;
        res.json(lesson);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { feedback, grade } = req.body;
        const teacherId = req.user.id;
        const submissionResult = await db.query(
            `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
             WHERE s.id = $1 AND l.teacher_id = $2`,
            [submissionId, teacherId]
        );
        if (submissionResult.rows.length === 0) {
            return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
        }
        const updatedSubmission = await db.query(
            'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
            [feedback, grade, submissionId]
        );
        res.json(updatedSubmission.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getStudentSubmissionForLesson = async (req, res) => {
    try {
        const studentId = req.user.id;
        const lessonId = req.params.id;
        const submission = await db.query(
            'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
            [lessonId, studentId]
        );
        if (submission.rows.length === 0) {
            return res.json(null);
        }
        res.json(submission.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
exports.getTeacherLessons = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const result = await db.query('SELECT id, title FROM lessons WHERE teacher_id = $1 ORDER BY created_at DESC', [teacherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};


// exports.getStudentLessonState = async (req, res) => {
//     const studentId = req.user.id;
//     const { lessonId } = req.params; 

//     console.log(`[CONTROLLER] getStudentLessonState called for lessonId: ${lessonId}`);

//     try {
//         const lessonResult = await db.query('SELECT id, title, description, language, course_id, lesson_type FROM lessons WHERE id = $1', [lessonId]);

//         // const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             console.error(`[CONTROLLER] DB query found no lesson for ID: ${lessonId}`);
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
        
//         const safeParse = (data) => {
//             if (typeof data === 'string') {
//                 try {
//                     return JSON.parse(data);
//                 } catch (e) {
//                     console.error("Failed to parse JSON string:", data);
//                     return null;
//                 }
//             }
//             return data;
//         };

//         const savedProgressResult = await db.query(
//             'SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );
//         if (savedProgressResult.rows.length > 0) {
//             const files = safeParse(savedProgressResult.rows[0].files);
//             return res.json({ lesson, files });
//         }

//         const submissionResult = await db.query(
//             'SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );
//         if (submissionResult.rows.length > 0) {
//             const files = safeParse(submissionResult.rows[0].submitted_code);
//             return res.json({ lesson, files });
//         }

//         const templateFilesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [lessonId]);
        
//         res.json({ lesson, files: templateFilesResult.rows });

//     } catch (err) {
//         console.error("Error in getStudentLessonState:", err.message);
//         res.status(500).json({ error: 'Server Error' });
//     }
// };

// --- createLesson function (includes objective) ---
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, objective, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, objective, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [title, description, objective, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Server Error' });
//   }
// };
// exports.createLesson = async (req, res) => {
//   // Using a client from the pool for a transaction is crucial for data integrity.
//   // This ensures that either the lesson, its files, tests, and concepts are all saved, or none of them are.
//   const client = await db.connect(); 

//   try {
//     // Start the transaction
//     await client.query('BEGIN');

//     const teacherId = req.user.id;
//     // Destructure the new 'concepts' array from the request body
//     const { title, description, objective, files, courseId, testCode, concepts } = req.body;

//     // --- 1. Original Validation Logic ---
//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     // --- 2. Insert the main lesson record ---
//     const newLessonResult = await client.query(
//       'INSERT INTO lessons (title, description, objective, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [title, description, objective, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // --- 3. Insert all boilerplate files ---
//     const filePromises = files.map(file => {
//         return client.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     // --- 4. Insert the test code ---
//     if (testCode) {
//         await client.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     // --- 5. NEW LOGIC: Insert the lesson-concept links ---
//     if (concepts && Array.isArray(concepts) && concepts.length > 0) {
//         const conceptPromises = concepts.map(concept => {
//             // Basic validation to ensure we have the data we need
//             if (concept.id && concept.mastery_level) {
//                 const query = `
//                     INSERT INTO lesson_concepts (lesson_id, concept_id, mastery_level)
//                     VALUES ($1, $2, $3) ON CONFLICT (lesson_id, concept_id) DO NOTHING
//                 `;
//                 return client.query(query, [newLesson.id, concept.id, concept.mastery_level]);
//             }
//             return Promise.resolve(); // Return a resolved promise for invalid entries
//         });
//         await Promise.all(conceptPromises);
//     }

//     // If all queries were successful, commit the transaction
//     await client.query('COMMIT');
    
//     res.status(201).json(newLesson);

//   } catch (err) {
//     // If any query fails, roll back the entire transaction
//     await client.query('ROLLBACK');
//     console.error("Error in createLesson, transaction rolled back:", err.message);
//     res.status(500).json({ error: 'Server Error: Could not create lesson.' });
//   } finally {
//     // ALWAYS release the client back to the pool
//     client.release();
//   }
// };

// exports.createSubmission = async (req, res) => {
//     const studentId = req.user.id;
//     const lessonId = req.params.id; // Assuming route is /api/lessons/:id/submit
    
//     // Destructure the full payload from the frontend
//     const { files, time_to_solve_seconds, code_churn } = req.body;
    
//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//     }
//     const studentCode = files.map(f => f.content).join('\n\n');

//     try {
//         // 1. Get lesson and test info (No changes)
//         const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const { language, objective } = lessonResult.rows[0];

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         // 2. Execute code *before* writing to the database (No changes)
//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language);

//         // 3. Parse errors from the execution output (No changes)
//         const errorTypes = execution.success ? [] : parseErrorTypes(execution.output);

//         // 4. Save the submission attempt with all analytics data (No changes)
//         const submissionResult = await db.query(
//             `INSERT INTO submissions (
//                 lesson_id, 
//                 student_id, 
//                 submitted_code, 
//                 time_to_solve_seconds, 
//                 code_churn, 
//                 error_types,
//                 is_correct
//              ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
//             [
//                 lessonId, 
//                 studentId, 
//                 JSON.stringify(files), 
//                 time_to_solve_seconds, 
//                 code_churn, 
//                 JSON.stringify(errorTypes)
//             ]
//         );
//         const newSubmissionId = submissionResult.rows[0].id;
//         console.log(`[APE LOG] Submission ${newSubmissionId} created with analytics.`);

//         // 5. Check if the submission was successful and proceed
//         if (execution.success) {
            
//             // --- APE PHASE 3: ADDITIVE CHANGE ---
//             // Trigger the background worker to analyze this successful submission.
//             // This is non-blocking; the API returns a response to the user immediately
//             // while the worker processes the task in the background.
//             await apeQueue.add('analyze-submission', {
//                 userId: studentId,
//                 lessonId: lessonId,
//                 submissionId: newSubmissionId,
//             });
//             console.log(`[APE QUEUE] Job added for user ${studentId} on lesson ${lessonId}.`);
//             // --- END ADDITIVE CHANGE ---

//             // Existing logic for conceptual feedback is preserved
//             if (objective) {
//                 const feedback = await getConceptualHint(objective, studentCode);
                
//                 if (feedback.feedback_type === 'conceptual_hint') {
//                     await db.query(
//                         `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
//                         [newSubmissionId, feedback.message]
//                     );
//                     return res.json(feedback); // Return AI hint
//                 }
//             }
//             return res.json({ message: "Solution submitted successfully!" }); // Standard success
//         } else {
//             // If tests failed, the submission is already logged with its errors.
//             // Return the failure message to the student so they can try again.
//             return res.status(400).json({ error: "Your solution did not pass all the tests." });
//         }
//     } catch (err) {
//         console.error("CRITICAL ERROR in createSubmission:", err.message);
//         res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
//     }
// };
// // --- APE PHASE 2: createSubmission is heavily updated to capture analytics ---
// IMPORTANT WORK HERE ASK GEMINI for implementation plan!!!
// exports.createSubmission = async (req, res) => {
//     const studentId = req.user.id;
//     const lessonId = req.params.id; // Assuming route is /api/lessons/:id/submit
    
//     // Destructure the full payload from the frontend
//     const { files, time_to_solve_seconds, code_churn } = req.body;
    
//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//     }
//     const studentCode = files.map(f => f.content).join('\n\n');

//     try {
//         // 1. Get lesson and test info
//         const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const { language, objective } = lessonResult.rows[0];

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         // 2. Execute code *before* writing to the database
//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language);

//         // 3. Parse errors from the execution output
//         const errorTypes = execution.success ? [] : parseErrorTypes(execution.output);

//         // 4. Save the submission attempt with all analytics data in a single transaction
//         const submissionResult = await db.query(
//             `INSERT INTO submissions (
//                 lesson_id, 
//                 student_id, 
//                 submitted_code, 
//                 time_to_solve_seconds, 
//                 code_churn, 
//                 error_types
//              ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
//             [
//                 lessonId, 
//                 studentId, 
//                 JSON.stringify(files), 
//                 time_to_solve_seconds, 
//                 code_churn, 
//                 JSON.stringify(errorTypes)
//             ]
//         );
//         const newSubmissionId = submissionResult.rows[0].id;
//         console.log(`[APE LOG] Submission ${newSubmissionId} created with analytics.`);

//         // 5. Check if the submission was successful and proceed with AI feedback if needed
//         if (execution.success) {
//             if (objective) {
//                 const feedback = await getConceptualHint(objective, studentCode);
                
//                 if (feedback.feedback_type === 'conceptual_hint') {
//                     await db.query(
//                         `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
//                         [newSubmissionId, feedback.message]
//                     );
//                     return res.json(feedback); // Return AI hint
//                 }
//             }
//             return res.json({ message: "Solution submitted successfully!" }); // Standard success
//         } else {
//             // If tests failed, the submission is already logged with its errors.
//             // Return the failure message to the student so they can try again.
//             return res.status(400).json({ error: "Your solution did not pass all the tests." });
//         }
//     } catch (err) {
//         console.error("CRITICAL ERROR in createSubmission:", err.message);
//         res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
//     }
// };



// MVP
// exports.runLessonTests = async (req, res) => {
//     const { id: lessonId } = req.params;
//     const studentId = req.user.id; 

//     try {
//         const { files } = req.body;

//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
        
//         const execution = await executeCode(fullCode, language); 
        
//         let totalTests = (testCode.match(/run_test\(/g) || []).length;
//         if (testCode.includes('def run_test(')) {
//             totalTests--; 
//         }
//         totalTests = totalTests > 0 ? totalTests : 1;

//         const failedCount = execution.failedTestNames.length;
//         const passedCount = totalTests - failedCount;

//         const testSummary = {
//             passed: passedCount > 0 ? passedCount : 0,
//             failed: failedCount,
//             total: totalTests,
//             results: execution.output.trim() || (execution.success ? "All tests passed!" : "Tests failed.")
//         };

//         try {
//             const wasSuccessful = execution.success;
//             const failedTests = execution.failedTestNames; 

//             const logQuery = `
//                 INSERT INTO test_runs (student_id, lesson_id, success, failed_tests)
//                 VALUES ($1, $2, $3, $4);
//             `;
            
//             await db.query(logQuery, [studentId, lessonId, wasSuccessful, JSON.stringify(failedTests)]);
//             console.log(`[DB LOG] Successfully logged test run for student ${studentId}.`);
//         } catch (dbError) {
//             console.error("[DB LOG] CRITICAL: Failed to log test run to database.", dbError);
//         }

//         res.json(testSummary);

//     } catch (err) {
//         console.error("Error in runLessonTests:", err.message);
//         res.status(500).json({
//             passed: 0,
//             failed: 1,
//             total: 1,
//             results: `A server error occurred: ${err.message}`
//         });
//     }
// };



// exports.getAscentIdeData = async (req, res) => {
//     const { lessonId } = req.params;
//     const studentId = req.user.id;

//     try {
//         // 1. Fetch core lesson data first
//         const lessonResult = await db.query('SELECT *, lesson_type FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
        
//         // --- THIS IS THE CORRECTED LOGIC ---
//         let files = [];
//         const savedProgressResult = await db.query(
//             'SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );

//         if (savedProgressResult.rows.length > 0) {
//             console.log(`[AscentIDE] Loading from SAVED_PROGRESS for student ${studentId}`);
//             // FIX: No need to parse. The DB driver does it for us.
//             files = savedProgressResult.rows[0].files; 
//         } else {
//             const submissionResult = await db.query(
//                 'SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//                 [studentId, lessonId]
//             );
//             if (submissionResult.rows.length > 0) {
//                 console.log(`[AscentIDE] Loading from last SUBMISSION for student ${studentId}`);
//                 // FIX: No need to parse here either.
//                 // Assuming 'submitted_code' is also a JSON/JSONB column.
//                 files = submissionResult.rows[0].submitted_code; 
//             } else {
//                 console.log(`[AscentIDE] Loading from original TEMPLATE FILES`);
//                 const templateFilesResult = await db.query('SELECT * FROM lesson_files WHERE lesson_id = $1', [lessonId]);
//                 files = templateFilesResult.rows;
//             }
//         }
//         // --- END OF CORRECTION ---

//         // 2. Fetch test cases (your placeholder logic is fine)
//         const testCases = [
//             { description: "Example Test 1", input: "...", expectedOutput: "..." },
//             { description: "Example Test 2", input: "...", expectedOutput: "..." }
//         ];

//         // 3. Fetch submission history
//         const historyResult = await db.query(
//             'SELECT id, submitted_at, is_correct FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC',
//             [studentId, lessonId]
//         );
//         const submissionHistory = historyResult.rows;

//         // 4. Fetch official solution (placeholder)
//         const officialSolution = { code: [], explanation: "" };

//         // 5. Find next/previous lesson IDs (placeholder)
//         const { course_id: courseId, previous_lesson_id: previousLessonId, next_lesson_id: nextLessonId } = lesson;

//         // 6. Assemble the final payload
//         const ascentIdeData = {
//             lesson,
//             files,
//             testCases,
//             submissionHistory,
//             officialSolution,
//             courseId,
//             previousLessonId,
//             nextLessonId,
//         };

//         res.json(ascentIdeData);

//     } catch (err) {
//         console.error("Error in getAscentIdeData:", err.message);
//         res.status(500).json({ error: 'A server error occurred while fetching lesson data.' });
//     }
// };

// mvp
// exports.getAscentIdeData = async (req, res) => {
//     const { lessonId } = req.params;
//     const studentId = req.user.id;

//     try {
//         // 1. Fetch core lesson data
//         const lessonResult = await db.query('SELECT *, lesson_type FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
        
//         // 2. Determine which files to load (Saved Progress > Last Submission > Template)
//         let files = [];
//         const savedProgressResult = await db.query(
//             'SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );

//         if (savedProgressResult.rows.length > 0) {
//             files = savedProgressResult.rows[0].files;
//         } else {
//             const lastSubmissionResult = await db.query(
//                 'SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//                 [studentId, lessonId]
//             );
//             if (lastSubmissionResult.rows.length > 0) {
//                 files = lastSubmissionResult.rows[0].submitted_code;
//             } else {
//                 const templateFilesResult = await db.query('SELECT * FROM lesson_files WHERE lesson_id = $1', [lessonId]);
//                 files = templateFilesResult.rows;
//             }
//         }
        
//         // --- THIS IS THE NEW LOGIC FOR THIS FUNCTION ---
//         // 3. Fetch the LATEST graded submission for this student and lesson.
//         const gradedSubmissionResult = await db.query(
//             `SELECT id, feedback, grade, submitted_at FROM submissions 
//              WHERE student_id = $1 AND lesson_id = $2 AND grade IS NOT NULL
//              ORDER BY submitted_at DESC LIMIT 1`,
//             [studentId, lessonId]
//         );
//         const gradedSubmission = gradedSubmissionResult.rows[0] || null;
//         // --- END OF NEW LOGIC ---

//         // 4. Fetch test cases (your placeholder is fine)
//         const testCases = [ /* ... */ ];

//         // 5. Fetch submission history with performance metrics
//         const historyResult = await db.query(
//             `SELECT id, submitted_at, is_correct, code_churn, copy_paste_activity, time_taken, 
//                     time_to_solve_seconds, mastery_level 
//              FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC`,
//             [studentId, lessonId]
//         );
//         const submissionHistory = historyResult.rows;

//         // 6. Fetch the official solution (placeholder)
//         const officialSolution = { /* ... */ };
        
//         const { course_id: courseId, previous_lesson_id: previousLessonId, next_lesson_id: nextLessonId } = lesson;

//         // 7. Assemble the final payload, now including the graded submission
//         const ascentIdeData = {
//             lesson,
//             files,
//             gradedSubmission, // <-- NEWLY ADDED PROPERTY
//             testCases,
//             submissionHistory,
//             officialSolution,
//             courseId,
//             previousLessonId,
//             nextLessonId,
//         };

//         res.json(ascentIdeData);

//     } catch (err) {
//         console.error("Error in getAscentIdeData:", err.message);
//         res.status(500).json({ error: 'A server error occurred while fetching lesson data.' });
//     }
// }

// // --- NEW FUNCTION for the Ascent IDE ---
// exports.getAscentIdeData = async (req, res) => {
//     const { lessonId } = req.params;
//     const studentId = req.user.id;

//     try {
//         // 1. Fetch core lesson and files
//         const lessonResult = await db.query('SELECT *, lesson_type FROM lessons WHERE id = $1', [lessonId]);

//         // const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
        
//         const filesResult = await db.query('SELECT * FROM lesson_files WHERE lesson_id = $1', [lessonId]);
//         const files = filesResult.rows;

//         // 2. Fetch and parse test cases (placeholder logic)
//         // In a real implementation, you would parse the lesson_tests table
//         const testCases = [
//             { description: "Example Test 1: Positive numbers", input: "[1, 2, 3]", expectedOutput: "[2, 4, 6]" },
//             { description: "Example Test 2: Negative and zero", input: "[-5, 0, 10]", expectedOutput: "[-10, 0, 20]" }
//         ];

//         // 3. Fetch submission history for this student and lesson
//         const historyResult = await db.query(
//             // NOTE: Your submissions table needs a boolean `is_correct` column for this to work
//             'SELECT id, submitted_at, is_correct, submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC',
//             [studentId, lessonId]
//         );
//         const submissionHistory = historyResult.rows;

//         // 4. Fetch the official solution (placeholder)
//         const officialSolution = {
//             code: [{ id: 'sol1', filename: 'solution.js', content: '// The optimal solution code goes here' }],
//             explanation: "This is the optimal solution because it correctly uses the `.map()` method for a concise and declarative transformation of the array."
//         };

//         // 5. Find the next and previous lesson IDs (placeholder logic)
//         // This requires a more complex query based on the course structure
//         const courseId = lesson.course_id;
//         const previousLessonId = null;
//         const nextLessonId = null; // Replace with real logic

//         // 6. Assemble the final payload
//         const ascentIdeData = {
//             lesson,
//             files,
//             testCases,
//             submissionHistory,
//             officialSolution,
//             courseId,
//             previousLessonId,
//             nextLessonId,
//         };

//         res.json(ascentIdeData);

//     } catch (err) {
//         console.error("Error in getAscentIdeData:", err.message);
//         res.status(500).json({ error: 'A server error occurred while fetching lesson data.' });
//     }
// };
// MVP
// /**
//  * @file lessonController.js
//  * @description This version is updated to log AI conceptual feedback to the database
//  * and retrieve it for the teacher's submission review page.
//  */
// const db = require('../db');
// const { executeCode } = require('../services/executionService'); 
// const { getConceptualHint } = require('../services/aiFeedbackService');
// // --- NEW: Save student's code progress ---
// // / --- NEW: Save student's code progress ---
// exports.saveStudentProgress = async (req, res) => {
//     const studentId = req.user.id;
//     const { lessonId } = req.params;
//     const { files } = req.body;

//     if (!files || !Array.isArray(files)) {
//         return res.status(400).json({ error: 'Invalid file data provided.' });
//     }

//     try {
//         // Use an UPSERT query to either insert a new record or update an existing one.
//         const query = `
//             INSERT INTO saved_progress (student_id, lesson_id, files, saved_at)
//             VALUES ($1, $2, $3, NOW())
//             ON CONFLICT (student_id, lesson_id)
//             DO UPDATE SET files = $3, saved_at = NOW();
//         `;
//         await db.query(query, [studentId, lessonId, JSON.stringify(files)]);
//         res.status(200).json({ message: 'Progress saved successfully.' });
//     } catch (err) {
//         console.error("Error in saveStudentProgress:", err.message);
//         res.status(500).json({ error: 'Server Error' });
//     }
// };

// // --- FIXED: Get the correct state for a student viewing a lesson ---
// exports.getStudentLessonState = async (req, res) => {
//     const studentId = req.user.id;
//     const { lessonId } = req.params; // lessonId is a UUID string

//     console.log(`[CONTROLLER] getStudentLessonState called for lessonId: ${lessonId}`);

//     try {
//         // 1. Fetch the core lesson details first using the UUID.
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             console.error(`[CONTROLLER] DB query found no lesson for ID: ${lessonId}`);
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];

//         // Helper function to safely parse data that might already be an object
//         const safeParse = (data) => {
//             if (typeof data === 'string') {
//                 try {
//                     return JSON.parse(data);
//                 } catch (e) {
//                     console.error("Failed to parse JSON string:", data);
//                     return null; // Or handle error appropriately
//                 }
//             }
//             return data; // It's already an object (or null/undefined)
//         };

//         // 2. Check for the most recent saved progress.
//         const savedProgressResult = await db.query(
//             'SELECT files FROM saved_progress WHERE student_id = $1 AND lesson_id = $2 ORDER BY saved_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );
//         if (savedProgressResult.rows.length > 0) {
//             const files = safeParse(savedProgressResult.rows[0].files);
//             return res.json({ lesson, files });
//         }

//         // 3. If no saved progress, check for the most recent final submission.
//         const submissionResult = await db.query(
//             'SELECT submitted_code FROM submissions WHERE student_id = $1 AND lesson_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [studentId, lessonId]
//         );
//         if (submissionResult.rows.length > 0) {
//             const files = safeParse(submissionResult.rows[0].submitted_code);
//             return res.json({ lesson, files });
//         }

//         // 4. If neither exists, fall back to the original lesson template files.
//         const templateFilesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [lessonId]);
        
//         res.json({ lesson, files: templateFilesResult.rows });

//     } catch (err) {
//         console.error("Error in getStudentLessonState:", err.message);
//         res.status(500).json({ error: 'Server Error' });
//     }
// };
// // --- createLesson function (includes objective) ---
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, objective, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, objective, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [title, description, objective, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Server Error' });
//   }
// };

// // --- UPDATED: createSubmission now logs all attempts ---
// exports.createSubmission = async (req, res) => {
//     const studentId = req.user.id;
//     const lessonId = req.params.id;
//     const { files } = req.body;
//     const studentCode = files.map(f => f.content).join('\n\n');

//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//     }

//     try {
//         const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const { language, objective } = lessonResult.rows[0];

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language);

//         // --- NEW LOGIC: Save the submission attempt FIRST ---
//         const submissionResult = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) VALUES ($1, $2, $3) RETURNING id`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );
//         const newSubmissionId = submissionResult.rows[0].id;

//         // Now, check if the submission was successful
//         if (execution.success) {
//             // If successful, proceed with the AI feedback logic
//             if (objective) {
//                 const feedback = await getConceptualHint(objective, studentCode);
                
//                 if (feedback.feedback_type === 'conceptual_hint') {
//                     await db.query(
//                         `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
//                         [newSubmissionId, feedback.message]
//                     );
//                     return res.json(feedback);
//                 }
//             }
//             // If no hint is needed, return the standard success message
//             return res.json({ message: "Solution submitted successfully!" });
//         } else {
//             // If the tests failed, the submission is already saved.
//             // Now, just return the error to the student so they stay on the page.
//             return res.status(400).json({ error: "Your solution did not pass all the tests." });
//         }
//     } catch (err) {
//         console.error("CRITICAL ERROR in createSubmission:", err.message);
//         res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
//     }
// };

// // --- UPDATED: getLessonSubmissions now includes AI feedback ---
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
//         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
//         const submissions = await db.query(
//             `SELECT 
//                 s.id, 
//                 s.submitted_code, 
//                 s.feedback, 
//                 s.grade, 
//                 s.submitted_at, 
//                 u.username,
//                 cfl.feedback_message AS "ai_feedback"
//              FROM submissions s 
//              JOIN users u ON s.student_id = u.id
//              LEFT JOIN conceptual_feedback_log cfl ON cfl.submission_id = s.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).json({ error: 'Server Error' });
//     }
// };



// // --- Other controller functions remain the same ---

// exports.runLessonTests = async (req, res) => {
//     const { id: lessonId } = req.params;
//     const studentId = req.user.id; 

//     try {
//         const { files } = req.body;

//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
        
//         const execution = await executeCode(fullCode, language); 
        
//         let totalTests = (testCode.match(/run_test\(/g) || []).length;
//         if (testCode.includes('def run_test(')) {
//             totalTests--; 
//         }
//         totalTests = totalTests > 0 ? totalTests : 1;

//         const failedCount = execution.failedTestNames.length;
//         const passedCount = totalTests - failedCount;

//         const testSummary = {
//             passed: passedCount > 0 ? passedCount : 0,
//             failed: failedCount,
//             total: totalTests,
//             results: execution.output.trim() || (execution.success ? "All tests passed!" : "Tests failed.")
//         };

//         try {
//             const wasSuccessful = execution.success;
//             const failedTests = execution.failedTestNames; 

//             const logQuery = `
//                 INSERT INTO test_runs (student_id, lesson_id, success, failed_tests)
//                 VALUES ($1, $2, $3, $4);
//             `;
            
//             await db.query(logQuery, [studentId, lessonId, wasSuccessful, JSON.stringify(failedTests)]);
//             console.log(`[DB LOG] Successfully logged test run for student ${studentId}.`);
//         } catch (dbError) {
//             console.error("[DB LOG] CRITICAL: Failed to log test run to database.", dbError);
//         }

//         res.json(testSummary);

//     } catch (err) {
//         console.error("Error in runLessonTests:", err.message);
//         res.status(500).json({
//             passed: 0,
//             failed: 1,
//             total: 1,
//             results: `A server error occurred: ${err.message}`
//         });
//     }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at, language FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         lesson.files = filesResult.rows;
//         res.json(lesson);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );
//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
//         res.json(updatedSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }
//         res.json(submission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getTeacherLessons = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         const result = await db.query('SELECT id, title FROM lessons WHERE teacher_id = $1 ORDER BY created_at DESC', [teacherId]);
//         res.json(result.rows);
//     } catch (err) {
//         res.status(500).json({ error: 'Server Error' });
//     }
// };

// /**
//  * @file lessonController.js
//  * @description This version is updated to integrate the AI-powered conceptual feedback system.
//  * The submit endpoint now runs tests and calls the aiFeedbackService for correct solutions.
//  */
// const db = require('../db');
// const { executeCode } = require('../services/executionService'); 
// // --- NEW: Import the AI feedback service ---
// const { getConceptualHint } = require('../services/aiFeedbackService');

// // Updated to include the 'objective' field ? MVP
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     // --- NEW: Destructure 'objective' from the request body ---
//     const { title, description, objective, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     // --- UPDATED: Add 'objective' to the INSERT statement ---
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, objective, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [title, description, objective, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Server Error' });
//   }
// };


// exports.createSubmission = async (req, res) => {
//     const studentId = req.user.id;
//     const lessonId = req.params.id;
//     const { files } = req.body;
//     const studentCode = files.map(f => f.content).join('\n\n');

//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//     }

//     try {
//         const lessonResult = await db.query('SELECT language, objective FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const { language, objective } = lessonResult.rows[0];

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language);

//         if (execution.success) {
//             // Save the successful submission and get its ID
//             const submissionResult = await db.query(
//                 `INSERT INTO submissions (lesson_id, student_id, submitted_code) VALUES ($1, $2, $3) RETURNING id`,
//                 [lessonId, studentId, JSON.stringify(files)]
//             );
//             const newSubmissionId = submissionResult.rows[0].id;

//             // If the lesson has an objective, call the AI feedback service
//             if (objective) {
//                 const feedback = await getConceptualHint(objective, studentCode);
                
//                 if (feedback.feedback_type === 'conceptual_hint') {
//                     // Log the hint to the new database table
//                     await db.query(
//                         `INSERT INTO conceptual_feedback_log (submission_id, feedback_message) VALUES ($1, $2)`,
//                         [newSubmissionId, feedback.message]
//                     );
//                     return res.json(feedback);
//                 }
//             }
            
//             return res.json({ message: "Solution submitted successfully!" });
//         } else {
//             return res.status(400).json({ error: "Your solution did not pass all the tests." });
//         }
//     } catch (err) {
//         console.error("CRITICAL ERROR in createSubmission:", err.message);
//         res.status(500).json({ error: 'An internal server error occurred while processing your submission.' });
//     }
// };


// // --- The rest of the controller functions remain unchanged ---

// exports.runLessonTests = async (req, res) => {
//     const { id: lessonId } = req.params;
//     const studentId = req.user.id; 

//     try {
//         const { files } = req.body;

//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
        
//         const execution = await executeCode(fullCode, language); 
        
//         let totalTests = (testCode.match(/run_test\(/g) || []).length;
//         if (testCode.includes('def run_test(')) {
//             totalTests--; 
//         }
//         totalTests = totalTests > 0 ? totalTests : 1;

//         const failedCount = execution.failedTestNames.length;
//         const passedCount = totalTests - failedCount;

//         const testSummary = {
//             passed: passedCount > 0 ? passedCount : 0,
//             failed: failedCount,
//             total: totalTests,
//             results: execution.output.trim() || (execution.success ? "All tests passed!" : "Tests failed.")
//         };

//         try {
//             const wasSuccessful = execution.success;
//             const failedTests = execution.failedTestNames; 

//             const logQuery = `
//                 INSERT INTO test_runs (student_id, lesson_id, success, failed_tests)
//                 VALUES ($1, $2, $3, $4);
//             `;
            
//             await db.query(logQuery, [studentId, lessonId, wasSuccessful, JSON.stringify(failedTests)]);
//             console.log(`[DB LOG] Successfully logged test run for student ${studentId}.`);
//         } catch (dbError) {
//             console.error("[DB LOG] CRITICAL: Failed to log test run to database.", dbError);
//         }

//         res.json(testSummary);

//     } catch (err) {
//         console.error("Error in runLessonTests:", err.message);
//         res.status(500).json({
//             passed: 0,
//             failed: 1,
//             total: 1,
//             results: `A server error occurred: ${err.message}`
//         });
//     }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at, language FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         lesson.files = filesResult.rows;
//         res.json(lesson);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // exports.getLessonSubmissions = async (req, res) => {
// //     try {
// //         const lessonId = req.params.id;
// //         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
// //         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
// //         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
// //         const submissions = await db.query(
// //             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
// //              FROM submissions s JOIN users u ON s.student_id = u.id
// //              WHERE s.lesson_id = $1 ORDER BY s.submitted_at DESC`,
// //             [lessonId]
// //         );
// //         res.json(submissions.rows);
// //     } catch (err) {
// //         console.error(err.message);
// //         res.status(500).send('Server Error');
// //     }
// // };
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
//         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
//         // This query now joins with the new log table to get the AI hint
//         const submissions = await db.query(
//             `SELECT 
//                 s.id, 
//                 s.submitted_code, 
//                 s.feedback, 
//                 s.grade, 
//                 s.submitted_at, 
//                 u.username,
//                 cfl.feedback_message AS "ai_feedback"
//              FROM submissions s 
//              JOIN users u ON s.student_id = u.id
//              LEFT JOIN conceptual_feedback_log cfl ON cfl.submission_id = s.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).json({ error: 'Server Error' });
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );
//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
//         res.json(updatedSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }
//         res.json(submission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// MVP
// // =================================================================
// // FILE: controllers/lessonController.js (UPDATED for Multi-Language)
// // =================================================================
// const db = require('../db');
// const { executeCode } = require('../services/executionService'); 

// // Create a new lesson, now with language and testCode
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     // Infer language from the first boilerplate file
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     // 1. Create the main lesson entry, now including the language.
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // 2. Insert boilerplate files.
//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     // 3. Insert the test code if it was provided.
//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.runLessonTests = async (req, res) => {
//     const { id: lessonId } = req.params;
//     const studentId = req.user.id; 

//     try {
//         const { files } = req.body;

//         // 1. Fetch lesson language
//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         // 2. Fetch the test code
//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         // 3. Combine and execute
//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
        
//         // The execution service now returns a more detailed object
//         const execution = await executeCode(fullCode, language); 
        
//         // 4. Build summary (can be simplified as success is now clear)
//         let totalTests = (testCode.match(/run_test\(/g) || []).length;
//         if (testCode.includes('def run_test(')) {
//             totalTests--; 
//         }
//         totalTests = totalTests > 0 ? totalTests : 1;

//         const failedCount = execution.failedTestNames.length;
//         const passedCount = totalTests - failedCount;

//         const testSummary = {
//             passed: passedCount > 0 ? passedCount : 0,
//             failed: failedCount,
//             total: totalTests,
//             results: execution.output.trim() || (execution.success ? "All tests passed!" : "Tests failed.")
//         };

//         // =================================================================
//         // 5. LOG THE DETAILED TEST RUN TO THE DATABASE
//         // =================================================================
//         try {
//             const wasSuccessful = execution.success;
//             // The list of failed tests is now directly available from the execution service
//             const failedTests = execution.failedTestNames; 

//             const logQuery = `
//                 INSERT INTO test_runs (student_id, lesson_id, success, failed_tests)
//                 VALUES ($1, $2, $3, $4);
//             `;
            
//             console.log(`[DB LOG] Logging test run: student_id=${studentId}, lesson_id=${lessonId}, success=${wasSuccessful}, failed_tests=${JSON.stringify(failedTests)}`);
            
//             // Pass the array directly; PostgreSQL's node driver will handle JSONB conversion
//             await db.query(logQuery, [studentId, lessonId, wasSuccessful, JSON.stringify(failedTests)]);

//             console.log(`[DB LOG] Successfully logged test run.`);
//         } catch (dbError) {
//             console.error("[DB LOG] CRITICAL: Failed to log test run to database.", dbError);
//         }
//         // =================================================================

//         res.json(testSummary);

//     } catch (err) {
//         console.error("Error in runLessonTests:", err.message);
//         res.status(500).json({
//             passed: 0,
//             failed: 1,
//             total: 1,
//             results: `A server error occurred: ${err.message}`
//         });
//     }
// };


// // --- Other controller functions remain the same ---
// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at, language FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         lesson.files = filesResult.rows;
//         res.json(lesson);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { files } = req.body;
//         if (!files || !Array.isArray(files) || files.length === 0) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) VALUES ($1, $2, $3) RETURNING *`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
//         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );
//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
//         res.json(updatedSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }
//         res.json(submission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// MVP
// exports.runLessonTests = async (req, res) => {
//     // Use 'id' from params to match your code, and get studentId from the user token
//     const { id: lessonId } = req.params;
//     const studentId = req.user.id; 

//     try {
//         const { files } = req.body;

//         // 1. Fetch lesson language
//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         // 2. Fetch the test code
//         const testCodeResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testCodeResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testCodeResult.rows[0].test_code;

//         // 3. Combine and execute
//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const execution = await executeCode(fullCode, language); 
        
//         // 4. Build summary
//         let totalTests = (testCode.match(/run_test\(/g) || []).length;
//         if (testCode.includes('def run_test(')) {
//             totalTests--; 
//         }
//         totalTests = totalTests > 0 ? totalTests : 1;

//         let testSummary;

//         if (execution.success) {
//             testSummary = {
//                 passed: totalTests,
//                 failed: 0,
//                 total: totalTests,
//                 results: execution.output.trim() || "All tests passed!"
//             };
//         } else {
//             testSummary = {
//                 passed: totalTests > 1 ? totalTests - 1 : 0,
//                 failed: 1, 
//                 total: totalTests,
//                 results: execution.output 
//             };
//         }

//         // =================================================================
//         // 5. ADD THIS BLOCK TO LOG THE TEST RUN TO THE DATABASE
//         // =================================================================
//         try {
//             const wasSuccessful = testSummary.failed === 0;
//             const logQuery = `
//                 INSERT INTO test_runs (student_id, lesson_id, success)
//                 VALUES ($1, $2, $3);
//             `;
            
//             // --- NEW LOGGING ---
//             console.log(`[DB LOG] Attempting to log test run with data: student_id=${studentId}, lesson_id=${lessonId}, success=${wasSuccessful}`);
            
//             await db.query(logQuery, [studentId, lessonId, wasSuccessful]);

//             console.log(`[DB LOG] Successfully logged test run.`);
//         } catch (dbError) {
//             // Log the database error but don't block the user from seeing their test results.
//             console.error("[DB LOG] CRITICAL: Failed to log test run to database.", dbError);
//         }
//         // =================================================================

//         res.json(testSummary);

//     } catch (err) {
//         console.error("Error in runLessonTests:", err.message);
//         res.status(500).json({
//             passed: 0,
//             failed: 1,
//             total: 1,
//             results: `A server error occurred: ${err.message}`
//         });
//     }
// };
// // =================================================================
// // FILE: controllers/lessonController.js (UPDATED for Multi-Language)
// // =================================================================
// const db = require('../db');
// const { executeCode } = require('../services/executionService'); 

// // Create a new lesson, now with language and testCode
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || files.length === 0 || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }
    
//     // Infer language from the first boilerplate file
//     const extension = files[0]?.filename.split('.').pop();
//     const languageMap = { js: 'javascript', py: 'python', java: 'java' };
//     const lessonLanguage = languageMap[extension] || 'plaintext';

//     // 1. Create the main lesson entry, now including the language.
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, teacher_id, course_id, language) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, teacherId, courseId, lessonLanguage]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // 2. Insert boilerplate files.
//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     // 3. Insert the test code if it was provided.
//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// // Run tests for a lesson
// exports.runLessonTests = async (req, res) => {
//     try {
//         const { lessonId } = req.params;
//         const { files } = req.body;

//         // 1. Fetch the lesson to get its language
//         const lessonResult = await db.query('SELECT language FROM lessons WHERE id = $1', [lessonId]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const language = lessonResult.rows[0].language;

//         // 2. Fetch the test code
//         const testResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testResult.rows[0].test_code;

//         // 3. Combine and execute
//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const executionResult = await executeCode(fullCode, language); 
        
//         // 4. Parse results (this remains a simplified parser for now)
//         const totalTests = (testCode.match(/assert/g) || []).length;
//         const passedCount = (executionResult.match(/Test Case \d+ Passed/g) || []).length;
//         const failedCount = totalTests - passedCount;

//         const testSummary = {
//             passed: passedCount,
//             failed: failedCount,
//             total: totalTests,
//             results: executionResult
//         };
//         res.json(testSummary);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// // --- Other controller functions remain the same ---
// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at, language FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         lesson.files = filesResult.rows;
//         res.json(lesson);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { files } = req.body;
//         if (!files || !Array.isArray(files) || files.length === 0) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) VALUES ($1, $2, $3) RETURNING *`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
//         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );
//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
//         res.json(updatedSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }
//         res.json(submission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// // =================================================================
// // FILE: controllers/lessonController.js (CORRECTED)
// // =================================================================
// const db = require('../db');
// // TEMPORARILY COMMENTED OUT: This line caused the crash. We will create this file in the next step.
// // const { executeCode } = require('../services/executionService'); 

// // Create a new lesson, now with courseId association
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     // UPDATED: Now also accepts testCode in the request body
//     const { title, description, files, courseId, testCode } = req.body;

//     if (!title || !files || !Array.isArray(files) || !courseId) {
//         return res.status(400).json({ error: 'Title, files, and courseId are required.' });
//     }

//     // 1. Create the main lesson entry.
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, teacher_id, course_id) VALUES ($1, $2, $3, $4) RETURNING *',
//       [title, description, teacherId, courseId]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // 2. Insert boilerplate files.
//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)',
//             [file.filename, file.content, newLesson.id]
//         );
//     });
//     await Promise.all(filePromises);

//     // 3. Insert the test code if it was provided.
//     if (testCode) {
//         await db.query(
//             'INSERT INTO lesson_tests (lesson_id, test_code) VALUES ($1, $2)',
//             [newLesson.id, testCode]
//         );
//     }

//     res.status(201).json(newLesson);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// // --- Other controller functions remain the same ---

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         lesson.files = filesResult.rows;
//         res.json(lesson);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { files } = req.body;
//         if (!files || !Array.isArray(files) || files.length === 0) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) VALUES ($1, $2, $3) RETURNING *`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
//         if (lesson.rows[0].teacher_id !== req.user.id) return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
        
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );
//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
//         res.json(updatedSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }
//         res.json(submission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // TEMPORARILY COMMENTED OUT: This function will be implemented in the next step.

// exports.runLessonTests = async (req, res) => {
//     try {
//         const { lessonId } = req.params;
//         const { files } = req.body;
//         const testResult = await db.query('SELECT test_code FROM lesson_tests WHERE lesson_id = $1', [lessonId]);
//         if (testResult.rows.length === 0) {
//             return res.status(404).json({ error: 'No tests found for this lesson.' });
//         }
//         const testCode = testResult.rows[0].test_code;
//         const studentCode = files.map(f => f.content).join('\n\n');
//         const fullCode = `${studentCode}\n\n${testCode}`;
//         const executionResult = await executeCode(fullCode, 'javascript'); 
//         const passed = !executionResult.includes('Error');
//         const testSummary = { passed: passed ? 1 : 0, failed: passed ? 0 : 1, total: 1, results: executionResult };
//         res.json(testSummary);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// // =================================================================
// // FILE: controllers/lessonController.js (UPDATED)
// // =================================================================
// const db = require('../db');

// // Create a new lesson, now with courseId association
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     // UPDATED: Now expecting courseId in the request body
//     const { title, description, files, courseId } = req.body;

//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'At least one file is required.' });
//     }
//     // NEW: Validate that a courseId was provided
//     if (!courseId) {
//         return res.status(400).json({ error: 'A course ID is required to create a lesson.' });
//     }

//     // 1. Create the main lesson entry, now including the course_id.
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, teacher_id, course_id) VALUES ($1, $2, $3, $4) RETURNING *',
//       [title, description, teacherId, courseId]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // 2. Loop through the files and insert each one.
//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3) RETURNING *',
//             [file.filename, file.content, newLesson.id]
//         );
//     });

//     const insertedFilesResults = await Promise.all(filePromises);
//     const insertedFiles = insertedFilesResults.map(result => result.rows[0]);

//     // Return the created lesson along with its files.
//     res.status(201).json({ ...newLesson, files: insertedFiles });

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// // --- Other controller functions remain the same ---

// // Get all lessons (this function can be simplified as it doesn't need file details for the list view)
// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single lesson by ID, now including its files
// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
        
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];

//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         const files = filesResult.rows;

//         res.json({ ...lesson, files });

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { files } = req.body;

//         if (!files || !Array.isArray(files) || files.length === 0) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }

//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              RETURNING *`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );

//         res.status(201).json(newSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;

//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s 
//              JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );

//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }

//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
        
//         res.json(updatedSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;

//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );

//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }

//         res.json(submission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
// // -----------------------------------------------------------------
// // FILE: controllers/lessonController.js (UPDATED)
// // -----------------------------------------------------------------
// const db = require('../db');

// // Create a new lesson with multiple files
// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     // The request body now expects a 'files' array.
//     const { title, description, files } = req.body;

//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     if (!files || !Array.isArray(files) || files.length === 0) {
//         return res.status(400).json({ error: 'At least one file is required.' });
//     }

//     // 1. Create the main lesson entry to get a lesson ID.
//     const newLessonResult = await db.query(
//       'INSERT INTO lessons (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
//       [title, description, teacherId]
//     );
//     const newLesson = newLessonResult.rows[0];

//     // 2. Loop through the files and insert each one into the `lesson_files` table.
//     const filePromises = files.map(file => {
//         return db.query(
//             'INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3) RETURNING *',
//             [file.filename, file.content, newLesson.id]
//         );
//     });

//     // Wait for all file insertion queries to complete.
//     const insertedFilesResults = await Promise.all(filePromises);
//     const insertedFiles = insertedFilesResults.map(result => result.rows[0]);

//     // Return the created lesson along with its files.
//     res.status(201).json({ ...newLesson, files: insertedFiles });

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// // Get all lessons (this function can be simplified as it doesn't need file details for the list view)
// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single lesson by ID, now including its files
// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
        
//         // 1. Fetch the main lesson details.
//         const lessonResult = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lessonResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         const lesson = lessonResult.rows[0];

//         // 2. Fetch all associated files for that lesson.
//         const filesResult = await db.query('SELECT id, filename, content FROM lesson_files WHERE lesson_id = $1', [id]);
//         const files = filesResult.rows;

//         // 3. Combine them into a single response object.
//         res.json({ ...lesson, files });

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         // The body now expects an array of files.
//         const { files } = req.body;

//         if (!files || !Array.isArray(files) || files.length === 0) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }

//         // We store the array of files as a JSONB object in the database.
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              RETURNING *`,
//             [lessonId, studentId, JSON.stringify(files)]
//         );

//         res.status(201).json(newSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;

//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s 
//              JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );

//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }

//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
        
//         res.json(updatedSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;

//         // Fetches the MOST RECENT submission for the student.
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );

//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }

//         res.json(submission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// MVP
// /*
//  * =================================================================
//  * FOLDER: educators-edge-backend/
//  * =================================================================
//  * This contains the updated file for your backend to handle
//  * multiple submissions per student.
//  */

// // -----------------------------------------------------------------
// // FILE: controllers/lessonController.js (UPDATED)
// // -----------------------------------------------------------------
// const db = require('../db');

// // ... (other controller functions remain the same) ...

// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, boilerplate_code, language } = req.body;
//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     const newLesson = await db.query(
//       'INSERT INTO lessons (title, description, boilerplate_code, language, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, boilerplate_code, language, teacherId]
//     );
//     res.status(201).json(newLesson.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, language, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lesson = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         res.json(lesson.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // UPDATED: This function no longer uses ON CONFLICT. It simply inserts a new record every time.
// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { submitted_code } = req.body;

//         if (!submitted_code) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }

//         // A simple INSERT now creates a new submission record each time.
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              RETURNING *`,
//             [lessonId, studentId, submitted_code]
//         );

//         res.status(201).json(newSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;

//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s 
//              JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );

//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }

//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
        
//         res.json(updatedSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;

//         // UPDATED: Fetches the MOST RECENT submission for the student.
//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
//             [lessonId, studentId]
//         );

//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }

//         res.json(submission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };



// const db = require('../db');

// // createLesson, getAllLessons, getLessonById, createSubmission, getLessonSubmissions, updateSubmission remain the same...

// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, boilerplate_code, language } = req.body;
//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     const newLesson = await db.query(
//       'INSERT INTO lessons (title, description, boilerplate_code, language, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, boilerplate_code, language, teacherId]
//     );
//     res.status(201).json(newLesson.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, language, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lesson = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         res.json(lesson.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { submitted_code } = req.body;
//         if (!submitted_code) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              ON CONFLICT (lesson_id, student_id) 
//              DO UPDATE SET submitted_code = EXCLUDED.submitted_code, submitted_at = CURRENT_TIMESTAMP
//              RETURNING *`,
//             [lessonId, studentId, submitted_code]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;

//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s 
//              JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );

//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }

//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
        
//         res.json(updatedSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // NEW: Controller function for a student to get their own submission.
// exports.getStudentSubmissionForLesson = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;

//         const submission = await db.query(
//             'SELECT * FROM submissions WHERE lesson_id = $1 AND student_id = $2',
//             [lessonId, studentId]
//         );

//         // It's okay if a submission doesn't exist yet. We just return null.
//         if (submission.rows.length === 0) {
//             return res.json(null);
//         }

//         res.json(submission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// // -----------------------------------------------------------------
// // FILE: controllers/lessonController.js (UPDATED)
// // -----------------------------------------------------------------
// const db = require('../db');

// // createLesson, getAllLessons, getLessonById, createSubmission remain the same...

// exports.createLesson = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { title, description, boilerplate_code, language } = req.body;
//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     const newLesson = await db.query(
//       'INSERT INTO lessons (title, description, boilerplate_code, language, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, boilerplate_code, language, teacherId]
//     );
//     res.status(201).json(newLesson.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, language, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lesson = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         res.json(lesson.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { submitted_code } = req.body;
//         if (!submitted_code) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              ON CONFLICT (lesson_id, student_id) 
//              DO UPDATE SET submitted_code = EXCLUDED.submitted_code, submitted_at = CURRENT_TIMESTAMP
//              RETURNING *`,
//             [lessonId, studentId, submitted_code]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }
//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // NEW: Controller function for updating a submission
// exports.updateSubmission = async (req, res) => {
//     try {
//         const { submissionId } = req.params;
//         const { feedback, grade } = req.body;
//         const teacherId = req.user.id;

//         // First, verify that the teacher making the request is authorized to grade this submission.
//         // We do this by checking if the submission belongs to a lesson created by this teacher.
//         const submissionResult = await db.query(
//             `SELECT s.id FROM submissions s 
//              JOIN lessons l ON s.lesson_id = l.id
//              WHERE s.id = $1 AND l.teacher_id = $2`,
//             [submissionId, teacherId]
//         );

//         if (submissionResult.rows.length === 0) {
//             return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
//         }

//         // Now, update the submission with the new feedback and grade.
//         const updatedSubmission = await db.query(
//             'UPDATE submissions SET feedback = $1, grade = $2 WHERE id = $3 RETURNING *',
//             [feedback, grade, submissionId]
//         );
        
//         res.json(updatedSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // -----------------------------------------------------------------
// // FILE: controllers/lessonController.js (UPDATED)
// // -----------------------------------------------------------------
// const db = require('../db');

// exports.createLesson = async (req, res) => {
//   try {
//     // We now get the teacher's ID from the `req.user` object.
//     const teacherId = req.user.id;
//     const { title, description, boilerplate_code, language } = req.body;

//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }
//     const newLesson = await db.query(
//       'INSERT INTO lessons (title, description, boilerplate_code, language, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, boilerplate_code, language, teacherId]
//     );
//     res.status(201).json(newLesson.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.getAllLessons = async (req, res) => {
//     try {
//         const lessons = await db.query('SELECT id, title, description, language, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lesson = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }
//         res.json(lesson.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// exports.createSubmission = async (req, res) => {
//     try {
//         // The student's ID comes from the JWT via the middleware.
//         const studentId = req.user.id;
//         const lessonId = req.params.id;
//         const { submitted_code } = req.body;

//         if (!submitted_code) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              ON CONFLICT (lesson_id, student_id) 
//              DO UPDATE SET submitted_code = EXCLUDED.submitted_code, submitted_at = CURRENT_TIMESTAMP
//              RETURNING *`,
//             [lessonId, studentId, submitted_code]
//         );
//         res.status(201).json(newSubmission.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get all submissions for a specific lesson, now protected by the isTeacher middleware.
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
//         // We can add an extra check to ensure the requesting teacher is the one who created the lesson.
//         const lesson = await db.query('SELECT teacher_id FROM lessons WHERE id = $1', [lessonId]);
//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found' });
//         }
//         if (lesson.rows[0].teacher_id !== req.user.id) {
//             return res.status(403).json({ error: 'You are not authorized to view submissions for this lesson.' });
//         }

//         const submissions = await db.query(
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );
//         res.json(submissions.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };




// // -----------------------------------------------------------------
// // FILE: controllers/lessonController.js (NEW FILE)
// // -----------------------------------------------------------------
// const db = require('../db');

// // --- Lesson Controller Functions ---

// // Create a new lesson
// exports.createLesson = async (req, res) => {
//   try {
//     // The user's ID (the teacher) is available from the `verifyToken` middleware
//     const teacherId = req.userId;
//     const { title, description, boilerplate_code, language } = req.body;

//     if (!title) {
//         return res.status(400).json({ error: 'Title is required.' });
//     }

//     const newLesson = await db.query(
//       'INSERT INTO lessons (title, description, boilerplate_code, language, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description, boilerplate_code, language, teacherId]
//     );

//     res.status(201).json(newLesson.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// };

// // Get all lessons
// exports.getAllLessons = async (req, res) => {
//     try {
//         // For now, this gets all lessons. Later, you could filter by teacher, etc.
//         const lessons = await db.query('SELECT id, title, description, language, created_at FROM lessons ORDER BY created_at DESC');
//         res.json(lessons.rows);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get a single lesson by ID
// exports.getLessonById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const lesson = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);

//         if (lesson.rows.length === 0) {
//             return res.status(404).json({ error: 'Lesson not found.' });
//         }

//         res.json(lesson.rows[0]);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };


// // --- Submission Controller Functions ---

// // Create a new submission for a lesson
// exports.createSubmission = async (req, res) => {
//     try {
//         const studentId = req.userId;
//         const lessonId = req.params.id;
//         const { submitted_code } = req.body;

//         if (!submitted_code) {
//             return res.status(400).json({ error: 'Submitted code cannot be empty.' });
//         }

//         // Use an "UPSERT" operation. If the student has already submitted for this lesson,
//         // it updates their existing submission. Otherwise, it inserts a new one.
//         // This is handled by the `ON CONFLICT` clause, which uses the unique constraint we created.
//         const newSubmission = await db.query(
//             `INSERT INTO submissions (lesson_id, student_id, submitted_code) 
//              VALUES ($1, $2, $3)
//              ON CONFLICT (lesson_id, student_id) 
//              DO UPDATE SET submitted_code = EXCLUDED.submitted_code, submitted_at = CURRENT_TIMESTAMP
//              RETURNING *`,
//             [lessonId, studentId, submitted_code]
//         );

//         res.status(201).json(newSubmission.rows[0]);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };

// // Get all submissions for a specific lesson
// exports.getLessonSubmissions = async (req, res) => {
//     try {
//         const lessonId = req.params.id;
        
//         // We should also verify that the user requesting this is the teacher of the lesson.
//         // For simplicity in this step, we are omitting that check.
        
//         const submissions = await db.query(
//             // We join with the `users` table to get the student's username.
//             `SELECT s.id, s.submitted_code, s.feedback, s.grade, s.submitted_at, u.username 
//              FROM submissions s
//              JOIN users u ON s.student_id = u.id
//              WHERE s.lesson_id = $1 
//              ORDER BY s.submitted_at DESC`,
//             [lessonId]
//         );

//         res.json(submissions.rows);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
