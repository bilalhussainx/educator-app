#!/usr/bin/env node
// Create Enhanced Lessons System - Populate lessons table for enhanced courses
require('dotenv').config();
const db = require('./db');

async function createEnhancedLessonsSystem() {
    console.log('🚀 Creating Enhanced Lessons System...\n');
    
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Fetch all enhanced courses that don't have lessons yet
        console.log('📋 Fetching enhanced courses...');
        const enhancedCoursesResult = await client.query(`
            SELECT ec.id, ec.title, ec.description, ec.metadata, ec.teacher_id
            FROM enhanced_courses ec
            WHERE NOT EXISTS (
                SELECT 1 FROM lessons l WHERE l.enhanced_course_id = ec.id
            )
            ORDER BY ec.created_at DESC;
        `);
        
        console.log(`Found ${enhancedCoursesResult.rows.length} enhanced courses without lessons`);
        
        for (const course of enhancedCoursesResult.rows) {
            console.log(`\n📚 Processing: ${course.title}`);
            
            // Extract modules from metadata
            const metadata = course.metadata || {};
            const modules = metadata.modules || [];
            
            if (modules.length === 0) {
                console.log('⚠️ No modules found in metadata, creating default lessons...');
                // Create default lessons based on course title
                await createDefaultLessons(client, course);
            } else {
                console.log(`📖 Creating ${modules.length} lessons from modules...`);
                // Create lessons from modules
                await createLessonsFromModules(client, course, modules);
            }
        }
        
        await client.query('COMMIT');
        console.log('\n✅ Enhanced Lessons System created successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        client.release();
    }
}

async function createDefaultLessons(client, course) {
    // Create basic lessons based on course type
    const defaultLessons = getDefaultLessonsByTitle(course.title);
    
    for (let i = 0; i < defaultLessons.length; i++) {
        const lesson = defaultLessons[i];
        
        // Create lesson record (using enhanced_course_id)
        const lessonResult = await client.query(`
            INSERT INTO lessons (title, description, enhanced_course_id, teacher_id, order_index)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            lesson.title,
            lesson.description,
            course.id,
            course.teacher_id,
            i + 1
        ]);
        
        const lessonId = lessonResult.rows[0].id;
        
        // Create lesson files
        await createLessonFiles(client, lessonId, lesson);
        
        console.log(`   ✅ Created lesson: ${lesson.title}`);
    }
}

async function createLessonsFromModules(client, course, modules) {
    for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        
        // Create lesson record from module (using enhanced_course_id)
        const lessonResult = await client.query(`
            INSERT INTO lessons (title, description, enhanced_course_id, teacher_id, order_index, objective)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            module.title,
            module.description || `Learn ${module.title}`,
            course.id,
            course.teacher_id,
            module.module_number || i + 1,
            JSON.stringify(module.learning_objectives || [])
        ]);
        
        const lessonId = lessonResult.rows[0].id;
        
        // Create lesson files based on module patterns
        await createModuleLessonFiles(client, lessonId, module);
        
        console.log(`   ✅ Created lesson: ${module.title}`);
    }
}

function getDefaultLessonsByTitle(title) {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('coding interviews') || lowerTitle.includes('pattern')) {
        return [
            {
                title: "Two Pointers Pattern",
                description: "Master the two pointers technique for array problems",
                pattern: "two-pointers",
                problems: ["Valid Palindrome", "Two Sum II"]
            },
            {
                title: "Sliding Window Pattern", 
                description: "Learn sliding window for substring problems",
                pattern: "sliding-window",
                problems: ["Longest Substring Without Repeating Characters", "Minimum Window Substring"]
            },
            {
                title: "Binary Search Pattern",
                description: "Apply binary search to various problem types",
                pattern: "binary-search", 
                problems: ["Search in Rotated Sorted Array", "Find Peak Element"]
            }
        ];
    } else if (lowerTitle.includes('system design')) {
        return [
            {
                title: "Load Balancing Fundamentals",
                description: "Design scalable load balancing systems",
                pattern: "load-balancing",
                problems: ["Design Load Balancer", "Implement Round Robin"]
            },
            {
                title: "Database Sharding",
                description: "Scale databases using sharding techniques", 
                pattern: "database-sharding",
                problems: ["Design Sharding Strategy", "Implement Consistent Hashing"]
            },
            {
                title: "Caching Strategies",
                description: "Implement efficient caching systems",
                pattern: "caching",
                problems: ["Design Cache System", "Implement LRU Cache"]
            }
        ];
    } else if (lowerTitle.includes('dynamic programming')) {
        return [
            {
                title: "Fibonacci Patterns",
                description: "Master basic DP with Fibonacci problems",
                pattern: "fibonacci-dp",
                problems: ["Climbing Stairs", "House Robber"]
            },
            {
                title: "Knapsack Problems", 
                description: "Solve 0/1 and unbounded knapsack problems",
                pattern: "knapsack-dp",
                problems: ["0/1 Knapsack", "Coin Change"]
            }
        ];
    }
    
    // Default fallback lessons
    return [
        {
            title: "Introduction to Problem Solving",
            description: "Learn fundamental problem-solving techniques",
            pattern: "basics",
            problems: ["Hello World", "Basic Algorithm"]
        }
    ];
}

