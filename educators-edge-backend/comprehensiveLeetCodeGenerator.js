/**
 * =================================================================
 * COMPREHENSIVE LEETCODE COURSE GENERATOR
 * =================================================================
 * Creates complete LeetCode courses with:
 * - Proper lesson structure
 * - Multilingual boilerplate code
 * - Test cases and solutions
 * - Progress tracking
 * - LeetCode-style problems
 */

const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

class ComprehensiveLeetCodeGenerator {
    constructor() {
        this.supportedLanguages = [
            'javascript', 'python', 'java', 'cpp', 'csharp', 'go', 'typescript'
        ];

        this.patterns = [
            {
                name: "Two Pointers",
                description: "Use two pointers to solve array and string problems efficiently",
                problems: [
                    {
                        title: "Two Sum",
                        difficulty: "easy",
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
                    {
                        title: "Valid Palindrome",
                        difficulty: "easy",
                        description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
                        examples: [
                            {
                                input: "s = \"A man, a plan, a canal: Panama\"",
                                output: "true",
                                explanation: "\"amanaplanacanalpanama\" is a palindrome."
                            }
                        ],
                        constraints: [
                            "1 <= s.length <= 2 * 10^5",
                            "s consists only of printable ASCII characters."
                        ]
                    }
                ]
            },
            {
                name: "Sliding Window",
                description: "Use sliding window technique to solve substring and subarray problems",
                problems: [
                    {
                        title: "Longest Substring Without Repeating Characters",
                        difficulty: "medium",
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
                    }
                ]
            },
            {
                name: "Binary Search",
                description: "Master binary search and its variations for efficient searching",
                problems: [
                    {
                        title: "Search Insert Position",
                        difficulty: "easy",
                        description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
                        examples: [
                            {
                                input: "nums = [1,3,5,6], target = 5",
                                output: "2"
                            }
                        ],
                        constraints: [
                            "1 <= nums.length <= 10^4",
                            "-10^4 <= nums[i] <= 10^4",
                            "nums contains distinct values sorted in ascending order"
                        ]
                    }
                ]
            }
        ];
    }

    generateBoilerplate(problem, language) {
        const templates = {
            javascript: {
                twoSum: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here

};`,
                validPalindrome: `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {
    // Your code here

};`,
                longestSubstring: `/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Your code here

};`,
                searchInsert: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
var searchInsert = function(nums, target) {
    // Your code here

};`
            },
            python: {
                twoSum: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your code here
        pass`,
                validPalindrome: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        # Your code here
        pass`,
                longestSubstring: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Your code here
        pass`,
                searchInsert: `class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        # Your code here
        pass`
            },
            java: {
                twoSum: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here

    }
}`,
                validPalindrome: `class Solution {
    public boolean isPalindrome(String s) {
        // Your code here

    }
}`,
                longestSubstring: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your code here

    }
}`,
                searchInsert: `class Solution {
    public int searchInsert(int[] nums, int target) {
        // Your code here

    }
}`
            },
            cpp: {
                twoSum: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here

    }
};`,
                validPalindrome: `class Solution {
public:
    bool isPalindrome(string s) {
        // Your code here

    }
};`,
                longestSubstring: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Your code here

    }
};`,
                searchInsert: `class Solution {
public:
    int searchInsert(vector<int>& nums, int target) {
        // Your code here

    }
};`
            }
        };

        const functionMap = {
            "Two Sum": "twoSum",
            "Valid Palindrome": "validPalindrome",
            "Longest Substring Without Repeating Characters": "longestSubstring",
            "Search Insert Position": "searchInsert"
        };

        const functionKey = functionMap[problem.title];
        return templates[language]?.[functionKey] || `// ${problem.title} - ${language} template not available`;
    }

    generateSolution(problem, language) {
        const solutions = {
            javascript: {
                twoSum: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const map = new Map();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];

        if (map.has(complement)) {
            return [map.get(complement), i];
        }

        map.set(nums[i], i);
    }

    return [];
};`,
                validPalindrome: `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {
    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    let left = 0;
    let right = cleaned.length - 1;

    while (left < right) {
        if (cleaned[left] !== cleaned[right]) {
            return false;
        }
        left++;
        right--;
    }

    return true;
};`
            },
            python: {
                twoSum: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        num_map = {}

        for i, num in enumerate(nums):
            complement = target - num

            if complement in num_map:
                return [num_map[complement], i]

            num_map[num] = i

        return []`,
                validPalindrome: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        cleaned = ''.join(char.lower() for char in s if char.isalnum())
        return cleaned == cleaned[::-1]`
            }
        };

        const functionMap = {
            "Two Sum": "twoSum",
            "Valid Palindrome": "validPalindrome",
            "Longest Substring Without Repeating Characters": "longestSubstring",
            "Search Insert Position": "searchInsert"
        };

        const functionKey = functionMap[problem.title];
        return solutions[language]?.[functionKey] || `// ${problem.title} solution for ${language} not implemented yet`;
    }

    generateTestCases(problem) {
        const testCases = {
            "Two Sum": [
                { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
                { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
                { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
            ],
            "Valid Palindrome": [
                { input: { s: "A man, a plan, a canal: Panama" }, expected: true },
                { input: { s: "race a car" }, expected: false },
                { input: { s: " " }, expected: true }
            ],
            "Longest Substring Without Repeating Characters": [
                { input: { s: "abcabcbb" }, expected: 3 },
                { input: { s: "bbbbb" }, expected: 1 },
                { input: { s: "pwwkew" }, expected: 3 }
            ],
            "Search Insert Position": [
                { input: { nums: [1, 3, 5, 6], target: 5 }, expected: 2 },
                { input: { nums: [1, 3, 5, 6], target: 2 }, expected: 1 },
                { input: { nums: [1, 3, 5, 6], target: 7 }, expected: 4 }
            ]
        };

        return testCases[problem.title] || [];
    }

    async createComprehensiveCourse() {
        try {
            console.log('🚀 Creating comprehensive LeetCode course...');

            const courseId = uuidv4();
            const course = {
                id: courseId,
                title: "Complete LeetCode Patterns Mastery",
                description: "Master essential coding patterns through hands-on LeetCode problems with multilingual support, interactive IDE, and comprehensive solutions.",
                difficulty_level: "intermediate",
                estimated_duration: "40 hours",
                course_type: "leetcode_patterns",
                is_published: true,
                teacher_id: uuidv4(),
                target_audience: "Software Engineers, Students, Interview Candidates",
                learning_outcomes: [
                    "Master fundamental coding patterns",
                    "Solve LeetCode problems efficiently",
                    "Write code in multiple programming languages",
                    "Understand time and space complexity",
                    "Prepare for technical interviews"
                ],
                prerequisites: ["Basic programming knowledge", "Understanding of data structures"],
                metadata: {
                    modules: this.patterns.map((pattern, patternIndex) => ({
                        id: `module-${patternIndex}`,
                        title: pattern.name,
                        description: pattern.description,
                        lessons: {
                            lessons: pattern.problems.map((problem, problemIndex) => ({
                                id: `lesson-${patternIndex}-${problemIndex}`,
                                title: problem.title,
                                description: problem.description,
                                lesson_type: "coding_problem",
                                difficulty: problem.difficulty,
                                examples: problem.examples,
                                constraints: problem.constraints,
                                test_cases: this.generateTestCases(problem),
                                boilerplate: this.supportedLanguages.reduce((acc, lang) => {
                                    acc[lang] = this.generateBoilerplate(problem, lang);
                                    return acc;
                                }, {}),
                                solutions: this.supportedLanguages.reduce((acc, lang) => {
                                    acc[lang] = this.generateSolution(problem, lang);
                                    return acc;
                                }, {}),
                                hints: [
                                    "Think about the most efficient approach",
                                    "Consider edge cases",
                                    "Optimize for time complexity"
                                ],
                                pattern_info: {
                                    pattern_name: pattern.name,
                                    time_complexity: "O(n)",
                                    space_complexity: "O(1)",
                                    key_concepts: ["Pattern recognition", "Algorithm optimization"]
                                }
                            }))
                        }
                    }))
                }
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
                'multi', // multilingual course
                course.course_type,
                course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`✅ Created comprehensive LeetCode course: ${course.title}`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`🎯 Patterns: ${this.patterns.length}`);
            console.log(`📝 Total Problems: ${this.patterns.reduce((sum, p) => sum + p.problems.length, 0)}`);
            console.log(`💻 Languages: ${this.supportedLanguages.join(', ')}`);

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error creating comprehensive course:', error);
            throw error;
        }
    }

    async createMultipleCourses() {
        try {
            // Create beginner course
            const beginnerCourse = await this.createBeginnerCourse();

            // Create advanced course
            const advancedCourse = await this.createAdvancedCourse();

            console.log('🎉 Successfully created multiple LeetCode courses!');
            return [beginnerCourse, advancedCourse];

        } catch (error) {
            console.error('❌ Error creating multiple courses:', error);
            throw error;
        }
    }

    async createBeginnerCourse() {
        const courseId = uuidv4();
        const beginnerProblems = [
            {
                name: "Array Basics",
                description: "Learn fundamental array operations",
                problems: [
                    {
                        title: "Two Sum",
                        difficulty: "easy",
                        description: "Find two numbers that add up to target",
                        examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
                        constraints: ["2 <= nums.length <= 10^4"]
                    }
                ]
            }
        ];

        const course = {
            id: courseId,
            title: "LeetCode Fundamentals - Beginner Track",
            description: "Start your coding journey with essential beginner-friendly LeetCode problems",
            difficulty_level: "beginner",
            estimated_duration: "20 hours",
            course_type: "leetcode_patterns",
            is_published: true,
            teacher_id: 'system-generated',
            target_audience: "Programming Beginners, CS Students",
            learning_outcomes: ["Master basic coding concepts", "Solve fundamental problems"],
            prerequisites: ["Basic programming syntax"],
            metadata: { modules: beginnerProblems.map((pattern, idx) => ({
                id: `beginner-module-${idx}`,
                title: pattern.name,
                description: pattern.description,
                lessons: {
                    lessons: pattern.problems.map((problem, pidx) => ({
                        id: `beginner-lesson-${idx}-${pidx}`,
                        title: problem.title,
                        description: problem.description,
                        lesson_type: "coding_problem",
                        difficulty: problem.difficulty,
                        examples: problem.examples,
                        constraints: problem.constraints,
                        test_cases: this.generateTestCases(problem),
                        boilerplate: this.supportedLanguages.reduce((acc, lang) => {
                            acc[lang] = this.generateBoilerplate(problem, lang);
                            return acc;
                        }, {}),
                        solutions: this.supportedLanguages.reduce((acc, lang) => {
                            acc[lang] = this.generateSolution(problem, lang);
                            return acc;
                        }, {})
                    }))
                }
            })) }
        };

        const insertQuery = `
            INSERT INTO enhanced_courses (
                id, title, description, teacher_id, difficulty_level,
                estimated_duration, target_audience, learning_outcomes,
                prerequisites, metadata, language, course_type, is_published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const values = [
            course.id, course.title, course.description, course.teacher_id,
            course.difficulty_level, course.estimated_duration, course.target_audience,
            JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
            JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
        ];

        const result = await pool.query(insertQuery, values);
        console.log(`✅ Created beginner course: ${course.title}`);
        return result.rows[0].id;
    }

    async createAdvancedCourse() {
        const courseId = uuidv4();
        const advancedProblems = [
            {
                name: "Dynamic Programming Masters",
                description: "Advanced DP patterns and optimizations",
                problems: [
                    {
                        title: "Longest Increasing Subsequence",
                        difficulty: "medium",
                        description: "Find the length of the longest strictly increasing subsequence",
                        examples: [{ input: "nums = [10,9,2,5,3,7,101,18]", output: "4" }],
                        constraints: ["1 <= nums.length <= 2500"]
                    }
                ]
            }
        ];

        const course = {
            id: courseId,
            title: "LeetCode Advanced - Expert Track",
            description: "Master advanced algorithms and data structures with challenging LeetCode problems",
            difficulty_level: "advanced",
            estimated_duration: "60 hours",
            course_type: "leetcode_patterns",
            is_published: true,
            teacher_id: 'system-generated',
            target_audience: "Experienced Developers, Senior Engineers",
            learning_outcomes: ["Master advanced algorithms", "Optimize complex solutions"],
            prerequisites: ["Strong programming background", "Data structures knowledge"],
            metadata: { modules: advancedProblems.map((pattern, idx) => ({
                id: `advanced-module-${idx}`,
                title: pattern.name,
                description: pattern.description,
                lessons: {
                    lessons: pattern.problems.map((problem, pidx) => ({
                        id: `advanced-lesson-${idx}-${pidx}`,
                        title: problem.title,
                        description: problem.description,
                        lesson_type: "coding_problem",
                        difficulty: problem.difficulty,
                        examples: problem.examples,
                        constraints: problem.constraints,
                        test_cases: [],
                        boilerplate: this.supportedLanguages.reduce((acc, lang) => {
                            acc[lang] = `// ${problem.title} - ${lang} boilerplate`;
                            return acc;
                        }, {}),
                        solutions: this.supportedLanguages.reduce((acc, lang) => {
                            acc[lang] = `// ${problem.title} - ${lang} solution`;
                            return acc;
                        }, {})
                    }))
                }
            })) }
        };

        const insertQuery = `
            INSERT INTO enhanced_courses (
                id, title, description, teacher_id, difficulty_level,
                estimated_duration, target_audience, learning_outcomes,
                prerequisites, metadata, language, course_type, is_published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const values = [
            course.id, course.title, course.description, course.teacher_id,
            course.difficulty_level, course.estimated_duration, course.target_audience,
            JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
            JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
        ];

        const result = await pool.query(insertQuery, values);
        console.log(`✅ Created advanced course: ${course.title}`);
        return result.rows[0].id;
    }
}

// Main execution
async function main() {
    try {
        const generator = new ComprehensiveLeetCodeGenerator();

        console.log('🎯 Starting comprehensive LeetCode course generation...');

        // Create the main comprehensive course
        await generator.createComprehensiveCourse();

        // Create additional courses for different skill levels
        await generator.createMultipleCourses();

        console.log('🎉 All LeetCode courses created successfully!');
        process.exit(0);

    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveLeetCodeGenerator;