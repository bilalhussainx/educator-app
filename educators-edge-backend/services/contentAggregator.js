// FILE: services/contentAggregator.js
// Multi-Source Content Aggregator for Course Generation

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { AIService, Logger } = require('./aiCourseService');

class ContentAggregator {
    constructor() {
        this.aiService = new AIService();
        this.sources = {
            freeCodeCamp: {
                enabled: true,
                priority: 1
            },
            leetCode: {
                enabled: true,
                priority: 2,
                githubRepos: [
                    'https://api.github.com/repos/LeetCode-OpenSource/LeetCode',
                    'https://api.github.com/repos/azl397985856/leetcode',
                    'https://api.github.com/repos/doocs/leetcode',
                    'https://api.github.com/repos/grandyang/leetcode'
                ]
            },
            hackerRank: {
                enabled: true,
                priority: 3
            },
            codingInterviewPatterns: {
                enabled: true,
                priority: 1
            }
        };
        this.contentCache = new Map();
    }

    async aggregateContentForCourse(courseTheme, options = {}) {
        const {
            minProblems = 20,
            maxProblems = 50,
            difficulty = ['easy', 'medium', 'hard'],
            languages = ['javascript', 'python'],
            includeSystemDesign = false
        } = options;

        await Logger.info(`Starting content aggregation for theme: ${courseTheme}`, {
            minProblems,
            maxProblems,
            difficulty,
            languages
        });

        const aggregatedContent = {
            problems: [],
            concepts: [],
            patterns: [],
            realWorldExamples: [],
            interviewQuestions: []
        };

        try {
            // 1. Fetch from multiple sources in parallel
            const [
                freeCodeCampContent,
                leetCodeContent,
                generatedContent
            ] = await Promise.all([
                this.fetchFreeCodeCampContent(courseTheme, languages),
                this.fetchLeetCodeContent(courseTheme, difficulty),
                this.generateOriginalContent(courseTheme, options)
            ]);

            // 2. Merge and deduplicate content
            aggregatedContent.problems = this.mergeProblems([
                ...freeCodeCampContent.problems,
                ...leetCodeContent.problems,
                ...generatedContent.problems
            ]);

            // 3. Enhance with AI-generated variations
            if (aggregatedContent.problems.length < minProblems) {
                const additionalProblems = await this.generateSimilarProblems(
                    aggregatedContent.problems,
                    minProblems - aggregatedContent.problems.length
                );
                aggregatedContent.problems.push(...additionalProblems);
            }

            // 4. Select best problems and create progression
            aggregatedContent.problems = await this.selectAndOrderProblems(
                aggregatedContent.problems,
                maxProblems,
                difficulty
            );

            // 5. Add metadata and learning insights
            await this.enhanceWithMetadata(aggregatedContent, courseTheme);

            await Logger.info(`Content aggregation completed`, {
                totalProblems: aggregatedContent.problems.length,
                sources: ['freeCodeCamp', 'leetCode', 'AI-generated']
            });

            return aggregatedContent;

        } catch (error) {
            await Logger.error('Content aggregation failed', { error: error.message, courseTheme });
            throw error;
        }
    }

