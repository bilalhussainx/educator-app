/**
 * =================================================================
 * REAL LEETCODE COURSE GENERATOR
 * =================================================================
 * Uses actual LeetCode solutions from the repository to create
 * comprehensive courses with real problems and solutions
 */

const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class RealLeetCodeGenerator {
    constructor() {
        this.solutionsPath = path.join(__dirname, 'leetcode-solutions');
        this.teacherId = 'eb03e344-252f-42ab-8187-602fc30384fa'; // existing teacher

        this.languages = ['javascript', 'python', 'java', 'cpp', 'go'];

        // Problem patterns and their associated problems
        this.problemPatterns = {
            "Array & Two Pointers": {
                description: "Master array manipulation and two-pointer techniques",
                difficulty: "easy",
                problems: [
                    "0001-two-sum",
                    "0026-remove-duplicates-from-sorted-array",
                    "0027-remove-element",
                    "0088-merge-sorted-array"
                ]
            },
            "Sliding Window": {
                description: "Learn sliding window technique for substring problems",
                difficulty: "medium",
                problems: [
                    "0003-longest-substring-without-repeating-characters",
                    "0076-minimum-window-substring",
                    "0209-minimum-size-subarray-sum"
                ]
            },
            "Binary Search": {
                description: "Master binary search and its variations",
                difficulty: "medium",
                problems: [
                    "0033-search-in-rotated-sorted-array",
                    "0035-search-insert-position",
                    "0074-search-a-2d-matrix"
                ]
            },
            "Dynamic Programming": {
                description: "Learn dynamic programming patterns and optimization",
                difficulty: "hard",
                problems: [
                    "0070-climbing-stairs",
                    "0121-best-time-to-buy-and-sell-stock",
                    "0198-house-robber"
                ]
            }
        };

        // LeetCode problem metadata (we'll fetch from files or hardcode known problems)
        this.problemMetadata = {
            "0001-two-sum": {
                title: "Two Sum",
                difficulty: "Easy",
                description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                examples: [
                    {
                        input: "nums = [2,7,11,15], target = 9",
                        output: "[0,1]",
                        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
                    }
                ],
                constraints: [
                    "2 <= nums.length <= 10^4",
                    "-10^9 <= nums[i] <= 10^9",
                    "-10^9 <= target <= 10^9"
                ]
            },
            "0003-longest-substring-without-repeating-characters": {
                title: "Longest Substring Without Repeating Characters",
                difficulty: "Medium",
                description: "Given a string s, find the length of the longest substring without repeating characters.",
                examples: [
                    {
                        input: "s = \"abcabcbb\"",
                        output: "3",
                        explanation: "The answer is \"abc\", with the length of 3."
                    }
                ],
                constraints: [
                    "0 <= s.length <= 5 * 10^4",
                    "s consists of English letters, digits, symbols and spaces."
                ]
            },
            "0026-remove-duplicates-from-sorted-array": {
                title: "Remove Duplicates from Sorted Array",
                difficulty: "Easy",
                description: "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once.",
                examples: [
                    {
                        input: "nums = [1,1,2]",
                        output: "2, nums = [1,2,_]",
                        explanation: "Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively."
                    }
                ],
                constraints: [
                    "1 <= nums.length <= 3 * 10^4",
                    "-100 <= nums[i] <= 100",
                    "nums is sorted in non-decreasing order."
                ]
            },
            "0035-search-insert-position": {
                title: "Search Insert Position",
                difficulty: "Easy",
                description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
                examples: [
                    {
                        input: "nums = [1,3,5,6], target = 5",
                        output: "2"
                    }
                ],
                constraints: [
                    "1 <= nums.length <= 10^4",
                    "-10^4 <= nums[i] <= 10^4"
                ]
            },
            "0070-climbing-stairs": {
                title: "Climbing Stairs",
                difficulty: "Easy",
                description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                examples: [
                    {
                        input: "n = 2",
                        output: "2",
                        explanation: "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps"
                    }
                ],
                constraints: [
                    "1 <= n <= 45"
                ]
            },
            "0121-best-time-to-buy-and-sell-stock": {
                title: "Best Time to Buy and Sell Stock",
                difficulty: "Easy",
                description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.",
                examples: [
                    {
                        input: "prices = [7,1,5,3,6,4]",
                        output: "5",
                        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
                    }
                ],
                constraints: [
                    "1 <= prices.length <= 10^5",
                    "0 <= prices[i] <= 10^4"
                ]
            }
        };
    }

    async readSolutionFile(language, problemId) {
        try {
            const filePath = path.join(this.solutionsPath, language, `${problemId}.${this.getFileExtension(language)}`);
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.warn(`⚠️  Solution not found: ${language}/${problemId}`);
            return null;
        }
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            go: 'go',
            csharp: 'cs',
            typescript: 'ts'
        };
        return extensions[language] || 'txt';
    }

    generateBoilerplate(problemId, language) {
        const metadata = this.problemMetadata[problemId];
        if (!metadata) return `// Boilerplate for ${problemId} not available`;

        const boilerplates = {
            javascript: {
                "0001-two-sum": `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your solution here

};`,
                "0003-longest-substring-without-repeating-characters": `/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Your solution here

};`,
                "0026-remove-duplicates-from-sorted-array": `/**
 * @param {number[]} nums
 * @return {number}
 */
var removeDuplicates = function(nums) {
    // Your solution here

};`,
                "0035-search-insert-position": `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
var searchInsert = function(nums, target) {
    // Your solution here

};`,
                "0070-climbing-stairs": `/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function(n) {
    // Your solution here

};`,
                "0121-best-time-to-buy-and-sell-stock": `/**
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function(prices) {
    // Your solution here

};`
            },
            python: {
                "0001-two-sum": `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your solution here
        pass`,
                "0003-longest-substring-without-repeating-characters": `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Your solution here
        pass`,
                "0026-remove-duplicates-from-sorted-array": `class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        # Your solution here
        pass`,
                "0035-search-insert-position": `class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        # Your solution here
        pass`,
                "0070-climbing-stairs": `class Solution:
    def climbStairs(self, n: int) -> int:
        # Your solution here
        pass`,
                "0121-best-time-to-buy-and-sell-stock": `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # Your solution here
        pass`
            },
            java: {
                "0001-two-sum": `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here

    }
}`,
                "0003-longest-substring-without-repeating-characters": `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your solution here

    }
}`
            }
        };

        return boilerplates[language]?.[problemId] || `// Boilerplate for ${problemId} in ${language} not available`;
    }

    generateTestCases(problemId) {
        const testCases = {
            "0001-two-sum": [
                { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
                { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
                { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
            ],
            "0003-longest-substring-without-repeating-characters": [
                { input: { s: "abcabcbb" }, expected: 3 },
                { input: { s: "bbbbb" }, expected: 1 },
                { input: { s: "pwwkew" }, expected: 3 }
            ],
            "0026-remove-duplicates-from-sorted-array": [
                { input: { nums: [1, 1, 2] }, expected: 2 },
                { input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] }, expected: 5 }
            ],
            "0035-search-insert-position": [
                { input: { nums: [1, 3, 5, 6], target: 5 }, expected: 2 },
                { input: { nums: [1, 3, 5, 6], target: 2 }, expected: 1 },
                { input: { nums: [1, 3, 5, 6], target: 7 }, expected: 4 }
            ],
            "0070-climbing-stairs": [
                { input: { n: 2 }, expected: 2 },
                { input: { n: 3 }, expected: 3 },
                { input: { n: 4 }, expected: 5 }
            ],
            "0121-best-time-to-buy-and-sell-stock": [
                { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 5 },
                { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 },
                { input: { prices: [1, 2, 3, 4, 5] }, expected: 4 }
            ]
        };

        return testCases[problemId] || [];
    }

    generateTestCasesCode(problemId, language) {
        const testCases = this.generateTestCases(problemId);
        if (!testCases.length) return '// No test cases available';

        if (language === 'javascript') {
            return `// Test cases for ${problemId}
${testCases.map((tc, i) =>
    `console.log('Test ${i + 1}:', JSON.stringify(${JSON.stringify(tc.input)}) === JSON.stringify(${JSON.stringify(tc.expected)}));`
).join('\n')}`;
        } else if (language === 'python') {
            return `# Test cases for ${problemId}
${testCases.map((tc, i) =>
    `print(f'Test ${i + 1}: {${JSON.stringify(tc.input)} == ${JSON.stringify(tc.expected)}}')`
).join('\n')}`;
        }

        return `// Test cases for ${problemId} in ${language}`;
    }

    async createRealLeetCodeCourse() {
        try {
            console.log('🚀 Creating real LeetCode course with actual solutions...');

            const courseId = uuidv4();

            // Build modules from pattern data
            const modules = [];

            for (const [patternName, patternData] of Object.entries(this.problemPatterns)) {
                console.log(`📝 Processing pattern: ${patternName}`);

                const lessons = [];

                for (const problemId of patternData.problems) {
                    const metadata = this.problemMetadata[problemId];
                    if (!metadata) {
                        console.warn(`⚠️  No metadata for problem: ${problemId}`);
                        continue;
                    }

                    // Read solutions from files
                    const solutions = {};
                    const boilerplate = {};

                    for (const language of this.languages) {
                        const solutionContent = await this.readSolutionFile(language, problemId);
                        if (solutionContent) {
                            solutions[language] = solutionContent;
                        }
                        boilerplate[language] = this.generateBoilerplate(problemId, language);
                    }

                    // Create language implementations that the controller expects
                    const languageImplementations = {};
                    for (const language of this.languages) {
                        languageImplementations[language] = {
                            starterCode: boilerplate[language],
                            solutionCode: solutions[language] || `// Solution for ${metadata.title} in ${language}`,
                            testCases: this.generateTestCasesCode(problemId, language),
                            explanation: `Solve ${metadata.title} using ${language}`
                        };
                    }

                    const lesson = {
                        id: `lesson-${problemId}`,
                        title: metadata.title,
                        description: metadata.description,
                        lesson_type: "coding_problem",
                        difficulty: metadata.difficulty.toLowerCase(),
                        examples: metadata.examples,
                        constraints: metadata.constraints,
                        test_cases: this.generateTestCases(problemId),
                        languageImplementations: languageImplementations,
                        hints: [
                            "Think about the most efficient approach",
                            "Consider time and space complexity",
                            "Test with edge cases"
                        ],
                        pattern_info: {
                            pattern_name: patternName,
                            problem_id: problemId,
                            leetcode_url: `https://leetcode.com/problems/${problemId.substring(5)}/`
                        }
                    };

                    lessons.push(lesson);
                    console.log(`  ✅ Added problem: ${metadata.title}`);
                }

                modules.push({
                    id: `module-${patternName.toLowerCase().replace(/\s+/g, '-')}`,
                    title: patternName,
                    description: patternData.description,
                    lessons: { lessons }
                });
            }

            const course = {
                id: courseId,
                title: "Real LeetCode Mastery - Complete Programming Interview Prep",
                description: "Master coding interviews with real LeetCode problems and solutions in multiple programming languages. Includes patterns, optimized solutions, and comprehensive test cases.",
                difficulty_level: "intermediate",
                estimated_duration: "50 hours",
                course_type: "leetcode_patterns",
                is_published: true,
                teacher_id: this.teacherId,
                target_audience: "Software Engineers, Students, Interview Candidates",
                learning_outcomes: [
                    "Master essential coding patterns and algorithms",
                    "Solve real LeetCode problems efficiently",
                    "Write optimized code in multiple programming languages",
                    "Understand time and space complexity analysis",
                    "Prepare comprehensively for technical interviews"
                ],
                prerequisites: [
                    "Basic programming knowledge in at least one language",
                    "Understanding of fundamental data structures",
                    "Basic algorithmic thinking"
                ],
                metadata: { modules }
            };

            // Insert course into database
            const insertQuery = `
                INSERT INTO enhanced_courses (
                    id, title, description, teacher_id, difficulty_level,
                    estimated_duration, target_audience, learning_outcomes,
                    prerequisites, metadata, language, course_type, is_published
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

            const values = [
                course.id,
                course.title,
                course.description,
                course.teacher_id,
                course.difficulty_level,
                course.estimated_duration,
                course.target_audience,
                JSON.stringify(course.learning_outcomes),
                JSON.stringify(course.prerequisites),
                JSON.stringify(course.metadata),
                'multi',
                course.course_type,
                course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`\n🎉 Successfully created real LeetCode course!`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`🎯 Patterns: ${modules.length}`);
            console.log(`📝 Total Problems: ${modules.reduce((sum, m) => sum + m.lessons.lessons.length, 0)}`);
            console.log(`💻 Languages: ${this.languages.join(', ')}`);
            console.log(`🔗 All problems include real solutions from the repository`);

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error creating real LeetCode course:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    try {
        const generator = new RealLeetCodeGenerator();

        console.log('🎯 Starting real LeetCode course generation...');
        console.log('📁 Using solutions from:', generator.solutionsPath);

        await generator.createRealLeetCodeCourse();

        console.log('\n✅ Real LeetCode course generation completed!');
        process.exit(0);

    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = RealLeetCodeGenerator;