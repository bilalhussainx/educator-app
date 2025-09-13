/**
 * =================================================================
 * FOLDER: controllers/
 * FILE:   claudeCourseController.js
 * =================================================================
 * DESCRIPTION: Controller for Claude API-powered course generation
 */

const pool = require('../db');
const claudeApiService = require('../services/claudeApiService');
const { v4: uuidv4 } = require('uuid');

// Generate specialized course using Claude API
exports.generateSpecializedCourse = async (req, res) => {
    try {
        const {
            title,
            language = 'javascript',
            difficulty = 'intermediate',
            focusAreas = ['algorithms', 'data-structures'],
            courseType = 'coding-patterns',
            moduleCount = 4,
            lessonsPerModule = 5,
            prompt
        } = req.body;

        console.log('🚀 Generating specialized course with Claude API...');
        console.log('Course config:', { title, language, difficulty, focusAreas, courseType });

        let courseData;

        if (prompt) {
            // Generate course from natural language prompt
            courseData = await claudeApiService.generateCourseFromPrompt(prompt, {
                difficulty,
                languages: [language],
                focusAreas
            });
        } else {
            // Generate course from structured config
            courseData = await claudeApiService.generateSpecializedCourse({
                title,
                language,
                difficulty,
                focusAreas,
                courseType,
                moduleCount,
                lessonsPerModule
            });
        }

        // Add additional metadata
        courseData.id = uuidv4();
        courseData.is_published = true;
        courseData.course_type = 'premium';
        courseData.created_by = req.user?.id || 'system';
        courseData.tags = focusAreas;

        // Save to database
        const insertQuery = `
            INSERT INTO enhanced_courses (
                id, title, description, language, difficulty_level,
                estimated_duration, prerequisites, learning_objectives,
                metadata, is_published, course_type, created_by, tags, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            RETURNING *;
        `;

        const values = [
            courseData.id,
            courseData.title,
            courseData.description,
            courseData.language,
            courseData.difficulty_level,
            courseData.estimated_duration,
            JSON.stringify(courseData.prerequisites || []),
            JSON.stringify(courseData.learning_objectives || []),
            JSON.stringify(courseData.metadata),
            courseData.is_published,
            courseData.course_type,
            courseData.created_by,
            JSON.stringify(courseData.tags || [])
        ];

        const result = await pool.query(insertQuery, values);
        const savedCourse = result.rows[0];

        console.log('✅ Successfully generated and saved specialized course:', savedCourse.id);

        res.status(201).json({
            success: true,
            message: 'Specialized course generated successfully',
            course: savedCourse,
            moduleCount: courseData.metadata?.modules?.length || 0,
            lessonCount: courseData.metadata?.modules?.reduce((total, module) => 
                total + (module.lessons?.lessons?.length || 0), 0) || 0
        });

    } catch (error) {
        console.error('❌ Error generating specialized course:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate specialized course',
            details: error.message
        });
    }
};

// Enhance existing course with additional content
exports.enhanceExistingCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { enhancementType = 'add_lessons', additionalModules = 2 } = req.body;

        console.log('🔧 Enhancing existing course:', courseId);

        // Get existing course
        const existingCourse = await pool.query(
            'SELECT * FROM enhanced_courses WHERE id = $1',
            [courseId]
        );

        if (existingCourse.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        const course = existingCourse.rows[0];
        
        // Generate enhancement content using Claude
        const enhancementData = await claudeApiService.enhanceExistingCourse(courseId, enhancementType);

        // Merge with existing course content
        const updatedMetadata = { ...course.metadata };
        
        if (enhancementType === 'add_lessons') {
            // Add new lessons to existing modules
            if (enhancementData.modules) {
                enhancementData.modules.forEach((newModule, index) => {
                    if (updatedMetadata.modules[index]) {
                        const existingLessons = updatedMetadata.modules[index].lessons?.lessons || [];
                        const newLessons = newModule.lessons?.lessons || [];
                        updatedMetadata.modules[index].lessons.lessons = [...existingLessons, ...newLessons];
                    }
                });
            }
        } else if (enhancementType === 'add_modules') {
            // Add completely new modules
            if (enhancementData.modules) {
                updatedMetadata.modules = [...(updatedMetadata.modules || []), ...enhancementData.modules];
            }
        }

        // Update course in database
        const updateQuery = `
            UPDATE enhanced_courses 
            SET metadata = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *;
        `;

        const updateResult = await pool.query(updateQuery, [JSON.stringify(updatedMetadata), courseId]);
        const updatedCourse = updateResult.rows[0];

        console.log('✅ Successfully enhanced course:', courseId);

        res.json({
            success: true,
            message: 'Course enhanced successfully',
            course: updatedCourse,
            enhancement: {
                type: enhancementType,
                addedModules: enhancementData.modules?.length || 0,
                addedLessons: enhancementData.modules?.reduce((total, module) => 
                    total + (module.lessons?.lessons?.length || 0), 0) || 0
            }
        });

    } catch (error) {
        console.error('❌ Error enhancing course:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enhance course',
            details: error.message
        });
    }
};

