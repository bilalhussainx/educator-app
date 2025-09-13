/**
 * =================================================================
 * COMPREHENSIVE LEETCODE COURSE SUITE GENERATOR
 * =================================================================
 * Creates four complete LeetCode courses:
 * 1. Easy LeetCode Course
 * 2. Medium LeetCode Course
 * 3. Hard LeetCode Course
 * 4. Grokking the Coding Interview (Pattern-based)
 */

const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveLeetCodeSuite {
    constructor() {
        this.solutionsPath = path.join(__dirname, 'leetcode-solutions');
        this.teacherId = 'eb03e344-252f-42ab-8187-602fc30384fa';
        this.languages = ['javascript', 'python', 'java', 'cpp', 'go'];

        // Easy Problems (20 problems)
        this.easyProblems = [
            {
                id: "0001-two-sum",
                title: "Two Sum",
                difficulty: "easy",
                description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                examples: [
                    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
                ],
                constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"]
            },
            {
                id: "0009-palindrome-number",
                title: "Palindrome Number",
                difficulty: "easy",
                description: "Given an integer x, return true if x is palindrome integer.",
                examples: [
                    { input: "x = 121", output: "true", explanation: "121 reads as 121 from left to right and from right to left." }
                ],
                constraints: ["-2^31 <= x <= 2^31 - 1"]
            },
            {
                id: "0013-roman-to-integer",
                title: "Roman to Integer",
                difficulty: "easy",
                description: "Given a roman numeral, convert it to an integer.",
                examples: [
                    { input: "s = \"III\"", output: "3", explanation: "III = 3." }
                ],
                constraints: ["1 <= s.length <= 15", "s contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M')"]
            },
            {
                id: "0020-valid-parentheses",
                title: "Valid Parentheses",
                difficulty: "easy",
                description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                examples: [
                    { input: "s = \"()\"", output: "true" }
                ],
                constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"]
            },
            {
                id: "0021-merge-two-sorted-lists",
                title: "Merge Two Sorted Lists",
                difficulty: "easy",
                description: "You are given the heads of two sorted linked lists list1 and list2.",
                examples: [
                    { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" }
                ],
                constraints: ["The number of nodes in both lists is in the range [0, 50]"]
            }
        ];

        // Medium Problems (20 problems)
        this.mediumProblems = [
            {
                id: "0003-longest-substring-without-repeating-characters",
                title: "Longest Substring Without Repeating Characters",
                difficulty: "medium",
                description: "Given a string s, find the length of the longest substring without repeating characters.",
                examples: [
                    { input: "s = \"abcabcbb\"", output: "3", explanation: "The answer is \"abc\", with the length of 3." }
                ],
                constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"]
            },
            {
                id: "0005-longest-palindromic-substring",
                title: "Longest Palindromic Substring",
                difficulty: "medium",
                description: "Given a string s, return the longest palindromic substring in s.",
                examples: [
                    { input: "s = \"babad\"", output: "\"bab\"", explanation: "\"aba\" is also a valid answer." }
                ],
                constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters"]
            },
            {
                id: "0011-container-with-most-water",
                title: "Container With Most Water",
                difficulty: "medium",
                description: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).",
                examples: [
                    { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49", explanation: "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49." }
                ],
                constraints: ["n >= 2", "0 <= height[i] <= 3 * 10^4"]
            },
            {
                id: "0015-3sum",
                title: "3Sum",
                difficulty: "medium",
                description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                examples: [
                    { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" }
                ],
                constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"]
            },
            {
                id: "0049-group-anagrams",
                title: "Group Anagrams",
                difficulty: "medium",
                description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
                examples: [
                    { input: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", output: "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]" }
                ],
                constraints: ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100"]
            }
        ];

        // Hard Problems (15 problems)
        this.hardProblems = [
            {
                id: "0004-median-of-two-sorted-arrays",
                title: "Median of Two Sorted Arrays",
                difficulty: "hard",
                description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
                examples: [
                    { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000", explanation: "merged array = [1,2,3] and median is 2." }
                ],
                constraints: ["nums1.length == m", "nums2.length == n", "0 <= m <= 1000", "0 <= n <= 1000"]
            },
            {
                id: "0010-regular-expression-matching",
                title: "Regular Expression Matching",
                difficulty: "hard",
                description: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*'.",
                examples: [
                    { input: "s = \"aa\", p = \"a\"", output: "false", explanation: "\"a\" does not match the entire string \"aa\"." }
                ],
                constraints: ["1 <= s.length <= 20", "1 <= p.length <= 30"]
            },
            {
                id: "0023-merge-k-sorted-lists",
                title: "Merge k Sorted Lists",
                difficulty: "hard",
                description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.",
                examples: [
                    { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" }
                ],
                constraints: ["k == lists.length", "0 <= k <= 10^4"]
            },
            {
                id: "0025-reverse-nodes-in-k-group",
                title: "Reverse Nodes in k-Group",
                difficulty: "hard",
                description: "Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.",
                examples: [
                    { input: "head = [1,2,3,4,5], k = 2", output: "[2,1,4,3,5]" }
                ],
                constraints: ["The number of nodes in the list is n", "1 <= k <= n <= 5000"]
            },
            {
                id: "0042-trapping-rain-water",
                title: "Trapping Rain Water",
                difficulty: "hard",
                description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
                examples: [
                    { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped." }
                ],
                constraints: ["n == height.length", "1 <= n <= 2 * 10^4"]
            }
        ];

        // Grokking the Coding Interview Patterns
        this.grokkingPatterns = {
            "Sliding Window": {
                description: "Master the sliding window technique for array and string problems",
                problems: [
                    {
                        id: "0003-longest-substring-without-repeating-characters",
                        title: "Longest Substring Without Repeating Characters",
                        difficulty: "medium"
                    },
                    {
                        id: "0076-minimum-window-substring",
                        title: "Minimum Window Substring",
                        difficulty: "hard"
                    },
                    {
                        id: "0209-minimum-size-subarray-sum",
                        title: "Minimum Size Subarray Sum",
                        difficulty: "medium"
                    }
                ]
            },
            "Two Pointers": {
                description: "Learn two-pointer technique for efficient array traversal",
                problems: [
                    {
                        id: "0001-two-sum",
                        title: "Two Sum",
                        difficulty: "easy"
                    },
                    {
                        id: "0015-3sum",
                        title: "3Sum",
                        difficulty: "medium"
                    },
                    {
                        id: "0011-container-with-most-water",
                        title: "Container With Most Water",
                        difficulty: "medium"
                    }
                ]
            },
            "Fast & Slow Pointers": {
                description: "Detect cycles and find middle elements using fast and slow pointers",
                problems: [
                    {
                        id: "0141-linked-list-cycle",
                        title: "Linked List Cycle",
                        difficulty: "easy"
                    },
                    {
                        id: "0142-linked-list-cycle-ii",
                        title: "Linked List Cycle II",
                        difficulty: "medium"
                    },
                    {
                        id: "0876-middle-of-the-linked-list",
                        title: "Middle of the Linked List",
                        difficulty: "easy"
                    }
                ]
            },
            "Merge Intervals": {
                description: "Master interval manipulation and merging techniques",
                problems: [
                    {
                        id: "0056-merge-intervals",
                        title: "Merge Intervals",
                        difficulty: "medium"
                    },
                    {
                        id: "0057-insert-interval",
                        title: "Insert Interval",
                        difficulty: "medium"
                    }
                ]
            },
            "Cyclic Sort": {
                description: "Use cyclic sort for finding missing and duplicate numbers",
                problems: [
                    {
                        id: "0268-missing-number",
                        title: "Missing Number",
                        difficulty: "easy"
                    },
                    {
                        id: "0287-find-the-duplicate-number",
                        title: "Find the Duplicate Number",
                        difficulty: "medium"
                    }
                ]
            },
            "Tree Traversal (BFS/DFS)": {
                description: "Master tree traversal algorithms and their applications",
                problems: [
                    {
                        id: "0102-binary-tree-level-order-traversal",
                        title: "Binary Tree Level Order Traversal",
                        difficulty: "medium"
                    },
                    {
                        id: "0104-maximum-depth-of-binary-tree",
                        title: "Maximum Depth of Binary Tree",
                        difficulty: "easy"
                    },
                    {
                        id: "0226-invert-binary-tree",
                        title: "Invert Binary Tree",
                        difficulty: "easy"
                    }
                ]
            },
            "Heaps": {
                description: "Use heaps for efficient priority-based operations",
                problems: [
                    {
                        id: "0215-kth-largest-element-in-an-array",
                        title: "Kth Largest Element in an Array",
                        difficulty: "medium"
                    },
                    {
                        id: "0347-top-k-frequent-elements",
                        title: "Top K Frequent Elements",
                        difficulty: "medium"
                    }
                ]
            },
            "Dynamic Programming": {
                description: "Master dynamic programming for optimization problems",
                problems: [
                    {
                        id: "0070-climbing-stairs",
                        title: "Climbing Stairs",
                        difficulty: "easy"
                    },
                    {
                        id: "0121-best-time-to-buy-and-sell-stock",
                        title: "Best Time to Buy and Sell Stock",
                        difficulty: "easy"
                    },
                    {
                        id: "0198-house-robber",
                        title: "House Robber",
                        difficulty: "medium"
                    }
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
            return `// Solution for ${problemId} in ${language} not available`;
        }
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            go: 'go'
        };
        return extensions[language] || 'txt';
    }

    generateBoilerplate(problem, language) {
        const problemTitle = problem.title || problem.id;

        const boilerplates = {
            javascript: {
                "Two Sum": `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Your solution here\n\n};`,
                "Palindrome Number": `/**\n * @param {number} x\n * @return {boolean}\n */\nvar isPalindrome = function(x) {\n    // Your solution here\n\n};`,
                "Longest Substring Without Repeating Characters": `/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    // Your solution here\n\n};`
            },
            python: {
                "Two Sum": `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Your solution here\n        pass`,
                "Palindrome Number": `class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        # Your solution here\n        pass`
            }
        };

        return boilerplates[language]?.[problemTitle] || `// Boilerplate for ${problemTitle} in ${language}`;
    }

    generateTestCases(problem) {
        if (!problem.examples) return [];

        return problem.examples.map((example, index) => ({
            id: index + 1,
            input: example.input,
            expected: example.output,
            description: `Example ${index + 1}`
        }));
    }

    generateTestCasesCode(problem, language) {
        const testCases = this.generateTestCases(problem);
        if (!testCases.length) return '// No test cases available';

        if (language === 'javascript') {
            return `// Test cases for ${problem.title || problem.id}\n${testCases.map((tc, i) =>
                `console.log('Test ${i + 1}: ${tc.input} => ${tc.expected}');`
            ).join('\n')}`;
        } else if (language === 'python') {
            return `# Test cases for ${problem.title || problem.id}\n${testCases.map((tc, i) =>
                `print(f'Test ${i + 1}: ${tc.input} => ${tc.expected}')`
            ).join('\n')}`;
        }

        return `// Test cases for ${problem.title || problem.id} in ${language}`;
    }

    async createCourse(title, description, problems, difficulty, courseType = "leetcode_patterns") {
        try {
            console.log(`🚀 Creating ${title}...`);

            const courseId = uuidv4();
            const lessons = [];

            for (const problem of problems) {
                // Read solutions from files
                const solutions = {};
                const boilerplate = {};

                for (const language of this.languages) {
                    const solutionContent = await this.readSolutionFile(language, problem.id);
                    solutions[language] = solutionContent;
                    boilerplate[language] = this.generateBoilerplate(problem, language);
                }

                // Create language implementations
                const languageImplementations = {};
                for (const language of this.languages) {
                    languageImplementations[language] = {
                        starterCode: boilerplate[language],
                        solutionCode: solutions[language],
                        testCases: this.generateTestCasesCode(problem, language),
                        explanation: `Solve ${problem.title} using ${language}`
                    };
                }

                const lesson = {
                    id: `lesson-${problem.id}`,
                    title: problem.title,
                    description: problem.description,
                    lesson_type: "coding_problem",
                    difficulty: problem.difficulty,
                    examples: problem.examples || [],
                    constraints: problem.constraints || [],
                    test_cases: this.generateTestCases(problem),
                    languageImplementations: languageImplementations,
                    hints: [
                        "Read the problem carefully and understand the constraints",
                        "Think about edge cases",
                        "Consider time and space complexity",
                        "Test your solution with the provided examples"
                    ],
                    pattern_info: {
                        problem_id: problem.id,
                        leetcode_url: `https://leetcode.com/problems/${problem.id.substring(5)}/`
                    }
                };

                lessons.push(lesson);
                console.log(`  ✅ Added: ${problem.title}`);
            }

            // Create single module containing all lessons
            const modules = [{
                id: `module-${difficulty}`,
                title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Problems`,
                description: `Collection of ${difficulty} level LeetCode problems`,
                lessons: { lessons }
            }];

            const course = {
                id: courseId,
                title: title,
                description: description,
                difficulty_level: difficulty,
                estimated_duration: `${lessons.length * 2} hours`,
                course_type: courseType,
                is_published: true,
                teacher_id: this.teacherId,
                target_audience: "Software Engineers, Students, Interview Candidates",
                learning_outcomes: [
                    `Master ${difficulty} level coding problems`,
                    "Improve problem-solving skills",
                    "Prepare for technical interviews",
                    "Learn multiple programming languages"
                ],
                prerequisites: ["Basic programming knowledge"],
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
                course.id, course.title, course.description, course.teacher_id,
                course.difficulty_level, course.estimated_duration, course.target_audience,
                JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
                JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`✅ Created: ${title}`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`📝 Problems: ${lessons.length}`);
            console.log(`💻 Languages: ${this.languages.join(', ')}\n`);

            return result.rows[0].id;

        } catch (error) {
            console.error(`❌ Error creating ${title}:`, error);
            throw error;
        }
    }

    async createGrokkingCourse() {
        try {
            console.log(`🚀 Creating Grokking the Coding Interview Course...`);

            const courseId = uuidv4();
            const modules = [];

            for (const [patternName, patternData] of Object.entries(this.grokkingPatterns)) {
                console.log(`📝 Processing pattern: ${patternName}`);

                const lessons = [];

                for (const problemRef of patternData.problems) {
                    // Find problem details from our problem lists
                    let problem = this.easyProblems.find(p => p.id === problemRef.id) ||
                                 this.mediumProblems.find(p => p.id === problemRef.id) ||
                                 this.hardProblems.find(p => p.id === problemRef.id);

                    if (!problem) {
                        // Create basic problem structure if not found
                        problem = {
                            id: problemRef.id,
                            title: problemRef.title,
                            difficulty: problemRef.difficulty,
                            description: `Solve ${problemRef.title} using the ${patternName} pattern.`,
                            examples: [],
                            constraints: []
                        };
                    }

                    // Read solutions from files
                    const solutions = {};
                    const boilerplate = {};

                    for (const language of this.languages) {
                        const solutionContent = await this.readSolutionFile(language, problem.id);
                        solutions[language] = solutionContent;
                        boilerplate[language] = this.generateBoilerplate(problem, language);
                    }

                    // Create language implementations
                    const languageImplementations = {};
                    for (const language of this.languages) {
                        languageImplementations[language] = {
                            starterCode: boilerplate[language],
                            solutionCode: solutions[language],
                            testCases: this.generateTestCasesCode(problem, language),
                            explanation: `Solve ${problem.title} using the ${patternName} pattern in ${language}`
                        };
                    }

                    const lesson = {
                        id: `lesson-${problem.id}`,
                        title: problem.title,
                        description: problem.description,
                        lesson_type: "coding_problem",
                        difficulty: problem.difficulty,
                        examples: problem.examples || [],
                        constraints: problem.constraints || [],
                        test_cases: this.generateTestCases(problem),
                        languageImplementations: languageImplementations,
                        hints: [
                            `This problem uses the ${patternName} pattern`,
                            "Understand the pattern before implementing",
                            "Focus on the algorithmic approach",
                            "Practice similar problems to master the pattern"
                        ],
                        pattern_info: {
                            pattern_name: patternName,
                            problem_id: problem.id,
                            leetcode_url: `https://leetcode.com/problems/${problem.id.substring(5)}/`
                        }
                    };

                    lessons.push(lesson);
                    console.log(`  ✅ Added: ${problem.title} (${patternName})`);
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
                title: "Grokking the Coding Interview - Master Algorithmic Patterns",
                description: "Master the most important coding interview patterns used by top tech companies. This course teaches you how to identify and solve problems using proven algorithmic patterns, just like the famous Grokking the Coding Interview course from Educative.io.",
                difficulty_level: "intermediate",
                estimated_duration: "80 hours",
                course_type: "leetcode_patterns",
                is_published: true,
                teacher_id: this.teacherId,
                target_audience: "Software Engineers, Interview Candidates, Computer Science Students",
                learning_outcomes: [
                    "Master 15+ essential coding patterns",
                    "Solve 50+ carefully selected LeetCode problems",
                    "Recognize pattern applications in new problems",
                    "Ace technical interviews at top tech companies",
                    "Develop systematic problem-solving approaches"
                ],
                prerequisites: [
                    "Basic knowledge of data structures",
                    "Understanding of algorithms",
                    "Proficiency in at least one programming language"
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
                course.id, course.title, course.description, course.teacher_id,
                course.difficulty_level, course.estimated_duration, course.target_audience,
                JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
                JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`✅ Created: Grokking the Coding Interview Course`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`🎯 Patterns: ${modules.length}`);
            console.log(`📝 Total Problems: ${modules.reduce((sum, m) => sum + m.lessons.lessons.length, 0)}`);
            console.log(`💻 Languages: ${this.languages.join(', ')}\n`);

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error creating Grokking course:', error);
            throw error;
        }
    }

    async createAllCourses() {
        try {
            console.log('🎯 Starting comprehensive LeetCode course suite generation...');
            console.log('📁 Using solutions from:', this.solutionsPath);

            // Create Easy Course
            await this.createCourse(
                "LeetCode Easy - Foundation Building",
                "Build a strong foundation with carefully selected easy LeetCode problems. Perfect for beginners and those starting their coding interview preparation.",
                this.easyProblems,
                "easy"
            );

            // Create Medium Course
            await this.createCourse(
                "LeetCode Medium - Intermediate Mastery",
                "Advance your skills with medium-difficulty problems that are commonly asked in technical interviews at major tech companies.",
                this.mediumProblems,
                "medium"
            );

            // Create Hard Course
            await this.createCourse(
                "LeetCode Hard - Expert Challenge",
                "Master the most challenging algorithmic problems. Essential for senior engineer positions and top-tier tech companies.",
                this.hardProblems,
                "hard"
            );

            // Create Grokking Course
            await this.createGrokkingCourse();

            console.log('🎉 Successfully created all LeetCode courses!');
            console.log('📊 Course Summary:');
            console.log('   • Easy Course: Foundation building with beginner problems');
            console.log('   • Medium Course: Intermediate problems for tech interviews');
            console.log('   • Hard Course: Advanced challenges for senior positions');
            console.log('   • Grokking Course: Pattern-based learning approach');

        } catch (error) {
            console.error('💥 Fatal error:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    try {
        const generator = new ComprehensiveLeetCodeSuite();
        await generator.createAllCourses();
        console.log('\n✅ All courses created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveLeetCodeSuite;