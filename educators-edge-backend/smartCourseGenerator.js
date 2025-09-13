// FILE: smartCourseGenerator.js
// Advanced AI Course Generator using FreeCodeCamp Solutions

require('dotenv').config();
const db = require('./db');
const { AIService, Logger, AIServiceError } = require('./services/aiCourseService');

// --- CONFIGURATION ---
const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa';
const BATCH_SIZE = 50; // Process lessons in batches
const MIN_LESSONS_FOR_COURSE = 6;
const MAX_LESSONS_PER_COURSE = 12;

class SmartCourseGenerator {
    constructor() {
        this.aiService = new AIService();
        this.generatedCourses = [];
        this.processedLessons = new Set();
    }

    async generateCoursesFromFreeCodeCamp(options = {}) {
        const {
            targetLanguage = 'javascript',
            maxCourses = 5,
            difficulty = 'all', // 'beginner', 'intermediate', 'advanced', 'all'
            focusAreas = [], // ['algorithms', 'data-structures', 'web-development', etc.]
            minLessonsPerCourse = MIN_LESSONS_FOR_COURSE,
            maxLessonsPerCourse = MAX_LESSONS_PER_COURSE
        } = options;

        await Logger.info('Starting smart course generation from FreeCodeCamp solutions', {
            targetLanguage,
            maxCourses,
            difficulty,
            focusAreas
        });

        const client = await db.pool.connect();

        try {
            // Step 1: Fetch and analyze FreeCodeCamp lessons
            const lessons = await this.fetchEnrichedLessons(client, targetLanguage, focusAreas);
            if (lessons.length < minLessonsPerCourse) {
                throw new Error(`Insufficient lessons found. Need at least ${minLessonsPerCourse}, found ${lessons.length}`);
            }

            await Logger.info(`Fetched ${lessons.length} enriched lessons for analysis`);

            // Step 2: AI Analysis to identify course themes
            const analysis = await this.aiService.analyzeFreeCodeCampLessons(lessons);
            await Logger.info('AI analysis completed', { 
                coursesIdentified: analysis.recommended_courses.length,
                themes: analysis.recommended_courses.map(c => c.theme)
            });

            // Step 3: Generate detailed courses
            const coursesToGenerate = analysis.recommended_courses.slice(0, maxCourses);
            for (const courseTheme of coursesToGenerate) {
                await this.generateAndSaveCourse(client, courseTheme, lessons, {
                    minLessonsPerCourse,
                    maxLessonsPerCourse,
                    targetLanguage
                });
            }

            await Logger.info(`Successfully generated ${this.generatedCourses.length} courses`);
            return this.generatedCourses;

        } catch (error) {
            await Logger.error('Course generation failed', { error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    async fetchEnrichedLessons(client, language, focusAreas) {
        let whereClause = 'WHERE language = $1 AND chapter IS NOT NULL AND solution_files IS NOT NULL';
        let params = [language];

        if (focusAreas.length > 0) {
            const focusConditions = focusAreas.map((_, index) => 
                `(LOWER(chapter) LIKE $${index + 2} OR LOWER(sub_chapter) LIKE $${index + 2})`
            ).join(' OR ');
            whereClause += ` AND (${focusConditions})`;
            params = params.concat(focusAreas.map(area => `%${area.toLowerCase()}%`));
        }

        const query = `
            SELECT 
                id, title, description, files, solution_files, test_code,
                section_name, lesson_name, language, chapter, sub_chapter,
                lesson_type, source_file
            FROM ingested_lessons 
            ${whereClause}
            ORDER BY chapter, sub_chapter, title
            LIMIT 200
        `;

        const result = await client.query(query, params);
        return result.rows.map(row => ({
            ...row,
            files: this.safeJsonParse(row.files),
            solution_files: this.safeJsonParse(row.solution_files),
            test_code: this.safeJsonParse(row.test_code)
        }));
    }

    async generateAndSaveCourse(client, courseTheme, allLessons, options) {
        try {
            await Logger.info(`Generating course: ${courseTheme.theme}`);

            // Select relevant lessons for this course theme
            const selectedLessons = this.selectLessonsForTheme(
                courseTheme, 
                allLessons, 
                options.minLessonsPerCourse, 
                options.maxLessonsPerCourse
            );

            if (selectedLessons.length < options.minLessonsPerCourse) {
                await Logger.warn(`Insufficient lessons for theme: ${courseTheme.theme}. Found ${selectedLessons.length}, need ${options.minLessonsPerCourse}`);
                return null;
            }

            // Generate detailed course structure
            const courseDetails = await this.aiService.generateCourseFromSolutions(courseTheme, selectedLessons);

            // Create course in database
            await client.query('BEGIN');

            const courseInsertResult = await client.query(`
                INSERT INTO courses (title, description, teacher_id, is_published, difficulty_level, estimated_duration, prerequisites, learning_outcomes, language)
                VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8)
                RETURNING id
            `, [
                courseDetails.course.title,
                courseDetails.course.description,
                TEACHER_ID,
                courseDetails.course.difficulty_level || 'intermediate',
                courseDetails.course.estimated_duration || '4 weeks',
                JSON.stringify(courseDetails.course.prerequisites || []),
                JSON.stringify(courseDetails.course.learning_outcomes || []),
                options.targetLanguage
            ]);

            const courseId = courseInsertResult.rows[0].id;

            // Generate and save detailed lesson content
            let orderIndex = 1;
            for (const lessonPlan of courseDetails.curriculum) {
                await this.generateAndSaveLesson(client, courseId, lessonPlan, orderIndex++);
            }

            // Save course metadata
            await client.query(`
                UPDATE courses 
                SET metadata = $1 
                WHERE id = $2
            `, [
                JSON.stringify({
                    originalTheme: courseTheme,
                    generationSource: 'freeCodeCamp_solutions',
                    totalLessons: courseDetails.curriculum.length,
                    assessmentStrategy: courseDetails.assessment_strategy,
                    sourceData: selectedLessons.map(l => ({ id: l.id, title: l.title }))
                }),
                courseId
            ]);

            await client.query('COMMIT');

            const generatedCourse = {
                id: courseId,
                title: courseDetails.course.title,
                description: courseDetails.course.description,
                lessonCount: courseDetails.curriculum.length,
                theme: courseTheme.theme,
                difficulty: courseDetails.course.difficulty_level
            };

            this.generatedCourses.push(generatedCourse);
            await Logger.info(`Successfully created course: ${courseDetails.course.title}`, { courseId });

            return generatedCourse;

        } catch (error) {
            await client.query('ROLLBACK');
            await Logger.error(`Failed to generate course for theme: ${courseTheme.theme}`, { error: error.message });
            throw error;
        }
    }

    async generateAndSaveLesson(client, courseId, lessonPlan, orderIndex) {
        try {
            // Generate detailed lesson content using AI
            const lessonContent = await this.aiService.createLessonContent(lessonPlan);

            // Insert lesson
            const lessonInsertResult = await client.query(`
                INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, order_index, objective, language, difficulty_level)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                lessonContent.lesson_content.introduction ? 
                    lessonPlan.title : 
                    lessonContent.lesson_content.introduction.substring(0, 200),
                lessonContent.lesson_content.introduction || lessonPlan.description,
                courseId,
                TEACHER_ID,
                'algorithmic', // Default type, can be enhanced
                orderIndex,
                lessonContent.lesson_content.main_concepts.join('; '),
                'javascript', // Default, can be made dynamic
                lessonPlan.problems?.[0]?.difficulty || 'medium'
            ]);

            const lessonId = lessonInsertResult.rows[0].id;

            // Insert lesson files (boilerplate code)
            for (const problem of lessonContent.lesson_content.problems) {
                if (problem.boilerplate_code) {
                    for (const [language, code] of Object.entries(problem.boilerplate_code)) {
                        await client.query(`
                            INSERT INTO lesson_files (filename, content, lesson_id, file_type)
                            VALUES ($1, $2, $3, $4)
                        `, [
                            `${problem.title.toLowerCase().replace(/\s+/g, '-')}.${this.getFileExtension(language)}`,
                            code,
                            lessonId,
                            'boilerplate'
                        ]);
                    }
                }

                // Insert solution files
                if (problem.solution_code) {
                    for (const [language, code] of Object.entries(problem.solution_code)) {
                        await client.query(`
                            INSERT INTO lesson_files (filename, content, lesson_id, file_type)
                            VALUES ($1, $2, $3, $4)
                        `, [
                            `solution-${problem.title.toLowerCase().replace(/\s+/g, '-')}.${this.getFileExtension(language)}`,
                            code,
                            lessonId,
                            'solution'
                        ]);
                    }
                }
            }

            // Insert test cases
            await client.query(`
                INSERT INTO lesson_tests (test_code, lesson_id, test_data)
                VALUES ($1, $2, $3)
            `, [
                JSON.stringify(lessonContent.lesson_content.problems.map(p => p.test_cases)),
                lessonId,
                JSON.stringify({
                    testFramework: 'jest',
                    problems: lessonContent.lesson_content.problems
                })
            ]);

            await Logger.info(`Created lesson: ${lessonPlan.title}`, { lessonId, courseId });

        } catch (error) {
            await Logger.error(`Failed to create lesson: ${lessonPlan.title}`, { error: error.message });
            throw error;
        }
    }

    selectLessonsForTheme(theme, allLessons, minLessons, maxLessons) {
        // Smart lesson selection based on theme keywords and difficulty progression
        const themeKeywords = [
            theme.theme.toLowerCase(),
            ...(theme.learning_objectives || []).join(' ').toLowerCase().split(/\s+/),
            ...(theme.unique_selling_points || []).join(' ').toLowerCase().split(/\s+/)
        ].filter(keyword => keyword.length > 3);

        const scoredLessons = allLessons.map(lesson => {
            let score = 0;
            const searchText = `${lesson.title} ${lesson.description} ${lesson.chapter} ${lesson.sub_chapter}`.toLowerCase();

            // Score based on keyword matches
            themeKeywords.forEach(keyword => {
                const matches = (searchText.match(new RegExp(keyword, 'g')) || []).length;
                score += matches * 2;
            });

            // Prefer lessons with solution files
            if (lesson.solution_files && Object.keys(lesson.solution_files).length > 0) {
                score += 3;
            }

            // Prefer lessons with good descriptions
            if (lesson.description && lesson.description.length > 100) {
                score += 1;
            }

            return { lesson, score };
        });

        // Sort by score and select top lessons
        const selectedLessons = scoredLessons
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxLessons)
            .map(item => item.lesson);

        return selectedLessons.length >= minLessons ? selectedLessons : [];
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'cs',
            typescript: 'ts'
        };
        return extensions[language.toLowerCase()] || 'txt';
    }

    safeJsonParse(jsonString) {
        if (!jsonString) return null;
        try {
            return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        } catch {
            return null;
        }
    }
}

// --- MAIN EXECUTION FUNCTION ---
async function main() {
    const args = process.argv.slice(2);
    const options = {
        targetLanguage: args[0] || 'javascript',
        maxCourses: parseInt(args[1]) || 3,
        difficulty: args[2] || 'all',
        focusAreas: args[3] ? args[3].split(',') : []
    };

    console.log(`
🚀 Smart Course Generator
========================
Target Language: ${options.targetLanguage}
Max Courses: ${options.maxCourses}
Difficulty: ${options.difficulty}
Focus Areas: ${options.focusAreas.join(', ') || 'All'}
    `);

    try {
        const generator = new SmartCourseGenerator();
        const courses = await generator.generateCoursesFromFreeCodeCamp(options);

        console.log(`
✅ SUCCESS! Generated ${courses.length} courses:
${courses.map((course, index) => 
    `${index + 1}. "${course.title}" (${course.lessonCount} lessons, ${course.difficulty})`
).join('\n')}

🎯 Next Steps:
- Review the generated courses in your dashboard
- Customize lesson content if needed
- Publish when ready for students
- Run AI supervisors during coding sessions

📊 Usage: node smartCourseGenerator.js [language] [maxCourses] [difficulty] [focusAreas]
Example: node smartCourseGenerator.js javascript 5 intermediate "algorithms,data-structures"
        `);

    } catch (error) {
        console.error(`
❌ Course Generation Failed
Error: ${error.message}

Troubleshooting:
1. Check your database connection
2. Ensure ANTHROPIC_API_KEY is set in .env
3. Verify FreeCodeCamp lessons are properly ingested
4. Check logs for detailed error information
        `);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SmartCourseGenerator };