// Generate content for courses missing modules/lessons
exports.generateMissingContent = async (req, res) => {
    try {
        console.log('🔍 Checking for courses with missing content...');

        // Find courses with empty or missing modules
        const incompleteCoursesQuery = `
            SELECT id, title, metadata, language, difficulty_level
            FROM enhanced_courses 
            WHERE 
                is_published = true AND 
                (
                    metadata IS NULL OR 
                    metadata->>'modules' IS NULL OR 
                    jsonb_array_length(metadata->'modules') = 0 OR
                    EXISTS (
                        SELECT 1 FROM jsonb_array_elements(metadata->'modules') AS module 
                        WHERE (
                            module->'lessons' IS NULL OR 
                            module->'lessons'->'lessons' IS NULL OR 
                            jsonb_array_length(module->'lessons'->'lessons') = 0
                        )
                    )
                )
            ORDER BY created_at DESC;
        `;

        const incompleteCourses = await pool.query(incompleteCoursesQuery);
        
        console.log(`📊 Found ${incompleteCourses.rows.length} courses needing content generation`);

        const results = [];

        for (const course of incompleteCourses.rows) {
            try {
                console.log(`🔧 Generating content for: ${course.title}`);

                // Generate complete course content
                const courseData = await claudeApiService.generateSpecializedCourse({
                    title: course.title,
                    language: course.language || 'javascript',
                    difficulty: course.difficulty_level || 'intermediate',
                    focusAreas: ['algorithms', 'data-structures', 'problem-solving'],
                    courseType: 'coding-patterns',
                    moduleCount: 4,
                    lessonsPerModule: 5
                });

                // Update course with generated content
                const updateQuery = `
                    UPDATE enhanced_courses 
                    SET 
                        metadata = $1,
                        description = $2,
                        estimated_duration = $3,
                        prerequisites = $4,
                        learning_objectives = $5,
                        updated_at = NOW()
                    WHERE id = $6 
                    RETURNING title, id;
                `;

                const updateResult = await pool.query(updateQuery, [
                    JSON.stringify(courseData.metadata),
                    courseData.description,
                    courseData.estimated_duration,
                    JSON.stringify(courseData.prerequisites || []),
                    JSON.stringify(courseData.learning_objectives || []),
                    course.id
                ]);

                results.push({
                    courseId: course.id,
                    title: course.title,
                    status: 'success',
                    modulesGenerated: courseData.metadata?.modules?.length || 0,
                    lessonsGenerated: courseData.metadata?.modules?.reduce((total, module) => 
                        total + (module.lessons?.lessons?.length || 0), 0) || 0
                });

                console.log(`✅ Generated content for: ${course.title}`);

            } catch (error) {
                console.error(`❌ Failed to generate content for ${course.title}:`, error.message);
                results.push({
                    courseId: course.id,
                    title: course.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        res.json({
            success: true,
            message: 'Content generation completed',
            summary: {
                totalCourses: incompleteCourses.rows.length,
                successful: successCount,
                failed: errorCount
            },
            results
        });

    } catch (error) {
        console.error('❌ Error in generateMissingContent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate missing content',
            details: error.message
        });
    }
};

// Get course generation status and statistics
exports.getCourseGenerationStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_courses,
                COUNT(CASE WHEN metadata IS NOT NULL AND metadata->>'modules' IS NOT NULL THEN 1 END) as courses_with_modules,
                COUNT(CASE WHEN metadata IS NULL OR metadata->>'modules' IS NULL THEN 1 END) as courses_without_modules,
                SUM(
                    CASE 
                        WHEN metadata->>'modules' IS NOT NULL 
                        THEN jsonb_array_length(metadata->'modules') 
                        ELSE 0 
                    END
                ) as total_modules,
                AVG(
                    CASE 
                        WHEN metadata->>'modules' IS NOT NULL 
                        THEN jsonb_array_length(metadata->'modules') 
                        ELSE 0 
                    END
                ) as avg_modules_per_course
            FROM enhanced_courses 
            WHERE is_published = true;
        `;

        const stats = await pool.query(statsQuery);
        const courseStats = stats.rows[0];

        // Get recent courses
        const recentCoursesQuery = `
            SELECT id, title, created_at, 
                   CASE 
                       WHEN metadata->>'modules' IS NOT NULL 
                       THEN jsonb_array_length(metadata->'modules') 
                       ELSE 0 
                   END as module_count
            FROM enhanced_courses 
            WHERE is_published = true 
            ORDER BY created_at DESC 
            LIMIT 10;
        `;

        const recentCourses = await pool.query(recentCoursesQuery);

        res.json({
            success: true,
            stats: {
                totalCourses: parseInt(courseStats.total_courses),
                coursesWithModules: parseInt(courseStats.courses_with_modules),
                coursesWithoutModules: parseInt(courseStats.courses_without_modules),
                totalModules: parseInt(courseStats.total_modules),
                avgModulesPerCourse: parseFloat(courseStats.avg_modules_per_course).toFixed(2)
            },
            recentCourses: recentCourses.rows,
            claudeApiStatus: claudeApiService.apiKey ? 'configured' : 'not_configured'
        });

    } catch (error) {
        console.error('❌ Error getting course generation stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get course statistics',
            details: error.message
        });
    }
};