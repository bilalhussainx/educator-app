/**
 * =================================================================
 * ULTIMATE COURSE GENERATOR - CLAUDE API POWERED
 * =================================================================
 * Creates world-class programming courses at the level of top 0.1% developers
 * Features:
 * - Intelligent Claude API integration
 * - Multi-language support (JavaScript, Python, Java)
 * - LeetCode-style problems with progressive difficulty
 * - Pattern-based learning approach
 * - Comprehensive test cases and solutions
 * - Perfect AscentIDE integration
 */

require('dotenv').config();
const db = require('./educators-edge-backend/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class UltimateCourseGenerator {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY;
        if (!this.claudeApiKey) {
            throw new Error('CLAUDE_API_KEY not found in environment variables');
        }
        
        this.claudeClient = axios.create({
            baseURL: 'https://api.anthropic.com',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01'
            }
        });
    }

    async generateWorldClassCourse(courseSpec) {
        console.log('=� Generating world-class course:', courseSpec.title);
        
        const coursePrompt = `You are a world-class software engineering instructor creating courses for the top 0.1% of developers. 

Create a comprehensive programming course with the following specification:
- Title: ${courseSpec.title}
- Difficulty: ${courseSpec.difficulty}
- Focus Areas: ${courseSpec.focusAreas.join(', ')}
- Module Count: ${courseSpec.moduleCount}
- Lessons Per Module: ${courseSpec.lessonsPerModule}

REQUIREMENTS:
1. Course must be at the level of Google/Meta/Microsoft interview preparation
2. Each lesson should be a LeetCode-style algorithmic challenge
3. Progressive difficulty curve with proper scaffolding
4. Pattern-based learning (Sliding Window, Two Pointers, DFS/BFS, etc.)
5. Real-world applications and optimizations
6. Time/Space complexity analysis

STRUCTURE NEEDED:
{
  "title": "Course Title",
  "description": "Comprehensive course description",
  "difficulty_level": "${courseSpec.difficulty}",
  "estimated_duration": "X hours",
  "prerequisites": ["prerequisite1", "prerequisite2"],
  "learning_objectives": ["objective1", "objective2"],
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "estimated_duration": "X hours",
      "core_patterns": ["Pattern1", "Pattern2"],
      "lessons": {
        "count": ${courseSpec.lessonsPerModule},
        "lessons": [
          {
            "title": "Lesson Title",
            "description": "Algorithmic problem description",
            "pattern": "Algorithm Pattern",
            "difficulty": "easy/medium/hard",
            "time_complexity": "O(n)",
            "space_complexity": "O(1)",
            "constraints": ["1 <= n <= 10^5"],
            "examples": [
              {
                "input": "example input",
                "output": "expected output",
                "explanation": "why this works"
              }
            ],
            "hints": ["hint1", "hint2"],
            "real_world_applications": ["application1", "application2"]
          }
        ]
      }
    }
  ]
}

Return ONLY valid JSON. No markdown formatting.`;

        try {
            const response = await this.claudeClient.post('/v1/messages', {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 8000,
                messages: [{
                    role: 'user',
                    content: coursePrompt
                }]
            });

            const courseData = JSON.parse(response.data.content[0].text);
            console.log(' Course structure generated successfully');
            return courseData;
        } catch (error) {
            console.error('L Error generating course:', error.response?.data || error.message);
            throw error;
        }
    }

    async generateLanguageSpecificCode(lesson, language = 'javascript') {
        console.log(`=' Generating ${language} code for:`, lesson.title);
        
        const codePrompt = `Generate production-quality ${language} code for this algorithmic problem:

PROBLEM: ${lesson.title}
DESCRIPTION: ${lesson.description}
PATTERN: ${lesson.pattern}
DIFFICULTY: ${lesson.difficulty}
TIME COMPLEXITY: ${lesson.time_complexity}
SPACE COMPLEXITY: ${lesson.space_complexity}
CONSTRAINTS: ${lesson.constraints?.join(', ')}

Generate 3 components:
1. STARTER CODE: Template with function signature, comments, and TODO instructions
2. SOLUTION CODE: Complete, optimized implementation with comments
3. TEST CASES: Comprehensive test suite including edge cases

LANGUAGE-SPECIFIC REQUIREMENTS:
${language === 'javascript' ? `
- Use modern ES6+ syntax
- Include JSDoc comments
- Use const/let appropriately
- Include console.log test cases
` : language === 'python' ? `
- Use type hints and docstrings
- Follow PEP 8 conventions
- Include unittest test cases
- Use snake_case naming
` : `
- Use proper Java naming conventions
- Include Javadoc comments
- Use JUnit test cases
- Include proper class structure
`}

Return as JSON:
{
  "starterCode": "template code with TODOs",
  "solutionCode": "complete optimized solution",
  "testCases": "comprehensive test suite",
  "explanation": "detailed explanation of approach and optimizations"
}

Return ONLY valid JSON.`;

        try {
            const response = await this.claudeClient.post('/v1/messages', {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: codePrompt
                }]
            });

            const codeData = JSON.parse(response.data.content[0].text);
            console.log(` ${language} code generated successfully`);
            return codeData;
        } catch (error) {
            console.error(`L Error generating ${language} code:`, error.response?.data || error.message);
            throw error;
        }
    }

    getMainFileName(language) {
        const fileMap = {
            'javascript': 'main.js',
            'python': 'main.py',
            'java': 'Solution.java',
            'cpp': 'main.cpp',
            'c': 'main.c'
        };
        return fileMap[language] || 'main.js';
    }

    getTestFileName(language) {
        const testMap = {
            'javascript': 'test.js',
            'python': 'test_main.py',
            'java': 'SolutionTest.java',
            'cpp': 'test.cpp',
            'c': 'test.c'
        };
        return testMap[language] || 'test.js';
    }

    async saveCourseToDatabase(courseData, teacherId = 'system') {
        console.log('=� Saving course to database...');
        
        try {
            // Create the enhanced course
            const courseId = uuidv4();
            await db.query(`
                INSERT INTO enhanced_courses (
                    id, title, description, difficulty_level, estimated_duration,
                    prerequisites, learning_objectives, metadata, teacher_id, is_published
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                courseId,
                courseData.title,
                courseData.description,
                courseData.difficulty_level,
                courseData.estimated_duration,
                JSON.stringify(courseData.prerequisites || []),
                JSON.stringify(courseData.learning_objectives || []),
                JSON.stringify(courseData),
                teacherId,
                true
            ]);

            console.log(' Course saved with ID:', courseId);
            return courseId;
        } catch (error) {
            console.error('L Error saving course:', error.message);
            throw error;
        }
    }

    async generateCompleteCourse(spec) {
        console.log('<� Starting complete course generation...');
        
        try {
            // Step 1: Generate course structure
            const courseData = await this.generateWorldClassCourse(spec);
            
            // Step 2: Generate code for each lesson in all languages
            for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
                const module = courseData.modules[moduleIndex];
                console.log(`=� Processing module ${moduleIndex + 1}: ${module.title}`);
                
                for (let lessonIndex = 0; lessonIndex < module.lessons.lessons.length; lessonIndex++) {
                    const lesson = module.lessons.lessons[lessonIndex];
                    console.log(`=� Processing lesson ${lessonIndex + 1}: ${lesson.title}`);
                    
                    // Generate code for each supported language
                    const languages = ['javascript', 'python', 'java'];
                    lesson.languageImplementations = {};
                    
                    for (const language of languages) {
                        const codeData = await this.generateLanguageSpecificCode(lesson, language);
                        lesson.languageImplementations[language] = codeData;
                        
                        // Add small delay to respect API rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            // Step 3: Save to database
            const courseId = await this.saveCourseToDatabase(courseData);
            
            console.log('<� Course generation completed successfully!');
            console.log('Course ID:', courseId);
            
            return { courseId, courseData };
        } catch (error) {
            console.error('=� Course generation failed:', error.message);
            throw error;
        }
    }

    async generateExampleCourses() {
        console.log('=� Generating example world-class courses...');
        
        const courses = [
            {
                title: "Advanced Data Structures & Algorithms Mastery",
                difficulty: "advanced",
                focusAreas: ["algorithms", "data-structures", "optimization"],
                moduleCount: 4,
                lessonsPerModule: 5
            },
            {
                title: "Dynamic Programming Patterns & Techniques",
                difficulty: "intermediate",
                focusAreas: ["dynamic-programming", "optimization", "recursion"],
                moduleCount: 3,
                lessonsPerModule: 6
            },
            {
                title: "Graph Algorithms for Technical Interviews",
                difficulty: "advanced",
                focusAreas: ["graphs", "algorithms", "interview-prep"],
                moduleCount: 3,
                lessonsPerModule: 5
            }
        ];
        
        const results = [];
        
        for (const courseSpec of courses) {
            try {
                const result = await this.generateCompleteCourse(courseSpec);
                results.push(result);
                console.log(` Generated: ${courseSpec.title}`);
                
                // Longer delay between courses
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`L Failed to generate: ${courseSpec.title}`, error.message);
            }
        }
        
        return results;
    }
}

// CLI Interface
async function main() {
    const generator = new UltimateCourseGenerator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate-examples':
            await generator.generateExampleCourses();
            break;
            
        case 'generate-custom':
            const customSpec = {
                title: process.argv[3] || "Custom Algorithm Course",
                difficulty: process.argv[4] || "intermediate",
                focusAreas: (process.argv[5] || "algorithms,data-structures").split(','),
                moduleCount: parseInt(process.argv[6]) || 3,
                lessonsPerModule: parseInt(process.argv[7]) || 5
            };
            await generator.generateCompleteCourse(customSpec);
            break;
            
        default:
            console.log(`
=� Ultimate Course Generator - Claude API Powered

Commands:
  generate-examples                     Generate 3 example world-class courses
  generate-custom [title] [difficulty] [focusAreas] [modules] [lessons]
  
Examples:
  node ultimateCourseGenerator.js generate-examples
  node ultimateCourseGenerator.js generate-custom "Advanced Trees" advanced "trees,algorithms" 4 6
  
Environment:
  CLAUDE_API_KEY=your_claude_api_key_here
            `);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = UltimateCourseGenerator;