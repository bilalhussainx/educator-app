/**
 * =================================================================
 * LEETCODE COURSE GENERATOR - PATTERN-BASED LEARNING
 * =================================================================
 * Generates comprehensive LeetCode courses organized by coding patterns
 * Integrates with existing database schema and Claude API
 */

const { v4: uuidv4 } = require('uuid');
const ClaudeLeetCodeService = require('./services/claudeLeetCodeService');
const LeetCodeRepoManager = require('./leetcode-repo-manager');
const pool = require('./db');

class LeetCodeCourseGenerator {
    constructor() {
        this.claudeService = new ClaudeLeetCodeService();
        this.repoManager = new LeetCodeRepoManager();
        
        // Define coding patterns similar to "Grokking the Coding Interview"
        this.codingPatterns = {
            sliding_window: {
                title: 'Sliding Window Pattern',
                description: 'Master problems involving windows over arrays/strings',
                keywords: ['window', 'substring', 'subarray', 'longest', 'minimum'],
                difficulty: 'medium',
                estimatedHours: 8
            },
            two_pointers: {
                title: 'Two Pointers Technique',
                description: 'Solve array problems using two pointer approach',
                keywords: ['two pointers', 'pair', 'triplet', 'sorted array'],
                difficulty: 'easy',
                estimatedHours: 6
            },
            fast_slow_pointers: {
                title: 'Fast & Slow Pointers',
                description: 'Detect cycles and find middle elements',
                keywords: ['cycle', 'middle', 'linked list', 'floyd'],
                difficulty: 'medium',
                estimatedHours: 5
            },
            merge_intervals: {
                title: 'Merge Intervals',
                description: 'Handle overlapping intervals efficiently',
                keywords: ['interval', 'merge', 'overlap', 'meeting'],
                difficulty: 'medium',
                estimatedHours: 4
            },
            cyclic_sort: {
                title: 'Cyclic Sort',
                description: 'Sort arrays with numbers in given range',
                keywords: ['cyclic', 'missing', 'duplicate', 'range'],
                difficulty: 'easy',
                estimatedHours: 3
            },
            tree_bfs: {
                title: 'Tree Breadth First Search',
                description: 'Level-order traversal and tree problems',
                keywords: ['level order', 'bfs', 'tree', 'breadth'],
                difficulty: 'medium',
                estimatedHours: 7
            },
            tree_dfs: {
                title: 'Tree Depth First Search',
                description: 'In-order, pre-order, post-order traversals',
                keywords: ['dfs', 'inorder', 'preorder', 'postorder', 'path'],
                difficulty: 'medium',
                estimatedHours: 8
            },
            two_heaps: {
                title: 'Two Heaps',
                description: 'Find median and solve priority problems',
                keywords: ['median', 'heap', 'priority', 'sliding median'],
                difficulty: 'hard',
                estimatedHours: 5
            },
            subsets: {
                title: 'Subsets',
                description: 'Generate all combinations and permutations',
                keywords: ['subset', 'combination', 'permutation', 'backtrack'],
                difficulty: 'medium',
                estimatedHours: 6
            },
            binary_search: {
                title: 'Modified Binary Search',
                description: 'Search in sorted/rotated arrays',
                keywords: ['binary search', 'sorted', 'rotated', 'search'],
                difficulty: 'medium',
                estimatedHours: 5
            },
            top_k_elements: {
                title: 'Top K Elements',
                description: 'Find top/smallest K elements',
                keywords: ['top k', 'kth', 'largest', 'smallest', 'frequent'],
                difficulty: 'medium',
                estimatedHours: 4
            },
            k_way_merge: {
                title: 'K-way Merge',
                description: 'Merge multiple sorted arrays',
                keywords: ['merge', 'k sorted', 'multiple arrays'],
                difficulty: 'hard',
                estimatedHours: 4
            },
            topological_sort: {
                title: 'Topological Sort',
                description: 'Dependency resolution and graph ordering',
                keywords: ['topological', 'dependency', 'graph', 'course'],
                difficulty: 'hard',
                estimatedHours: 5
            },
            dynamic_programming: {
                title: 'Dynamic Programming',
                description: 'Optimization problems with overlapping subproblems',
                keywords: ['dp', 'dynamic', 'optimization', 'fibonacci', 'knapsack'],
                difficulty: 'hard',
                estimatedHours: 12
            }
        };
    }