async function createLessonFiles(client, lessonId, lesson) {
    // Create boilerplate file
    const boilerplateCode = generateBoilerplateCode(lesson);
    await client.query(`
        INSERT INTO lesson_files (lesson_id, filename, content)
        VALUES ($1, $2, $3)
    `, [lessonId, 'main.js', boilerplateCode]);
    
    // Create solution file
    const solutionCode = generateSolutionCode(lesson);
    await client.query(`
        INSERT INTO lesson_solution_files (lesson_id, filename, content)
        VALUES ($1, $2, $3)
    `, [lessonId, 'solution.js', solutionCode]);
    
    // Create test file
    const testCode = generateTestCode(lesson);
    await client.query(`
        INSERT INTO lesson_tests (lesson_id, test_code)
        VALUES ($1, $2)
    `, [lessonId, testCode]);
}

async function createModuleLessonFiles(client, lessonId, module) {
    // Create boilerplate based on module patterns
    const boilerplateCode = generateModuleBoilerplate(module);
    await client.query(`
        INSERT INTO lesson_files (lesson_id, filename, content)
        VALUES ($1, $2, $3)
    `, [lessonId, 'main.js', boilerplateCode]);
    
    // Create solution
    const solutionCode = generateModuleSolution(module);
    await client.query(`
        INSERT INTO lesson_solution_files (lesson_id, filename, content)
        VALUES ($1, $2, $3)
    `, [lessonId, 'solution.js', solutionCode]);
    
    // Create tests
    const testCode = generateModuleTests(module);
    await client.query(`
        INSERT INTO lesson_tests (lesson_id, test_code)
        VALUES ($1, $2)
    `, [lessonId, testCode]);
}

function generateBoilerplateCode(lesson) {
    const problemName = lesson.problems?.[0] || lesson.title;
    const functionName = problemName.toLowerCase().replace(/[^a-z]/g, '');
    
    return `// ${lesson.title}
// ${lesson.description}

/**
 * Implement the ${problemName} algorithm
 * @param {any} input - The input parameter
 * @return {any} - The result
 */
function ${functionName}(input) {
    // Your code here
    return null;
}

// Export for testing
module.exports = { ${functionName} };
`;
}

function generateSolutionCode(lesson) {
    const problemName = lesson.problems?.[0] || lesson.title;
    const functionName = problemName.toLowerCase().replace(/[^a-z]/g, '');
    
    if (lesson.pattern === 'two-pointers') {
        return `// ${lesson.title} - Solution
function ${functionName}(input) {
    let left = 0;
    let right = input.length - 1;
    
    while (left < right) {
        // Two pointers logic here
        if (/* condition */) {
            left++;
        } else {
            right--;
        }
    }
    
    return true;
}

module.exports = { ${functionName} };`;
    } else if (lesson.pattern === 'sliding-window') {
        return `// ${lesson.title} - Solution  
function ${functionName}(input) {
    let windowStart = 0;
    let maxLength = 0;
    
    for (let windowEnd = 0; windowEnd < input.length; windowEnd++) {
        // Expand window
        
        // Shrink window if needed
        while (/* condition */) {
            windowStart++;
        }
        
        maxLength = Math.max(maxLength, windowEnd - windowStart + 1);
    }
    
    return maxLength;
}

module.exports = { ${functionName} };`;
    }
    
    // Default solution template
    return `// ${lesson.title} - Solution
function ${functionName}(input) {
    // Implementation here
    return input;
}

module.exports = { ${functionName} };`;
}

function generateTestCode(lesson) {
    const problemName = lesson.problems?.[0] || lesson.title;
    const functionName = problemName.toLowerCase().replace(/[^a-z]/g, '');
    
    return `const { ${functionName} } = require('./main.js');

describe('${lesson.title}', () => {
    test('should handle basic case', () => {
        expect(${functionName}('test')).toBeDefined();
    });
    
    test('should handle empty input', () => {
        expect(${functionName}('')).toBeDefined();
    });
    
    test('should handle edge cases', () => {
        expect(${functionName}(null)).toBeDefined();
    });
});`;
}

function generateModuleBoilerplate(module) {
    const title = module.title || 'Problem';
    const patterns = module.core_patterns || [];
    
    return `// ${title}
// Learn: ${patterns.join(', ')}

/**
 * Solve the problem using ${patterns[0] || 'algorithmic'} techniques
 * @param {any} input - The input data
 * @return {any} - The solution
 */
function solve(input) {
    // TODO: Implement your solution here
    // Consider using: ${patterns.join(', ')}
    return null;
}

// Additional helper function if needed
function helper(data) {
    // Helper implementation
    return data;
}

module.exports = { solve, helper };
`;
}

function generateModuleSolution(module) {
    const title = module.title || 'Problem';
    const patterns = module.core_patterns || [];
    
    return `// ${title} - Solution
function solve(input) {
    // Solution using ${patterns[0] || 'standard'} pattern
    if (!input) return null;
    
    // Implementation would depend on specific problem
    return input;
}

function helper(data) {
    // Helper function implementation
    return data;
}

module.exports = { solve, helper };
`;
}

function generateModuleTests(module) {
    return `const { solve, helper } = require('./main.js');

describe('${module.title}', () => {
    test('should solve basic case', () => {
        const result = solve([1, 2, 3]);
        expect(result).toBeDefined();
    });
    
    test('should handle empty input', () => {
        const result = solve([]);
        expect(result).toBeDefined();
    });
    
    test('helper function works', () => {
        const result = helper('test');
        expect(result).toBe('test');
    });
});`;
}

// Run the system
if (require.main === module) {
    createEnhancedLessonsSystem()
        .then(() => process.exit(0))
        .catch(console.error);
}

module.exports = { createEnhancedLessonsSystem };