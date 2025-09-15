/**
 * =================================================================
 * NEW ENHANCED COURSE CONTROLLER - CLAUDE API POWERED
 * =================================================================
 * Properly handles multilanguage course delivery with real language-specific
 * boilerplate code, test cases, and solutions
 */

const pool = require('../db');

class NewEnhancedCourseController {
    // Get enhanced course lessons for AscentIDE integration with proper multilanguage support
    static async getEnhancedCourseLessons(req, res) {
        try {
            const { courseId } = req.params;
            const { moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.query;
            
            console.log('🔄 Enhanced course lessons request:', { 
                courseId, 
                moduleIndex, 
                lessonIndex, 
                language 
            });
            
            const courseQuery = `
                SELECT title, description, metadata, language 
                FROM enhanced_courses 
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);
            
            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Enhanced course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            
            if (moduleIndex >= modules.length) {
                return res.status(404).json({ error: 'Module not found' });
            }

            const currentModule = modules[parseInt(moduleIndex)];
            const lessons = currentModule.lessons?.lessons || [];
            
            if (lessonIndex >= lessons.length) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            const currentLesson = lessons[parseInt(lessonIndex)];
            
            // Get language-specific implementation
            const languageImpl = currentLesson.languageImplementations?.[language];
            
            if (!languageImpl) {
                console.log('⚠️ No language implementation found for:', language);
                return res.status(404).json({ 
                    error: `No ${language} implementation found for this lesson. Please try JavaScript.` 
                });
            }

            console.log('✅ Found language implementation for:', language);

            // Create AscentIDE-compatible lesson data
            const lessonId = `${courseId}-${moduleIndex}-${lessonIndex}`;
            
            const ascentIdeData = {
                lesson: {
                    id: lessonId,
                    title: currentLesson.title,
                    description: NewEnhancedCourseController.formatProblemDescription(currentLesson),
                    instructions: languageImpl.explanation || 'Complete the implementation below.',
                    difficulty: currentLesson.difficulty || course.difficulty_level || 'intermediate',
                    language: language,
                    metadata: {
                        courseId,
                        moduleIndex: parseInt(moduleIndex),
                        lessonIndex: parseInt(lessonIndex),
                        moduleName: currentModule.title,
                        patterns: [currentLesson.pattern],
                        isEnhanced: true,
                        timeComplexity: currentLesson.time_complexity,
                        spaceComplexity: currentLesson.space_complexity,
                        constraints: currentLesson.constraints
                    }
                },
                files: [
                    {
                        id: '1',
                        filename: NewEnhancedCourseController.getMainFileName(language),
                        content: languageImpl.starterCode,
                        type: 'main'
                    },
                    {
                        id: '2', 
                        filename: NewEnhancedCourseController.getTestFileName(language),
                        content: languageImpl.testCases,
                        type: 'test'
                    }
                ],
                testCases: NewEnhancedCourseController.generateTestCases(currentLesson),
                starterCode: languageImpl.starterCode,
                tests: languageImpl.testCases,
                solution: languageImpl.solutionCode,
                hints: currentLesson.hints || [],
                submissionHistory: [],
                gradedSubmission: null,
                submissions: [],
                isCompleted: false,
                timeLimit: null,
                maxAttempts: null
            };

            console.log('🚀 Returning AscentIDE data for language:', language);
            res.json(ascentIdeData);
        } catch (err) {
            console.error('❌ Error fetching enhanced course lessons:', err.message);
            console.error('❌ Full error stack:', err.stack);
            console.error('❌ Error details:', err);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    // Get solution for enhanced course lesson with proper multilanguage support
    static async getEnhancedCourseLessonSolution(req, res) {
        try {
            const { courseId } = req.params;
            const { moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.query;
            
            console.log('🔍 Solution request:', { courseId, moduleIndex, lessonIndex, language });
            
            const courseQuery = `
                SELECT title, description, metadata, language 
                FROM enhanced_courses 
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);
            
            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Enhanced course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            const currentModule = modules[parseInt(moduleIndex)];
            const currentLesson = currentModule?.lessons?.lessons?.[parseInt(lessonIndex)];
            
            if (!currentLesson) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            const languageImpl = currentLesson.languageImplementations?.[language];
            
            if (!languageImpl) {
                return res.status(404).json({ 
                    error: `No ${language} solution available for this lesson` 
                });
            }

            const explanation = `## Official Solution - ${currentLesson.title}

**Pattern:** ${currentLesson.pattern}
**Difficulty:** ${currentLesson.difficulty}
**Time Complexity:** ${currentLesson.time_complexity}
**Space Complexity:** ${currentLesson.space_complexity}

### Approach
${languageImpl.explanation}

### Key Points
- Optimized for performance and readability
- Handles all edge cases
- Follows ${language} best practices
- Includes comprehensive test coverage`;

            const solutionFiles = [
                {
                    id: '1',
                    filename: NewEnhancedCourseController.getMainFileName(language),
                    content: languageImpl.solutionCode,
                    type: 'solution',
                    explanation: explanation
                }
            ];

            console.log('✅ Returning solution for language:', language);
            res.json({
                files: solutionFiles,
                explanation: explanation
            });
        } catch (err) {
            console.error('❌ Error fetching solution:', err.message);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    static formatProblemDescription(lesson) {
        let description = `# ${lesson.title}\n\n`;
        description += `${lesson.description}\n\n`;
        
        if (lesson.constraints && lesson.constraints.length > 0) {
            description += `## Constraints\n`;
            lesson.constraints.forEach(constraint => {
                description += `- ${constraint}\n`;
            });
            description += '\n';
        }
        
        if (lesson.examples && lesson.examples.length > 0) {
            description += `## Examples\n\n`;
            lesson.examples.forEach((example, index) => {
                description += `**Example ${index + 1}:**\n`;
                description += `\`\`\`\nInput: ${example.input}\nOutput: ${example.output}\n\`\`\`\n`;
                if (example.explanation) {
                    description += `Explanation: ${example.explanation}\n\n`;
                }
            });
        }
        
        return description;
    }

    static generateTestCases(lesson) {
        if (lesson.examples && lesson.examples.length > 0) {
            return lesson.examples.map((example, index) => ({
                id: index + 1,
                input: example.input,
                expectedOutput: example.output, // Fixed: changed from 'expected' to 'expectedOutput'
                description: `Example ${index + 1}`
            }));
        }
        return [];
    }

    static getMainFileName(language) {
        const fileMap = {
            'javascript': 'main.js',
            'python': 'main.py',
            'java': 'Solution.java',
            'cpp': 'main.cpp',
            'c': 'main.c'
        };
        return fileMap[language] || 'main.js';
    }

    static getTestFileName(language) {
        const testMap = {
            'javascript': 'test.js',
            'python': 'test_main.py', 
            'java': 'SolutionTest.java',
            'cpp': 'test.cpp',
            'c': 'test.c'
        };
        return testMap[language] || 'test.js';
    }

    // Run tests for enhanced course lesson
    static async runEnhancedCourseTests(req, res) {
        try {
            const { courseId } = req.params;
            const { files, moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.body;

            console.log('🔄 Running tests for enhanced course:', {
                courseId,
                moduleIndex,
                lessonIndex,
                language,
                filesCount: files?.length
            });

            // Get course and lesson data
            const courseQuery = `
                SELECT title, description, metadata, language
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);

            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Enhanced course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            const currentModule = modules[parseInt(moduleIndex)];
            const currentLesson = currentModule?.lessons?.lessons?.[parseInt(lessonIndex)];

            if (!currentLesson) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            const languageImpl = currentLesson.languageImplementations?.[language];
            if (!languageImpl) {
                return res.status(404).json({
                    error: `No ${language} implementation found for this lesson`
                });
            }

            // Get the user's code from files
            const mainFile = files?.find(f => f.type === 'main') || files?.[0];
            if (!mainFile) {
                return res.status(400).json({ error: 'No code file provided' });
            }

            const userCode = mainFile.content;

            // Use Fast execution service for immediate testing (no Docker overhead)
            const fastExecutionService = require('../services/fastExecutionService');
            const testCaseProcessor = require('../services/testCaseProcessor');

            // Prepare raw test cases in the expected format
            const testCases = languageImpl.testCases || [];
            const examples = currentLesson.examples || [];

            // Convert examples to test cases if no explicit test cases exist
            const rawTestCases = testCases.length > 0 ? testCases :
                examples.map((example, index) => ({
                    input: example.input,
                    output: example.output,
                    description: `Example ${index + 1}`
                }));

            console.log('🧹 [PREPROCESSING] Raw test cases before cleaning:', {
                language,
                rawTestCaseCount: rawTestCases.length,
                sampleInput: rawTestCases[0]?.input,
                sampleOutput: rawTestCases[0]?.output
            });

            // Clean and process test cases for error-free execution
            const problemType = testCaseProcessor.inferProblemType(rawTestCases);
            console.log('🔍 [DEBUG] About to call processTestCases with:', {
                rawTestCasesType: typeof rawTestCases,
                rawTestCasesIsArray: Array.isArray(rawTestCases),
                problemType,
                language
            });

            let cleanedTestCases = testCaseProcessor.processTestCases(rawTestCases, problemType, language);

            console.log('🔍 [DEBUG] processTestCases returned:', {
                type: typeof cleanedTestCases,
                isArray: Array.isArray(cleanedTestCases),
                length: cleanedTestCases?.length,
                value: cleanedTestCases
            });

            // Ensure cleanedTestCases is always an array
            if (!Array.isArray(cleanedTestCases)) {
                console.error('❌ Test case processor returned non-array:', typeof cleanedTestCases, cleanedTestCases);
                cleanedTestCases = [];
            }

            // Fallback: If processor returns empty, use raw test cases
            if (cleanedTestCases.length === 0 && rawTestCases.length > 0) {
                console.warn('⚠️ Test case processor returned empty results, using raw test cases as fallback');
                cleanedTestCases = rawTestCases;
            }

            console.log('⚡ [FAST_EXEC] Executing code via Fast Execution Service:', {
                language,
                problemType,
                rawTestCaseCount: rawTestCases.length,
                cleanedTestCaseCount: cleanedTestCases.length,
                codeLength: userCode.length,
                usingFallback: cleanedTestCases === rawTestCases
            });

            const testResults = await fastExecutionService.executeCodeWithTests(
                userCode,
                cleanedTestCases,
                language
            );

            // Enhance results with AI analysis for failures (optional)
            if (testResults.failed > 0) {
                try {
                    const geminiService = require('../services/geminiService');
                    const aiAnalysis = await geminiService.getAIAnalysisForResults(
                        userCode,
                        {
                            title: currentLesson.title,
                            description: currentLesson.description,
                            difficulty: currentLesson.difficulty,
                            testCases: cleanedTestCases
                        },
                        testResults.testCaseResults,
                        language
                    );

                    testResults.aiAnalysis = aiAnalysis.analysis;
                    testResults.feedback = aiAnalysis.feedback;
                } catch (aiError) {
                    console.warn('🤖 AI analysis failed:', aiError.message);
                    // Continue without AI analysis if it fails
                }
            }

            console.log('✅ Test execution completed:', {
                passed: testResults.passed,
                failed: testResults.failed,
                total: testResults.total
            });

            res.json(testResults);
        } catch (err) {
            console.error('❌ Error running enhanced course tests:', err.message);
            console.error('❌ Full error stack:', err.stack);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    // Submit solution for enhanced course lesson
    static async submitEnhancedCourseSolution(req, res) {
        try {
            const { courseId } = req.params;
            const { files, moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.body;
            const userId = req.user?.id;

            console.log('🚀 [SUBMIT] Enhanced course solution submission:', {
                courseId,
                moduleIndex,
                lessonIndex,
                language,
                userId,
                filesCount: files?.length
            });

            // First, run tests to validate the solution
            const fastExecutionService = require('../services/fastExecutionService');
            const testCaseProcessor = require('../services/testCaseProcessor');

            // Get course and lesson data
            const courseQuery = `
                SELECT title, description, metadata, language
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);

            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Enhanced course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            const currentModule = modules[parseInt(moduleIndex)];
            const currentLesson = currentModule?.lessons?.lessons?.[parseInt(lessonIndex)];

            if (!currentLesson) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            const languageImpl = currentLesson.languageImplementations?.[language];
            if (!languageImpl) {
                return res.status(404).json({
                    error: `No ${language} implementation found for this lesson`
                });
            }

            // Get the user's code from files
            const mainFile = files?.find(f => f.type === 'main') || files?.[0];
            if (!mainFile) {
                return res.status(400).json({ error: 'No code file provided' });
            }

            const userCode = mainFile.content;

            // Prepare raw test cases
            const testCases = languageImpl.testCases || [];
            const examples = currentLesson.examples || [];
            const rawTestCases = testCases.length > 0 ? testCases :
                examples.map((example, index) => ({
                    input: example.input,
                    output: example.output,
                    description: `Example ${index + 1}`
                }));

            // Clean and process test cases for error-free execution
            const problemType = testCaseProcessor.inferProblemType(rawTestCases);
            let cleanedTestCases = testCaseProcessor.processTestCases(rawTestCases, problemType, language);

            // Ensure cleanedTestCases is always an array
            if (!Array.isArray(cleanedTestCases)) {
                console.error('❌ Test case processor returned non-array:', typeof cleanedTestCases, cleanedTestCases);
                cleanedTestCases = [];
            }

            // Fallback: If processor returns empty, use raw test cases
            if (cleanedTestCases.length === 0 && rawTestCases.length > 0) {
                console.warn('⚠️ Test case processor returned empty results, using raw test cases as fallback');
                cleanedTestCases = rawTestCases;
            }

            console.log('🧪 [SUBMIT_TEST] Running validation tests:', {
                problemType,
                rawTestCaseCount: rawTestCases.length,
                cleanedTestCaseCount: cleanedTestCases.length,
                usingFallback: cleanedTestCases === rawTestCases
            });

            // Execute code with cleaned test cases
            const testResults = await fastExecutionService.executeCodeWithTests(
                userCode,
                cleanedTestCases,
                language
            );

            console.log('🎯 [SUBMIT_TEST] Test results:', {
                passed: testResults.passed,
                failed: testResults.failed,
                total: testResults.total,
                success: testResults.success
            });

            // Check if all tests passed
            if (testResults.failed > 0 || !testResults.success) {
                return res.status(400).json({
                    success: false,
                    message: 'All test cases must pass before submission',
                    testResults,
                    error: 'TESTS_FAILED'
                });
            }

            // All tests passed - proceed with submission
            console.log('✅ [SUBMIT_APPROVED] All test cases pass - submission allowed');

            // TODO: Save submission to enhanced_course_submissions table
            // For now, return success response

            res.json({
                success: true,
                message: 'Solution submitted successfully! 🎉',
                testResults,
                rewards: {
                    sparks: Math.floor(Math.random() * 50) + 25, // 25-75 sparks
                    pScore: Math.floor(Math.random() * 100) + 50, // 50-150 P-score
                    experience: Math.floor(Math.random() * 25) + 10 // 10-35 XP
                },
                submissionId: `enhanced_${courseId}_${moduleIndex}_${lessonIndex}_${Date.now()}`
            });

        } catch (err) {
            console.error('❌ [SUBMIT_ERROR] Enhanced course submission failed:', err.message);
            console.error('❌ Full error stack:', err.stack);

            res.status(500).json({
                success: false,
                error: 'Submission failed due to server error',
                details: err.message
            });
        }
    }


    // Get all enhanced courses
    static async getDiscoverableEnhancedCourses(req, res) {
        try {
            const query = `
                SELECT 
                    ec.id, ec.title, ec.description, ec.difficulty_level,
                    ec.estimated_duration, ec.prerequisites, ec.learning_outcomes,
                    ec.created_at, ec.updated_at,
                    u.username as teacher_name,
                    (
                        SELECT COUNT(*) 
                        FROM json_array_elements(ec.metadata->'modules') AS module,
                        json_array_elements(module->'lessons'->'lessons') AS lesson
                    ) as lesson_count,
                    COALESCE(
                        (SELECT COUNT(*) FROM enhanced_course_enrollments WHERE course_id = ec.id), 
                        0
                    ) as enrollment_count
                FROM enhanced_courses ec
                LEFT JOIN users u ON ec.teacher_id = u.id
                WHERE ec.is_published = true
                ORDER BY ec.created_at DESC;
            `;
            const result = await pool.query(query);
            
            const coursesWithDetails = result.rows.map(course => ({
                ...course,
                prerequisites: typeof course.prerequisites === 'string' ? 
                    JSON.parse(course.prerequisites) : course.prerequisites,
                learning_objectives: typeof course.learning_outcomes === 'string' ? 
                    JSON.parse(course.learning_outcomes) : course.learning_outcomes
            }));
            
            res.json(coursesWithDetails);
        } catch (err) {
            console.error('Error fetching discoverable enhanced courses:', err.message);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    // Get single course details
    static async getEnhancedCourseDetails(req, res) {
        try {
            const { courseId } = req.params;
            
            const courseQuery = `
                SELECT 
                    ec.id, ec.title, ec.description, ec.difficulty_level,
                    ec.estimated_duration, ec.prerequisites, ec.learning_outcomes,
                    ec.metadata, ec.created_at, ec.updated_at,
                    u.username as teacher_name,
                    COALESCE(
                        (SELECT COUNT(*) FROM enhanced_course_enrollments WHERE course_id = ec.id), 
                        0
                    ) as enrollment_count
                FROM enhanced_courses ec
                LEFT JOIN users u ON ec.teacher_id = u.id
                WHERE ec.id = $1 AND ec.is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);
            
            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }
            
            const course = courseResult.rows[0];
            
            // Parse JSON fields
            course.prerequisites = typeof course.prerequisites === 'string' ? 
                JSON.parse(course.prerequisites) : course.prerequisites;
            course.learning_outcomes = typeof course.learning_outcomes === 'string' ? 
                JSON.parse(course.learning_outcomes) : course.learning_outcomes;
            
            res.json(course);
        } catch (err) {
            console.error('Error fetching enhanced course details:', err.message);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    // Enroll in enhanced course
    static async enrollInEnhancedCourse(req, res) {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            // Check if course exists and is published
            const courseCheck = await pool.query(
                'SELECT id FROM enhanced_courses WHERE id = $1 AND is_published = true',
                [courseId]
            );
            
            if (courseCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Course not found or not published' });
            }

            // Check if already enrolled
            const enrollmentCheck = await pool.query(
                'SELECT id FROM enhanced_course_enrollments WHERE course_id = $1 AND student_id = $2',
                [courseId, studentId]
            );

            if (enrollmentCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Already enrolled in this course' });
            }

            // Create enrollment table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS enhanced_course_enrollments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
                    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    enrolled_at TIMESTAMP DEFAULT NOW(),
                    progress JSONB DEFAULT '{}',
                    UNIQUE(course_id, student_id)
                );
            `);

            // Enroll student
            await pool.query(
                'INSERT INTO enhanced_course_enrollments (course_id, student_id) VALUES ($1, $2)',
                [courseId, studentId]
            );

            res.json({ success: true, message: 'Successfully enrolled in course' });
        } catch (err) {
            console.error('Error enrolling in enhanced course:', err.message);
            res.status(500).json({ error: 'Failed to enroll in course' });
        }
    }

    // Submit solution for enhanced course lesson
    static async submitEnhancedCourseSolution(req, res) {
        try {
            console.log('🚀 [SUBMIT_START] Submit solution endpoint called');

            const { courseId } = req.params;
            const { files, moduleIndex = 0, lessonIndex = 0, language = 'javascript', time_to_solve_seconds = 0, code_churn = 0 } = req.body;
            const userId = req.user.id;

            console.log('🚀 [SUBMIT_DETAILS] Submitting enhanced course solution:', {
                courseId,
                moduleIndex,
                lessonIndex,
                language,
                userId,
                filesCount: files?.length
            });

            // Get course and lesson data
            const courseQuery = `
                SELECT title, description, metadata, language
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);

            if (courseResult.rows.length === 0) {
                return res.status(404).json({ error: 'Enhanced course not found' });
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            const currentModule = modules[parseInt(moduleIndex)];
            const currentLesson = currentModule?.lessons?.lessons?.[parseInt(lessonIndex)];

            if (!currentLesson) {
                return res.status(404).json({ error: 'Lesson not found' });
            }

            const languageImpl = currentLesson.languageImplementations?.[language];
            if (!languageImpl) {
                return res.status(404).json({
                    error: `No ${language} implementation found for this lesson`
                });
            }

            // Get the user's code from files
            const mainFile = files?.find(f => f.type === 'main') || files?.[0];
            if (!mainFile) {
                return res.status(400).json({ error: 'No code file provided' });
            }

            const userCode = mainFile.content;

            // Use the same test execution as "Run Tests" to ensure consistency
            const geminiService = require('../services/geminiService');
            const testResult = await geminiService.executeCodeWithTests(
                userCode,
                {
                    title: currentLesson.title,
                    description: currentLesson.description,
                    difficulty: currentLesson.difficulty,
                    testCases: languageImpl.testCases || [],
                    examples: currentLesson.examples || []
                },
                language
            );

            console.log('🔍 [SUBMIT_VALIDATION] Test Results:', {
                passed: testResult.passed,
                failed: testResult.failed,
                total: testResult.total,
                success: testResult.success,
                fromAdvancedExecution: testResult.fromAdvancedExecution,
                testCaseResults: testResult.testCaseResults
            });

            // Strict validation: ALL test cases must pass
            if (!testResult || !testResult.success || testResult.failed > 0 || testResult.passed !== testResult.total) {
                console.log('❌ [SUBMIT_BLOCKED] Solution does not pass all test cases');
                console.log('❌ [SUBMIT_BLOCKED] Detailed failure info:', {
                    hasResult: !!testResult,
                    success: testResult?.success,
                    passed: testResult?.passed,
                    failed: testResult?.failed,
                    total: testResult?.total
                });

                return res.status(400).json({
                    success: false,
                    error: 'Your solution must pass ALL test cases before submission. Please review and fix any failing tests.',
                    testResults: testResult,
                    detailedMessage: `Currently passing ${testResult?.passed || 0}/${testResult?.total || 0} test cases. All must pass to submit.`,
                    submissionBlocked: true
                });
            }

            // Additional check for AI confidence if available
            if (testResult.fromAI && testResult.confidence === 'LOW') {
                console.log('⚠️ [SUBMIT_WARNING] Low AI confidence, requiring additional validation');

                return res.status(400).json({
                    success: false,
                    error: 'AI evaluation has low confidence in your solution. Please review and ensure your code handles all edge cases.',
                    testResults: testResult,
                    aiAnalysis: testResult.aiAnalysis,
                    feedback: testResult.feedback,
                    submissionBlocked: true,
                    confidenceIssue: true
                });
            }

            console.log('✅ [SUBMIT_APPROVED] All test cases pass - submission allowed');

            // Save submission to database (you may want to create a submissions table for enhanced courses)
            const submissionData = {
                user_id: userId,
                course_id: courseId,
                module_index: parseInt(moduleIndex),
                lesson_index: parseInt(lessonIndex),
                language: language,
                code: userCode,
                time_to_solve_seconds: time_to_solve_seconds,
                code_churn: code_churn,
                is_correct: true,
                submitted_at: new Date()
            };

            // Note: You may want to create an enhanced_course_submissions table
            // For now, we'll return success and let the ecosystem tracking handle persistence

            res.json({
                success: true,
                message: 'Excellent! Your solution passed all test cases and has been submitted successfully!',
                lesson_title: currentLesson.title,
                difficulty: currentLesson.difficulty,
                pattern: currentLesson.pattern,
                feedback_type: 'success',
                submissionData,
                aiEvaluation: {
                    testsPassed: testResult.passed,
                    totalTests: testResult.total,
                    evaluatedByAI: testResult.fromAI || false,
                    confidence: testResult.confidence || 'MEDIUM',
                    timeComplexity: testResult.timeComplexity,
                    spaceComplexity: testResult.spaceComplexity,
                    correctnessScore: testResult.correctnessScore
                },
                feedback: testResult.feedback || {
                    strengths: ['Solution correctly handles all test cases'],
                    nextSteps: 'Consider optimizing time or space complexity'
                }
            });

        } catch (error) {
            console.error('❌ Error submitting enhanced course solution:', error);
            res.status(500).json({ error: 'Server Error' });
        }
    }

    // Helper method to validate enhanced course solution using Gemini AI
    static async validateEnhancedCourseSolution(courseId, files, moduleIndex, lessonIndex, language) {
        try {
            const courseQuery = `
                SELECT title, description, metadata, language
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true;
            `;
            const courseResult = await pool.query(courseQuery, [courseId]);

            if (courseResult.rows.length === 0) {
                return { passed: 0, failed: 1, total: 1, results: 'Course not found' };
            }

            const course = courseResult.rows[0];
            const modules = course.metadata?.modules || [];
            const currentModule = modules[parseInt(moduleIndex)];
            const currentLesson = currentModule?.lessons?.lessons?.[parseInt(lessonIndex)];

            if (!currentLesson) {
                return { passed: 0, failed: 1, total: 1, results: 'Lesson not found' };
            }

            const languageImpl = currentLesson.languageImplementations?.[language];
            if (!languageImpl) {
                return { passed: 0, failed: 1, total: 1, results: `No ${language} implementation found` };
            }

            // Get the user's code from files
            const mainFile = files?.find(f => f.type === 'main') || files?.[0];
            if (!mainFile) {
                return { passed: 0, failed: 1, total: 1, results: 'No code file provided' };
            }

            const userCode = mainFile.content;

            // Use Gemini AI for comprehensive validation
            const geminiService = require('../services/geminiService');
            const aiValidation = await geminiService.evaluateCode(
                userCode,
                {
                    title: currentLesson.title,
                    description: currentLesson.description,
                    difficulty: currentLesson.difficulty,
                    testCases: languageImpl.testCases || [],
                    examples: currentLesson.examples || []
                },
                language
            );

            return aiValidation;

        } catch (error) {
            console.error('❌ Error validating solution with AI:', error);

            // Fallback to basic validation if AI fails
            const mainFile = files?.find(f => f.type === 'main') || files?.[0];
            const userCode = mainFile?.content || '';

            let hasImplementation = false;
            if (language === 'python') {
                hasImplementation = !userCode.includes('pass') && userCode.includes('def') && userCode.includes('return');
            } else if (language === 'javascript') {
                hasImplementation = !userCode.includes('// TODO') && userCode.includes('function') && userCode.includes('return');
            } else if (language === 'java') {
                hasImplementation = userCode.includes('public') && userCode.includes('return') && !userCode.includes('return null;');
            }

            return hasImplementation
                ? { passed: 1, failed: 0, total: 1, results: 'Basic validation passed (AI unavailable)' }
                : { passed: 0, failed: 1, total: 1, results: 'Please complete your implementation' };
        }
    }
}

module.exports = NewEnhancedCourseController;