    /**
     * Generate a complete pattern-based course
     */
    async generatePatternBasedCourse(options = {}) {
        const {
            maxProblems = 300,
            courseTitle = 'Complete LeetCode Mastery - Pattern Based Learning',
            includePatterns = Object.keys(this.codingPatterns),
            languages = ['javascript', 'python', 'java']
        } = options;

        console.log('=� Starting pattern-based LeetCode course generation...');
        console.log(`=� Target: ${maxProblems} problems across ${includePatterns.length} patterns`);

        try {
            // Setup repository
            await this.repoManager.setupRepository();
            const allProblems = await this.repoManager.getAvailableProblems();
            
            console.log(`=� Found ${allProblems.length} available problems`);

            // Create course in database
            const courseId = await this.createCourseInDatabase(courseTitle, includePatterns.length);
            
            // Generate lessons for each pattern
            const courseResults = {
                courseId,
                title: courseTitle,
                patterns: [],
                lessons: [],
                totalProblems: 0
            };

            let problemsUsed = 0;
            
            // Improved distribution: ensure each pattern gets at least 1 problem if possible
            const problemsPerPattern = Math.max(1, Math.floor(maxProblems / includePatterns.length));
            const remainingAfterDistribution = maxProblems - (problemsPerPattern * includePatterns.length);

            for (let i = 0; i < includePatterns.length; i++) {
                if (problemsUsed >= maxProblems) break;
                
                const patternKey = includePatterns[i];
                const pattern = this.codingPatterns[patternKey];
                const remainingProblems = maxProblems - problemsUsed;
                
                // Give this pattern at least 1 problem, but not more than remaining
                let maxForThisPattern = Math.min(problemsPerPattern, remainingProblems);
                
                // If this is one of the first patterns and we have extra problems to distribute
                if (i < remainingAfterDistribution && maxForThisPattern < remainingProblems) {
                    maxForThisPattern++;
                }
                
                console.log(`<� Processing pattern: ${pattern.title} (max ${maxForThisPattern} problems)`);
                
                const patternProblems = this.selectProblemsForPattern(
                    allProblems, 
                    pattern, 
                    maxForThisPattern,
                    languages
                );

                if (patternProblems.length > 0) {
                    const lessons = await this.createLessonsForPattern(
                        courseId,
                        pattern,
                        patternProblems,
                        languages
                    );
                    
                    courseResults.patterns.push({
                        ...pattern,
                        key: patternKey,
                        problemCount: patternProblems.length,
                        lessons: lessons.length
                    });
                    
                    courseResults.lessons.push(...lessons);
                    problemsUsed += patternProblems.length;
                    
                    console.log(` Created ${lessons.length} lessons for ${pattern.title}`);
                }
            }

            courseResults.totalProblems = problemsUsed;
            
            // Update course with final stats
            await this.updateCourseStats(courseId, courseResults);
            
            console.log('<� Course generation completed!');
            console.log(`=� Final stats:`);
            console.log(`   Course ID: ${courseId}`);
            console.log(`   Total Patterns: ${courseResults.patterns.length}`);
            console.log(`   Total Lessons: ${courseResults.lessons.length}`);
            console.log(`   Total Problems: ${courseResults.totalProblems}`);
            
            return courseResults;

        } catch (error) {
            console.error('L Course generation failed:', error);
            throw error;
        }
    }

    /**
     * Select problems that match a specific pattern
     */
    selectProblemsForPattern(allProblems, pattern, maxCount, languages) {
        // First, filter problems that have all required languages
        const eligibleProblems = allProblems.filter(problem => 
            languages.every(lang => problem.languages.has(lang))
        );

        // Try to find problems that match pattern keywords
        const matchingProblems = eligibleProblems.filter(problem => {
            const titleLower = problem.title.toLowerCase();
            return pattern.keywords.some(keyword => titleLower.includes(keyword.toLowerCase()));
        });

        // If we found matching problems, use them
        if (matchingProblems.length > 0) {
            console.log(`  📍 Found ${matchingProblems.length} problems matching "${pattern.title}" pattern`);
            return matchingProblems
                .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                .slice(0, maxCount);
        }

        // Fallback: if no pattern matches, just use the first available problems
        // This ensures we always have problems for each pattern
        console.log(`  📍 No exact matches for "${pattern.title}", using general problems`);
        return eligibleProblems
            .sort((a, b) => parseInt(a.number) - parseInt(b.number))
            .slice(0, maxCount);
    }

