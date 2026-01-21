/**
 * =================================================================
 * CLAUDE COURSE CATEGORIZER
 * =================================================================
 * Uses Claude AI to categorize LeetCode problems into structured courses
 * Creates learning paths and difficulty progressions
 */

require('dotenv').config();
const axios = require('axios');
const LeetCodeRepoManager = require('./leetcode-repo-manager');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class ClaudeCourseCategorizor {
    constructor() {
        this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
        this.repoManager = new LeetCodeRepoManager();
        
        if (!this.claudeApiKey) {
            throw new Error('ANTHROPIC_API_KEY not found in environment variables');
        }
        
        this.claudeClient = axios.create({
            baseURL: 'https://api.anthropic.com',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01'
            }
        });

        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    /**
     * Categorize all LeetCode problems into courses using Claude AI
     */
    async categorizeProblemsToCourses() {
        console.log('🤖 Starting Claude-powered course categorization...');
        
        try {
            // Get all available problems
            await this.repoManager.setupRepository();
            const problems = await this.repoManager.getAvailableProblems();
            
            console.log(`📚 Analyzing ${problems.length} LeetCode problems...`);
            
            // Create problem summaries for Claude
            const problemSummaries = problems.slice(0, 100).map(p => ({
                number: p.number,
                title: p.title,
                languages: Array.from(p.languages.keys())
            }));
            
            // Ask Claude to categorize problems into courses
            const courseStructure = await this.askClaudeForCourseStructure(problemSummaries);
            
            // Create courses in database
            const createdCourses = await this.createCoursesInDatabase(courseStructure, problems);
            
            console.log(`✅ Created ${createdCourses.length} LeetCode-based courses!`);
            return createdCourses;
            
        } catch (error) {
            console.error('❌ Course categorization failed:', error.message);
            throw error;
        }
    }

    /**
     * Ask Claude to structure problems into courses
     */
    async askClaudeForCourseStructure(problemSummaries) {
        console.log('🧠 Asking Claude to structure problems into courses...');
        
        const prompt = `You are a world-class computer science educator designing programming courses. 

I have ${problemSummaries.length} LeetCode problems that need to be organized into 6-8 structured courses for students learning algorithms and data structures.

Here are the problems:
${problemSummaries.map(p => `${p.number}. ${p.title} (${p.languages.join(', ')})`).join('\n')}

Please organize these into courses with the following criteria:
1. Each course should have 8-15 problems
2. Problems should progress from easy to hard within each course
3. Group by algorithmic patterns and data structures
4. Create a logical learning progression
5. Each course should be focused on specific concepts

Return ONLY a JSON structure like this:
{
  "courses": [
    {
      "title": "Course Title",
      "description": "Course description",
      "difficulty": "beginner|intermediate|advanced", 
      "estimated_hours": "X hours",
      "topics": ["topic1", "topic2"],
      "problems": [
        {
          "number": "0001",
          "title": "Two Sum",
          "order": 1,
          "difficulty": "easy",
          "concepts": ["Hash Table", "Array"]
        }
      ]
    }
  ]
}

Focus on creating courses that teach fundamental programming patterns like:
- Hash Tables & Arrays
- Two Pointers & Sliding Window  
- Trees & Binary Search
- Graphs & DFS/BFS
- Dynamic Programming
- Backtracking
- Sorting & Searching

Return ONLY valid JSON.`;

        try {
            const response = await this.claudeClient.post('/v1/messages', {
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            // Clean Claude's response - remove markdown formatting
            let responseText = response.data.content[0].text;
            
            // Remove markdown code block formatting
            responseText = responseText.replace(/```json\s*/g, '');
            responseText = responseText.replace(/```\s*$/g, '');
            responseText = responseText.trim();
            
            console.log('📝 Raw Claude response:', responseText.substring(0, 200) + '...');
            
            const courseStructure = JSON.parse(responseText);
            console.log(`✅ Claude created ${courseStructure.courses.length} course structures`);
            return courseStructure;
        } catch (error) {
            console.error('❌ Error asking Claude:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create courses in database
     */
    async createCoursesInDatabase(courseStructure, allProblems) {
        console.log('💾 Creating LeetCode courses in database...');
        
        const createdCourses = [];
        
        for (const courseData of courseStructure.courses) {
            try {
                const courseId = uuidv4();
                
                // Create course metadata with real problem data
                const courseMetadata = {
                    title: courseData.title,
                    description: courseData.description,
                    difficulty_level: courseData.difficulty,
                    estimated_duration: courseData.estimated_hours,
                    prerequisites: this.inferPrerequisites(courseData.difficulty),
                    learning_outcomes: this.generateLearningOutcomes(courseData.topics),
                    type: 'leetcode',
                    source: 'neetcode-repository',
                    modules: [
                        {
                            title: courseData.title,
                            description: courseData.description,
                            estimated_duration: courseData.estimated_hours,
                            core_patterns: courseData.topics,
                            lessons: {
                                count: courseData.problems.length,
                                lessons: courseData.problems.map(problemRef => {
                                    const fullProblem = allProblems.find(p => p.number === problemRef.number);
                                    if (!fullProblem) return null;
                                    
                                    return {
                                        title: fullProblem.title,
                                        description: `LeetCode Problem ${fullProblem.number}: ${fullProblem.title}`,
                                        pattern: problemRef.concepts?.[0] || 'Algorithm',
                                        difficulty: problemRef.difficulty,
                                        order: problemRef.order,
                                        time_complexity: 'Varies by approach',
                                        space_complexity: 'Varies by approach',
                                        constraints: ['See problem description'],
                                        examples: [
                                            {
                                                input: 'See problem in IDE',
                                                output: 'See solution code',
                                                explanation: 'Study the solution implementation'
                                            }
                                        ],
                                        hints: [`This problem uses ${problemRef.concepts?.join(', ') || 'algorithms'}`],
                                        leetcodeData: {
                                            problemNumber: fullProblem.number,
                                            availableLanguages: Array.from(fullProblem.languages.keys()),
                                            isFromRepo: true
                                        }
                                    };
                                }).filter(Boolean)
                            }
                        }
                    ]
                };
                
                // Insert into database
                const query = `
                    INSERT INTO enhanced_courses (
                        id, title, description, difficulty_level, estimated_duration,
                        prerequisites, learning_outcomes, metadata, teacher_id, is_published
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id, title
                `;
                
                const values = [
                    courseId,
                    courseData.title,
                    courseData.description,
                    courseData.difficulty,
                    courseData.estimated_hours,
                    JSON.stringify(courseMetadata.prerequisites),
                    JSON.stringify(courseMetadata.learning_outcomes),
                    JSON.stringify(courseMetadata),
                    'eb03e344-252f-42ab-8187-602fc30384fa', // Using existing teacher ID
                    true
                ];
                
                const result = await this.pool.query(query, values);
                const course = result.rows[0];
                
                console.log(`✅ Created course: ${course.title} (${courseData.problems.length} problems)`);
                createdCourses.push(course);
                
            } catch (error) {
                console.error(`❌ Error creating course "${courseData.title}":`, error.message);
            }
        }
        
        return createdCourses;
    }

    /**
     * Infer prerequisites based on difficulty
     */
    inferPrerequisites(difficulty) {
        switch (difficulty) {
            case 'beginner':
                return ['Basic programming knowledge', 'Understanding of variables and functions'];
            case 'intermediate':
                return ['Basic data structures', 'Understanding of algorithms', 'Comfortable with programming'];
            case 'advanced':
                return ['Strong algorithmic foundation', 'Experience with complex data structures', 'Problem-solving experience'];
            default:
                return ['Basic programming knowledge'];
        }
    }

    /**
     * Generate learning outcomes based on topics
     */
    generateLearningOutcomes(topics) {
        const outcomes = topics.map(topic => `Master ${topic} algorithms and patterns`);
        outcomes.push('Solve real LeetCode problems efficiently');
        outcomes.push('Understand time and space complexity');
        outcomes.push('Apply algorithmic thinking to new problems');
        return outcomes;
    }

    /**
     * Get course categorization statistics
     */
    async getCategorizationStats() {
        try {
            const query = `
                SELECT 
                    title,
                    difficulty_level,
                    (metadata->'modules'->0->'lessons'->>'count')::integer as problem_count
                FROM enhanced_courses 
                WHERE metadata->>'type' = 'leetcode'
                ORDER BY created_at DESC
            `;
            
            const result = await this.pool.query(query);
            
            const stats = {
                total_courses: result.rows.length,
                total_problems: result.rows.reduce((sum, row) => sum + (row.problem_count || 0), 0),
                by_difficulty: {},
                courses: result.rows
            };
            
            // Group by difficulty
            result.rows.forEach(row => {
                const diff = row.difficulty_level;
                if (!stats.by_difficulty[diff]) {
                    stats.by_difficulty[diff] = { courses: 0, problems: 0 };
                }
                stats.by_difficulty[diff].courses++;
                stats.by_difficulty[diff].problems += row.problem_count || 0;
            });
            
            return stats;
        } catch (error) {
            console.error('❌ Error getting stats:', error.message);
            throw error;
        }
    }

    /**
     * Clean up - close database connection
     */
    async cleanup() {
        await this.pool.end();
    }
}

// CLI Interface
async function main() {
    const categorizer = new ClaudeCourseCategorizor();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'categorize':
                await categorizer.categorizeProblemsToCourses();
                break;
                
            case 'stats':
                const stats = await categorizer.getCategorizationStats();
                console.log('\n📊 LeetCode Course Statistics:');
                console.log(`Total Courses: ${stats.total_courses}`);
                console.log(`Total Problems: ${stats.total_problems}`);
                console.log('\nBy Difficulty:');
                Object.entries(stats.by_difficulty).forEach(([diff, data]) => {
                    console.log(`  ${diff}: ${data.courses} courses, ${data.problems} problems`);
                });
                console.log('\nCourses:');
                stats.courses.forEach(course => {
                    console.log(`  - ${course.title} (${course.problem_count} problems)`);
                });
                break;
                
            default:
                console.log(`
🤖 Claude Course Categorizer

Commands:
  categorize    Analyze LeetCode problems and create courses using Claude AI
  stats        Show categorization statistics
  
Examples:
  node claude-course-categorizer.js categorize
  node claude-course-categorizer.js stats
  
Environment:
  CLAUDE_API_KEY=your_claude_api_key_here
                `);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await categorizer.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = ClaudeCourseCategorizor;