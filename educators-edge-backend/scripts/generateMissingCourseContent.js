/**
 * =================================================================
 * FOLDER: educators-edge-backend/
 * FILE:   generateMissingCourseContent.js
 * =================================================================
 * DESCRIPTION: Script to generate missing content for enhanced courses
 * using Claude API integration
 */

require('dotenv').config();
const claudeCourseController = require('./controllers/claudeCourseController');

async function generateMissingContent() {
    try {
        console.log('🚀 Starting course content generation process...');
        
        // Mock request/response objects
        const mockReq = {
            body: {},
            user: { id: 'system' }
        };
        
        const mockRes = {
            json: (data) => {
                console.log('✅ Generation Results:');
                console.log(JSON.stringify(data, null, 2));
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`❌ Error (${code}):`, data);
                    return data;
                }
            })
        };

        // Generate missing content for all incomplete courses
        await claudeCourseController.generateMissingContent(mockReq, mockRes);
        
        console.log('🎉 Course content generation completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Script error:', error);
        process.exit(1);
    }
}

// Generate a new specialized course example
async function generateExampleCourse() {
    try {
        console.log('🎯 Generating example specialized course...');
        
        const mockReq = {
            body: {
                title: "Advanced JavaScript Algorithms & Data Structures",
                language: "javascript",
                difficulty: "intermediate",
                focusAreas: ["algorithms", "data-structures", "problem-solving", "optimization"],
                courseType: "coding-patterns",
                moduleCount: 5,
                lessonsPerModule: 6
            },
            user: { id: 'system' }
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`✅ Course Generated (${code}):`);
                    console.log('Title:', data.course?.title);
                    console.log('Modules:', data.moduleCount);
                    console.log('Lessons:', data.lessonCount);
                    console.log('Course ID:', data.course?.id);
                    return data;
                }
            }),
            json: (data) => {
                console.log('✅ Course Generated:');
                console.log('Title:', data.course?.title);
                console.log('Modules:', data.moduleCount);
                console.log('Lessons:', data.lessonCount);
                return data;
            }
        };

        await claudeCourseController.generateSpecializedCourse(mockReq, mockRes);
        
        console.log('🎉 Example course generation completed!');

    } catch (error) {
        console.error('❌ Example course generation error:', error);
    }
}

// Check course generation stats
async function checkStats() {
    try {
        console.log('📊 Checking course generation statistics...');
        
        const mockReq = {};
        const mockRes = {
            json: (data) => {
                console.log('📈 Course Statistics:');
                console.log(`Total Courses: ${data.stats?.totalCourses || 0}`);
                console.log(`Courses with Modules: ${data.stats?.coursesWithModules || 0}`);
                console.log(`Courses without Modules: ${data.stats?.coursesWithoutModules || 0}`);
                console.log(`Total Modules: ${data.stats?.totalModules || 0}`);
                console.log(`Average Modules per Course: ${data.stats?.avgModulesPerCourse || 0}`);
                console.log(`Claude API Status: ${data.claudeApiStatus}`);
                
                if (data.recentCourses?.length > 0) {
                    console.log('\n📚 Recent Courses:');
                    data.recentCourses.forEach((course, index) => {
                        console.log(`${index + 1}. ${course.title} (${course.module_count} modules)`);
                    });
                }
                
                return data;
            }
        };

        await claudeCourseController.getCourseGenerationStats(mockReq, mockRes);

    } catch (error) {
        console.error('❌ Stats check error:', error);
    }
}

// Main execution
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'generate-missing':
            await generateMissingContent();
            break;
        case 'generate-example':
            await generateExampleCourse();
            break;
        case 'stats':
            await checkStats();
            break;
        case 'all':
            await checkStats();
            console.log('\n' + '='.repeat(50));
            await generateMissingContent();
            console.log('\n' + '='.repeat(50));
            await generateExampleCourse();
            break;
        default:
            console.log('📖 Usage:');
            console.log('  node generateMissingCourseContent.js generate-missing  # Generate content for incomplete courses');
            console.log('  node generateMissingCourseContent.js generate-example  # Generate a new example course');
            console.log('  node generateMissingCourseContent.js stats            # Check course statistics');
            console.log('  node generateMissingCourseContent.js all              # Run all commands');
            break;
    }
}

// Handle script execution
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    generateMissingContent,
    generateExampleCourse,
    checkStats
};