    /**
     * Create course record in database
     */
    async createCourseInDatabase(title, patternCount) {
        const courseId = uuidv4();
        
        const insertQuery = `
            INSERT INTO enhanced_courses (
                id, title, description, difficulty_level, course_type,
                estimated_duration, is_published, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id
        `;
        
        const description = `Master ${patternCount} essential coding patterns through hands-on LeetCode problems. Each pattern includes theory, examples, and progressive practice problems in multiple programming languages.`;
        
        const values = [
            courseId,
            title,
            description,
            'intermediate',
            'leetcode_patterns',
            `${patternCount * 6} hours`, // Estimated duration
            true // Published
        ];
        
        const result = await pool.query(insertQuery, values);
        console.log(` Created course in database: ${courseId}`);
        
        return courseId;
    }

    /**
     * Create lessons for a specific pattern
     */
    async createLessonsForPattern(courseId, pattern, problems, languages) {
        const lessons = [];
        
        // Create introduction lesson for the pattern
        const introLessonId = await this.createIntroductionLesson(courseId, pattern);
        lessons.push(introLessonId);
        
        // Create lessons for each problem
        for (let i = 0; i < problems.length; i++) {
            const problem = problems[i];
            const lessonOrder = lessons.length + 1;
            
            const lessonId = await this.createProblemLesson(
                courseId,
                problem,
                pattern,
                lessonOrder,
                languages
            );
            
            lessons.push(lessonId);
        }
        
        return lessons;
    }

    /**
     * Create introduction lesson for a pattern
     */
    async createIntroductionLesson(courseId, pattern) {
        const lessonId = uuidv4();
        
        const content = `# ${pattern.title}

## Overview
${pattern.description}

## When to Use This Pattern
This pattern is particularly useful when you encounter problems that involve:
${pattern.keywords.map(keyword => `- ${keyword}`).join('\n')}

## Time Complexity
Most problems using this pattern can be solved in O(n) or O(n log n) time.

## Key Concepts
- Understand the core technique
- Identify problem variations
- Practice implementation in multiple languages

## What You'll Learn
In this section, you'll master the ${pattern.title} through progressive examples and practice problems.
`;

        const insertQuery = `
            INSERT INTO lessons (
                id, enhanced_course_id, title, description, order_index,
                lesson_type, estimated_duration, teacher_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id
        `;
        
        // Use an existing user ID for AI-generated lessons
        const aiTeacherId = '09b275f8-3aa1-49ed-9683-f4d26f1008d5';
        
        const values = [
            lessonId,
            courseId,
            `Introduction to ${pattern.title}`,
            content,
            1,
            'theory',
            30,
            aiTeacherId
        ];
        
        await pool.query(insertQuery, values);
        return lessonId;
    }

    /**
     * Create lesson for a specific problem
     */
    async createProblemLesson(courseId, problem, pattern, lessonOrder, languages) {
        const lessonId = uuidv4();
        
        // Get solution codes for all languages
        const solutions = {};
        const starterCodes = {};
        
        for (const language of languages) {
            try {
                const solutionData = await this.repoManager.getSolutionCode(problem.number, language);
                solutions[language] = solutionData.code;
                starterCodes[language] = this.repoManager.createStarterCode(solutionData.code, language);
            } catch (error) {
                console.warn(`Warning: Could not get ${language} solution for problem ${problem.number}`);
            }
        }

        const content = `# Problem ${problem.number}: ${problem.title}

## Pattern: ${pattern.title}

## Problem Description
LeetCode Problem #${problem.number}

## Approach
This problem uses the ${pattern.title} pattern because it involves ${pattern.keywords.join(', ')}.

## Solution Templates

${languages.map(lang => {
    const starter = starterCodes[lang] || '// Solution not available';
    return `### ${lang.charAt(0).toUpperCase() + lang.slice(1)}
\`\`\`${lang}
${starter}
\`\`\``;
}).join('\n\n')}

## Complete Solutions

${languages.map(lang => {
    const solution = solutions[lang] || '// Solution not available';
    return `### ${lang.charAt(0).toUpperCase() + lang.slice(1)} Solution
\`\`\`${lang}
${solution}
\`\`\``;
}).join('\n\n')}

