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
                expected: example.output,
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
}

module.exports = NewEnhancedCourseController;