    async fetchLeetCodeContent(theme, difficulty) {
        const cacheKey = `leetcode_${theme}_${difficulty.join('_')}`;
        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey);
        }

        await Logger.info('Fetching LeetCode problems', { theme, difficulty });

        try {
            // Simulate fetching from LeetCode APIs or GitHub repos
            const leetCodeProblems = await this.fetchFromLeetCodeSources(theme, difficulty);
            
            const content = {
                problems: leetCodeProblems.map(problem => ({
                    id: `leetcode_${problem.id}`,
                    title: problem.title,
                    description: problem.description || problem.content,
                    difficulty: problem.difficulty.toLowerCase(),
                    topics: problem.tags || problem.topics || [],
                    solution: problem.solution,
                    hints: problem.hints || [],
                    source: 'leetcode',
                    companies: problem.companies || [],
                    frequency: problem.frequency || 0,
                    examples: problem.examples || [],
                    constraints: problem.constraints || []
                }))
            };

            this.contentCache.set(cacheKey, content);
            return content;

        } catch (error) {
            await Logger.warn('Failed to fetch LeetCode content', { error: error.message });
            return { problems: [] };
        }
    }

    async fetchFromLeetCodeSources(theme, difficulty) {
        // This would integrate with actual LeetCode APIs or scrape GitHub repos
        // For now, return simulated data structure
        return [
            {
                id: 1,
                title: "Two Sum",
                difficulty: "Easy",
                content: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                tags: ["Array", "Hash Table"],
                solution: {
                    javascript: `
function twoSum(nums, target) {
    const numMap = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (numMap.has(complement)) {
            return [numMap.get(complement), i];
        }
        numMap.set(nums[i], i);
    }
    return [];
}`,
                    python: `
def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []`
                },
                companies: ["Amazon", "Google", "Facebook"],
                frequency: 85,
                examples: [
                    {
                        input: "nums = [2,7,11,15], target = 9",
                        output: "[0,1]",
                        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
                    }
                ]
            },
            {
                id: 15,
                title: "3Sum",
                difficulty: "Medium",
                content: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                tags: ["Array", "Two Pointers", "Sorting"],
                solution: {
                    javascript: `
function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        
        let left = i + 1, right = nums.length - 1;
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}`
                },
                companies: ["Microsoft", "Apple", "Adobe"],
                frequency: 72
            }
        ];
    }

    async fetchFreeCodeCampContent(theme, languages) {
        // Enhanced FreeCodeCamp fetching with solution analysis
        const db = require('../db');
        const client = await db.pool.connect();

        try {
            const query = `
                SELECT 
                    id, title, description, solution_files, files, test_code,
                    chapter, sub_chapter, language, lesson_type
                FROM ingested_lessons 
                WHERE language = ANY($1)
                AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2 OR LOWER(chapter) LIKE $2)
                AND solution_files IS NOT NULL
                ORDER BY chapter, sub_chapter
                LIMIT 30
            `;

            const searchPattern = `%${theme.toLowerCase()}%`;
            const result = await client.query(query, [languages, searchPattern]);

            return {
                problems: result.rows.map(row => ({
                    id: `fcc_${row.id}`,
                    title: row.title,
                    description: row.description,
                    difficulty: this.inferDifficultyFromFCC(row),
                    solution: this.safeJsonParse(row.solution_files),
                    boilerplate: this.safeJsonParse(row.files),
                    tests: this.safeJsonParse(row.test_code),
                    source: 'freeCodeCamp',
                    chapter: row.chapter,
                    subChapter: row.sub_chapter,
                    language: row.language,
                    type: row.lesson_type
                }))
            };

        } finally {
            client.release();
        }
    }

    async generateOriginalContent(theme, options) {
        await Logger.info('Generating original problems with AI', { theme });

        const prompt = `
You are an expert problem setter for coding interviews and competitive programming.

Create 10 original coding problems for the theme: "${theme}"

Each problem should be:
1. Original and not copying existing problems
2. Progressive in difficulty 
3. Include multiple approaches/optimizations
4. Have real-world applications
5. Be suitable for coding interviews

CRITICAL: Respond with ONLY valid JSON. Do not include explanatory text, markdown, or code examples.

Generate problems in this JSON format:
{
    "problems": [
        {
            "title": "Original problem title",
            "difficulty": "easy|medium|hard",
            "description": "Clear problem statement with examples",
            "examples": [
                {
                    "input": "sample input",
                    "output": "expected output",
                    "explanation": "why this output"
                }
            ],
            "constraints": ["constraint1", "constraint2"],
            "topics": ["topic1", "topic2"],
            "hints": ["hint1", "hint2"],
            "real_world_application": "Where this problem applies in practice",
            "companies": ["company1", "company2"],
            "solution_approaches": [
                {
                    "name": "Brute Force",
                    "time_complexity": "O(n²)",
                    "space_complexity": "O(1)",
                    "description": "Simple approach"
                },
                {
                    "name": "Optimized",
                    "time_complexity": "O(n log n)",
                    "space_complexity": "O(n)",
                    "description": "Better approach"
                }
            ]
        }
    ]
}
        `;

        try {
            const generatedProblems = await this.aiService.generateWithRetries(prompt, `Original Problems: ${theme}`);
            
            return {
                problems: generatedProblems.problems.map((problem, index) => ({
                    id: `ai_generated_${index}`,
                    ...problem,
                    source: 'ai_generated'
                }))
            };

        } catch (error) {
            await Logger.warn('Failed to generate original problems', { error: error.message });
            return { problems: [] };
        }
    }

    async generateSimilarProblems(existingProblems, count) {
        if (existingProblems.length === 0 || count <= 0) return [];

        const sampleProblems = existingProblems.slice(0, 3);
        const prompt = `
Based on these example problems, generate ${count} similar but original problems:

${JSON.stringify(sampleProblems.map(p => ({
    title: p.title,
    description: p.description.substring(0, 200),
    difficulty: p.difficulty,
    topics: p.topics
})))}

Create variations that:
1. Use similar concepts but different scenarios
2. Have progressive difficulty
3. Include edge cases the originals might miss
4. Add practical applications

Return in the same JSON format as the original problems.
        `;

        try {
            const variations = await this.aiService.generateWithRetries(prompt, `Problem Variations (${count})`);
            return variations.problems || [];
        } catch (error) {
            await Logger.warn('Failed to generate problem variations', { error: error.message });
            return [];
        }
    }

    mergeProblems(problemLists) {
        const seen = new Set();
        const merged = [];

        for (const problem of problemLists.flat()) {
            // Create a simple hash based on title similarity
            const hash = problem.title.toLowerCase().replace(/\s+/g, '');
            if (!seen.has(hash)) {
                seen.add(hash);
                merged.push(problem);
            }
        }

        return merged;
    }

    async selectAndOrderProblems(problems, maxCount, difficulty) {
        // Score problems based on various factors
        const scoredProblems = problems.map(problem => ({
            problem,
            score: this.scoreProblem(problem, difficulty)
        }));

        // Sort by score and select top problems
        const selected = scoredProblems
            .sort((a, b) => b.score - a.score)
            .slice(0, maxCount)
            .map(item => item.problem);

        // Order by difficulty progression
        return this.orderByDifficultyProgression(selected);
    }

    scoreProblem(problem, targetDifficulty) {
        let score = 0;

        // Difficulty alignment
        if (targetDifficulty.includes(problem.difficulty)) {
            score += 10;
        }

        // Source quality
        const sourceScores = {
            'leetcode': 9,
            'freeCodeCamp': 8,
            'ai_generated': 6
        };
        score += sourceScores[problem.source] || 5;

        // Has solution
        if (problem.solution) score += 5;

        // Has examples
        if (problem.examples && problem.examples.length > 0) score += 3;

        // Real-world relevance
        if (problem.companies && problem.companies.length > 0) score += 4;
        if (problem.frequency && problem.frequency > 50) score += 3;

        // Content quality
        if (problem.description && problem.description.length > 100) score += 2;
        if (problem.hints && problem.hints.length > 0) score += 1;

        return score;
    }

    orderByDifficultyProgression(problems) {
        const grouped = {
            easy: problems.filter(p => p.difficulty === 'easy'),
            medium: problems.filter(p => p.difficulty === 'medium'),
            hard: problems.filter(p => p.difficulty === 'hard')
        };

        // Create a progressive mix
        const ordered = [];
        const maxLength = Math.max(grouped.easy.length, grouped.medium.length, grouped.hard.length);

        for (let i = 0; i < maxLength; i++) {
            if (grouped.easy[i]) ordered.push(grouped.easy[i]);
            if (grouped.medium[i]) ordered.push(grouped.medium[i]);
            if (grouped.hard[i]) ordered.push(grouped.hard[i]);
        }

        return ordered;
    }

    async enhanceWithMetadata(content, theme) {
        // Add learning progression metadata
        content.metadata = {
            theme,
            totalProblems: content.problems.length,
            difficultyDistribution: this.analyzeDifficultyDistribution(content.problems),
            topicCoverage: this.analyzeTopicCoverage(content.problems),
            sourceBreakdown: this.analyzeSourceBreakdown(content.problems),
            estimatedStudyTime: this.estimateStudyTime(content.problems),
            learningPath: await this.generateLearningPath(content.problems)
        };

        return content;
    }

    analyzeDifficultyDistribution(problems) {
        const distribution = { easy: 0, medium: 0, hard: 0 };
        problems.forEach(problem => {
            distribution[problem.difficulty] = (distribution[problem.difficulty] || 0) + 1;
        });
        return distribution;
    }

    analyzeTopicCoverage(problems) {
        const topics = {};
        problems.forEach(problem => {
            if (problem.topics) {
                problem.topics.forEach(topic => {
                    topics[topic] = (topics[topic] || 0) + 1;
                });
            }
        });
        return Object.entries(topics)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count }));
    }

    analyzeSourceBreakdown(problems) {
        const sources = {};
        problems.forEach(problem => {
            sources[problem.source] = (sources[problem.source] || 0) + 1;
        });
        return sources;
    }

    estimateStudyTime(problems) {
        // Estimate based on difficulty and content
        const timePerProblem = { easy: 30, medium: 60, hard: 120 }; // minutes
        const totalMinutes = problems.reduce((total, problem) => {
            return total + (timePerProblem[problem.difficulty] || 60);
        }, 0);
        
        return {
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60),
            estimatedWeeks: Math.ceil(totalMinutes / (60 * 10)) // Assuming 10 hours per week
        };
    }

    async generateLearningPath(problems) {
        // Create a suggested order for studying the problems
        const path = [];
        const concepts = new Set();
        
        problems.forEach((problem, index) => {
            if (problem.topics) {
                problem.topics.forEach(topic => concepts.add(topic));
            }
            
            path.push({
                step: index + 1,
                title: problem.title,
                difficulty: problem.difficulty,
                estimatedTime: problem.difficulty === 'easy' ? '30min' : 
                             problem.difficulty === 'medium' ? '1hr' : '2hr',
                prerequisites: index === 0 ? [] : [problems[index - 1].title],
                learningGoals: problem.topics || []
            });
        });

        return {
            totalSteps: path.length,
            conceptsCovered: Array.from(concepts),
            studyPath: path
        };
    }

    inferDifficultyFromFCC(lesson) {
        // Heuristic to infer difficulty from FreeCodeCamp lessons
        const title = lesson.title.toLowerCase();
        const description = lesson.description.toLowerCase();
        
        if (title.includes('advanced') || description.includes('complex')) return 'hard';
        if (title.includes('intermediate') || description.includes('algorithm')) return 'medium';
        return 'easy';
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

module.exports = { ContentAggregator };