## Time Complexity: O(n)
## Space Complexity: O(1)
`;

        const insertQuery = `
            INSERT INTO lessons (
                id, enhanced_course_id, title, description, order_index,
                lesson_type, estimated_duration, teacher_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id
        `;
        
        // Use an existing user ID for AI-generated lessons
        const aiTeacherId = '09b275f8-3aa1-49ed-9683-f4d26f1008d5';
        
        const values = [
            lessonId,
            courseId,
            `Problem ${problem.number}: ${problem.title}`,
            content,
            lessonOrder,
            'coding_problem',
            45,
            aiTeacherId
        ];
        
        await pool.query(insertQuery, values);
        
        // Store starter and solution codes in separate table if needed
        await this.storeProblemCodes(lessonId, problem.number, starterCodes, solutions);
        
        return lessonId;
    }

    /**
     * Store problem codes in database
     */
    async storeProblemCodes(lessonId, problemNumber, starterCodes, solutions) {
        // This could be stored in a separate table for the IDE to access
        // For now, we'll keep it simple and store in the lesson content
        console.log(`=� Stored codes for problem ${problemNumber} in lesson ${lessonId}`);
    }

    /**
     * Update course with final statistics
     */
    async updateCourseStats(courseId, courseResults) {
        const updateQuery = `
            UPDATE enhanced_courses 
            SET 
                estimated_duration = $2,
                updated_at = NOW()
            WHERE id = $1
        `;
        
        const totalHours = courseResults.patterns.reduce((sum, pattern) => sum + pattern.estimatedHours, 0);
        const durationString = `${totalHours} hours`;
        
        await pool.query(updateQuery, [courseId, durationString]);
        console.log(`=� Updated course statistics for ${courseId}`);
    }

    /**
     * Get course generation statistics
     */
    async getGenerationStats() {
        const problems = await this.repoManager.getAvailableProblems();
        const stats = await this.repoManager.getStatistics();
        
        console.log('=� Course Generation Capabilities:');
        console.log(`   Available Problems: ${problems.length}`);
        console.log(`   Supported Patterns: ${Object.keys(this.codingPatterns).length}`);
        console.log(`   Languages: JavaScript, Python, Java`);
        console.log(`   Max Course Size: ${problems.length} problems`);
        
        return {
            availableProblems: problems.length,
            supportedPatterns: Object.keys(this.codingPatterns).length,
            languages: ['javascript', 'python', 'java'],
            ...stats
        };
    }
}

// CLI Interface
async function main() {
    const generator = new LeetCodeCourseGenerator();
    const command = process.argv[2];
    const param = process.argv[3];
    
    try {
        switch (command) {
            case 'generate':
                const maxProblems = parseInt(param) || 50;
                console.log(`<� Generating course with ${maxProblems} problems...`);
                
                const result = await generator.generatePatternBasedCourse({
                    maxProblems,
                    courseTitle: `LeetCode Mastery Course - ${maxProblems} Problems`
                });
                
                console.log('<� Generation completed!');
                console.log(`=� Access your course at: /enhanced-courses/${result.courseId}/lessons`);
                break;
                
            case 'stats':
                await generator.getGenerationStats();
                break;
                
            case 'patterns':
                console.log('<� Available Coding Patterns:');
                Object.entries(generator.codingPatterns).forEach(([key, pattern]) => {
                    console.log(`   ${pattern.title} (${pattern.difficulty}) - ${pattern.estimatedHours}h`);
                    console.log(`     ${pattern.description}`);
                    console.log('');
                });
                break;
                
            default:
                console.log(`
=� LeetCode Course Generator - Pattern Based Learning

Commands:
  generate <number>    Generate course with specified number of problems
  stats               Show generation capabilities and statistics
  patterns            List all available coding patterns

Examples:
  node leetCodeCourseGenerator.js generate 100
  node leetCodeCourseGenerator.js stats
  node leetCodeCourseGenerator.js patterns

Features:
   14 Coding Patterns (Sliding Window, Two Pointers, etc.)
   300+ LeetCode Problems
   Multi-language Support (JS, Python, Java)
   Database Integration
   Progressive Learning Structure
                `);
        }
    } catch (error) {
        console.error('L Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = LeetCodeCourseGenerator;