const lessonMatchingService = require('./services/lessonMatchingService');
const db = require('./db');

async function testLessonContent() {
    try {
        console.log('=== COMPREHENSIVE LESSON CONTENT TEST ===\n');
        
        // Test both Step 1 and Step 2
        const stepLessons = await db.query('SELECT id, title, description, lesson_type FROM lessons WHERE title LIKE \'Step %\' ORDER BY title LIMIT 2');
        
        for (const lesson of stepLessons.rows) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`TESTING: ${lesson.title}`);
            console.log(`Description: ${lesson.description.substring(0, 100)}...`);
            console.log(`${'='.repeat(60)}\n`);
            
            try {
                // Find the best match
                const matchedLesson = await lessonMatchingService.findBestMatch(lesson);
                
                if (matchedLesson) {
                    console.log(`✅ AI MATCH FOUND:`);
                    console.log(`   Matched: ${matchedLesson.title} - ${matchedLesson.lesson_name}`);
                    console.log(`   Section: ${matchedLesson.section_name}`);
                    console.log(`   File Types: ${matchedLesson.files.map(f => f.language).join(', ')}`);
                    console.log(`   Has Solutions: ${matchedLesson.solution_files && matchedLesson.solution_files.length > 0 ? 'Yes' : 'No'}\n`);
                    
                    // Test boilerplate generation
                    console.log(`📄 BOILERPLATE FILES:`);
                    const boilerplateFiles = lessonMatchingService.generateBoilerplateFiles(matchedLesson, lesson);
                    boilerplateFiles.forEach(file => {
                        console.log(`   ${file.filename}: ${file.content.length} chars`);
                        if (file.filename === 'index.html' && file.content.length > 100) {
                            console.log(`      Preview: ${file.content.substring(0, 150)}...`);
                        }
                    });
                    
                    // Test solution generation
                    console.log(`\n🎯 SOLUTION FILES:`);
                    const solutionFiles = lessonMatchingService.generateSolutionFiles(matchedLesson, lesson);
                    solutionFiles.forEach(file => {
                        console.log(`   ${file.filename}: ${file.content.length} chars`);
                    });
                    
                    // Check if HTML content will render properly
                    const htmlFile = boilerplateFiles.find(f => f.filename === 'index.html');
                    if (htmlFile) {
                        const hasValidHtml = htmlFile.content.includes('<!DOCTYPE html>') && htmlFile.content.includes('<body>');
                        console.log(`\n🖼️  HTML RENDERING CHECK: ${hasValidHtml ? '✅ Valid HTML structure' : '❌ Invalid HTML'}`);
                        
                        const hasStyles = htmlFile.content.includes('styles.css');
                        const hasScript = htmlFile.content.includes('script.js');
                        console.log(`   CSS linked: ${hasStyles ? '✅' : '❌'}`);
                        console.log(`   JS linked: ${hasScript ? '✅' : '❌'}`);
                    }
                    
                } else {
                    console.log(`❌ NO MATCH FOUND for ${lesson.title}`);
                }
                
            } catch (error) {
                console.log(`❌ ERROR testing ${lesson.title}:`, error.message);
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('TEST COMPLETE');
        console.log(`${'='.repeat(60)}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testLessonContent();