/**
 * =================================================================
 * ENHANCED LEETCODE COURSE GENERATOR - INDUSTRY STANDARD
 * =================================================================
 * Creates professional LeetCode-style courses using free APIs and AI
 * Features:
 * - Integration with free LeetCode APIs (alfa-leetcode-api, noworneverev)
 * - Comprehensive problem descriptions and test cases
 * - Industry-standard workflow (similar to LeetCode platform)
 * - Multi-language support (JavaScript, Python, Java)
 * - Difficulty progression and pattern-based learning
 * - Real LeetCode problem data enhancement
 * - Automated test case generation and validation
 */

require('dotenv').config();
const db = require('./educators-edge-backend/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

class EnhancedLeetCodeGenerator {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        if (!this.claudeApiKey) {
            console.warn('⚠️ CLAUDE_API_KEY or ANTHROPIC_API_KEY not found - AI enhancement will be disabled');
            this.claudeApiKey = null;
        }

        // Initialize API clients
        if (this.claudeApiKey) {
            this.claudeClient = axios.create({
                baseURL: 'https://api.anthropic.com',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.claudeApiKey,
                    'anthropic-version': '2023-06-01'
                }
            });
        } else {
            this.claudeClient = null;
        }

        // LeetCode API endpoints (free)
        this.leetcodeAPIs = {
            alfa: 'https://alfa-leetcode-api.onrender.com',
            problems: 'https://leetcode-api-pied.vercel.app'
        };

        // LeetCode patterns for course organization
        this.codingPatterns = {
            'arrays-hashing': {
                name: 'Arrays & Hashing',
                description: 'Master array manipulation and hash table techniques',
                difficulty: 'easy'
            },
            'two-pointers': {
                name: 'Two Pointers',
                description: 'Efficient array and string processing with two-pointer technique',
                difficulty: 'easy'
            },
            'sliding-window': {
                name: 'Sliding Window',
                description: 'Optimize substring and subarray problems',
                difficulty: 'medium'
            },
            'stack': {
                name: 'Stack',
                description: 'Stack-based problem solving techniques',
                difficulty: 'medium'
            },
            'binary-search': {
                name: 'Binary Search',
                description: 'Efficient searching in sorted data structures',
                difficulty: 'medium'
            },
            'linked-list': {
                name: 'Linked List',
                description: 'Master linked list manipulation and algorithms',
                difficulty: 'medium'
            },
            'trees': {
                name: 'Trees',
                description: 'Tree traversal and manipulation algorithms',
                difficulty: 'medium'
            },
            'tries': {
                name: 'Tries',
                description: 'Prefix tree implementation and applications',
                difficulty: 'hard'
            },
            'heap-priority-queue': {
                name: 'Heap / Priority Queue',
                description: 'Priority-based problem solving with heaps',
                difficulty: 'hard'
            },
            'backtracking': {
                name: 'Backtracking',
                description: 'Systematic search through solution spaces',
                difficulty: 'hard'
            },
            'graphs': {
                name: 'Graphs',
                description: 'Graph algorithms including DFS, BFS, and shortest paths',
                difficulty: 'hard'
            },
            'advanced-graphs': {
                name: 'Advanced Graphs',
                description: 'Complex graph algorithms and optimizations',
                difficulty: 'hard'
            },
            '1d-dynamic-programming': {
                name: '1-D Dynamic Programming',
                description: 'One-dimensional dynamic programming patterns',
                difficulty: 'medium'
            },
            '2d-dynamic-programming': {
                name: '2-D Dynamic Programming',
                description: 'Two-dimensional dynamic programming techniques',
                difficulty: 'hard'
            },
            'greedy': {
                name: 'Greedy',
                description: 'Greedy algorithms and optimization problems',
                difficulty: 'medium'
            },
            'intervals': {
                name: 'Intervals',
                description: 'Interval-based problems and merge techniques',
                difficulty: 'medium'
            },
            'math-geometry': {
                name: 'Math & Geometry',
                description: 'Mathematical and geometric problem solving',
                difficulty: 'medium'
            },
            'bit-manipulation': {
                name: 'Bit Manipulation',
                description: 'Bitwise operations and optimization techniques',
                difficulty: 'medium'
            }
        };
    }

    /**
     * Fetch problems from free LeetCode APIs
     */
    async fetchLeetCodeProblems(limit = 20, difficulty = 'easy') {
        console.log(`🔍 Fetching ${limit} ${difficulty} problems from LeetCode APIs...`);

        try {
            // Try alfa-leetcode-api first
            const response = await axios.get(`${this.leetcodeAPIs.alfa}/problems`, {
                params: {
                    limit: limit,
                    difficulty: difficulty.toUpperCase()
                },
                timeout: 10000
            });

            if (response.data && response.data.problems) {
                console.log(`✅ Fetched ${response.data.problems.length} problems from alfa-leetcode-api`);
                return response.data.problems;
            }
        } catch (error) {
            console.warn('⚠️ alfa-leetcode-api failed, trying fallback...');
        }

        try {
            // Fallback to problems API
            const response = await axios.get(`${this.leetcodeAPIs.problems}/problems`, {
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const filteredProblems = response.data
                    .filter(p => p.difficulty?.toLowerCase() === difficulty.toLowerCase())
                    .slice(0, limit);

                console.log(`✅ Fetched ${filteredProblems.length} problems from fallback API`);
                return filteredProblems;
            }
        } catch (error) {
            console.warn('⚠️ Fallback API also failed');
        }

        // If APIs fail, return mock data structure
        console.log('⚠️ Using mock data as fallback');
        return this.generateMockProblems(limit, difficulty);
    }

    /**
     * Generate mock problems if APIs are unavailable
     */
    generateMockProblems(count, difficulty) {
        const mockProblems = [];
        const baseProblems = {
            easy: [
                { title: 'Two Sum', problemNumber: 1 },
                { title: 'Valid Parentheses', problemNumber: 20 },
                { title: 'Merge Two Sorted Lists', problemNumber: 21 },
                { title: 'Best Time to Buy and Sell Stock', problemNumber: 121 },
                { title: 'Valid Palindrome', problemNumber: 125 }
            ],
            medium: [
                { title: 'Add Two Numbers', problemNumber: 2 },
                { title: 'Longest Substring Without Repeating Characters', problemNumber: 3 },
                { title: 'Container With Most Water', problemNumber: 11 },
                { title: 'Product of Array Except Self', problemNumber: 238 },
                { title: 'Group Anagrams', problemNumber: 49 }
            ],
            hard: [
                { title: 'Median of Two Sorted Arrays', problemNumber: 4 },
                { title: 'Trapping Rain Water', problemNumber: 42 },
                { title: 'Sliding Window Maximum', problemNumber: 239 },
                { title: 'Word Ladder', problemNumber: 127 },
                { title: 'Alien Dictionary', problemNumber: 269 }
            ]
        };

        const problems = baseProblems[difficulty] || baseProblems.easy;

        for (let i = 0; i < Math.min(count, problems.length); i++) {
            mockProblems.push({
                title: problems[i].title,
                problemNumber: problems[i].problemNumber,
                difficulty: difficulty,
                acceptance: Math.floor(Math.random() * 40) + 30,
                frequency: Math.floor(Math.random() * 100),
                url: `https://leetcode.com/problems/${problems[i].title.toLowerCase().replace(/\s+/g, '-')}/`
            });
        }

        return mockProblems;
    }

    /**
     * Enhance problem with detailed description and test cases using AI
     */
    async enhanceProblemWithAI(problem, pattern) {
        console.log(`🤖 Enhancing problem: ${problem.title}`);

        // If no Claude API key, return basic structure
        if (!this.claudeClient) {
            console.log('  ⚠️ AI enhancement disabled - using basic problem structure');
            return this.createBasicProblemStructure(problem, pattern);
        }

        const enhancementPrompt = `You are a senior software engineer creating a comprehensive LeetCode-style problem.

PROBLEM: ${problem.title}
PATTERN: ${pattern}
DIFFICULTY: ${problem.difficulty}
LEETCODE NUMBER: ${problem.problemNumber || 'N/A'}

Create a complete, industry-standard problem description with:

1. DETAILED PROBLEM STATEMENT
   - Clear, concise problem description
   - Input/output format specification
   - Constraints clearly defined
   - Edge cases mentioned

2. COMPREHENSIVE EXAMPLES
   - At least 3 examples with detailed explanations
   - Include edge cases in examples
   - Show step-by-step reasoning

3. ALGORITHM APPROACH
   - Optimal approach explanation
   - Time and space complexity analysis
   - Alternative approaches if applicable

4. TEST CASES
   - Comprehensive test suite (minimum 8 test cases)
   - Include edge cases, boundary conditions
   - Mix of small and large inputs
   - Format: { input: {...}, expected: ..., description: "..." }

5. HINTS SYSTEM
   - Progressive hints (3-5 hints)
   - Guide from brute force to optimal solution
   - Pattern-specific guidance

Return as JSON:
{
  "title": "${problem.title}",
  "difficulty": "${problem.difficulty}",
  "pattern": "${pattern}",
  "problemStatement": "detailed problem description",
  "inputFormat": "input specification",
  "outputFormat": "output specification",
  "constraints": ["constraint1", "constraint2"],
  "examples": [
    {
      "input": "example input",
      "output": "expected output",
      "explanation": "step by step explanation"
    }
  ],
  "approach": {
    "algorithm": "optimal approach description",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)",
    "keyInsights": ["insight1", "insight2"]
  },
  "testCases": [
    {
      "input": "test input",
      "expected": "expected output",
      "description": "test case description"
    }
  ],
  "hints": [
    "hint 1 - brute force approach",
    "hint 2 - optimization insight",
    "hint 3 - optimal solution"
  ],
  "followUp": ["follow up question 1", "follow up question 2"],
  "relatedProblems": ["related problem 1", "related problem 2"]
}

Return ONLY valid JSON.`;

        try {
            const response = await this.claudeClient.post('/v1/messages', {
                model: 'claude-3-haiku-20240307',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: enhancementPrompt
                }]
            });

            let responseText = response.data.content[0].text;
            const enhancedProblem = this.parseCleanJSON(responseText);
            console.log(`✅ Enhanced problem: ${problem.title}`);
            return enhancedProblem;

        } catch (error) {
            console.error(`❌ Error enhancing problem ${problem.title}:`, error.message);
            // Return basic structure if AI enhancement fails
            return this.createBasicProblemStructure(problem, pattern);
        }
    }

    /**
     * Parse and clean JSON response from AI
     */
    parseCleanJSON(responseText) {
        try {
            // Step 1: Basic cleaning
            responseText = responseText.trim();

            // Step 2: Remove markdown code blocks
            if (responseText.startsWith('```json')) {
                responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (responseText.startsWith('```')) {
                responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Step 3: Extract JSON from text if it contains extra content
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            // Step 4: Simple control character removal (only the problematic ones)
            responseText = responseText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

            // Step 5: Try to parse
            return JSON.parse(responseText);

        } catch (firstError) {
            console.warn('JSON parse failed:', firstError.message);
            console.warn('Falling back to basic template structure');

            // Return a minimal valid structure if parsing fails
            return {
                starterCode: "// Basic starter code template",
                solutionCode: "// Basic solution template",
                testRunner: "// Basic test runner template",
                explanation: "Basic implementation template"
            };
        }
    }

    /**
     * Create basic problem structure if AI enhancement fails
     */
    createBasicProblemStructure(problem, pattern) {
        return {
            title: problem.title,
            difficulty: problem.difficulty,
            pattern: pattern,
            problemStatement: `Solve the ${problem.title} problem using ${pattern} pattern.`,
            inputFormat: "Standard input format",
            outputFormat: "Standard output format",
            constraints: ["1 <= n <= 10^4"],
            examples: [
                {
                    input: "Example input",
                    output: "Example output",
                    explanation: "Basic explanation"
                }
            ],
            approach: {
                algorithm: `Use ${pattern} approach`,
                timeComplexity: "O(n)",
                spaceComplexity: "O(1)",
                keyInsights: [`Apply ${pattern} pattern`]
            },
            testCases: [
                {
                    input: "test1",
                    expected: "result1",
                    description: "Basic test case"
                }
            ],
            hints: [
                `Consider using ${pattern}`,
                "Think about the optimal approach",
                "Implement step by step"
            ],
            followUp: [],
            relatedProblems: []
        };
    }

    /**
     * Generate code implementations for multiple languages
     */
    async generateCodeImplementations(enhancedProblem) {
        console.log(`💻 Generating code for: ${enhancedProblem.title}`);

        const languages = ['javascript', 'python', 'java'];
        const implementations = {};

        for (const language of languages) {
            try {
                // If no Claude API key, use basic templates
                if (!this.claudeClient) {
                    console.log(`  ⚠️ AI code generation disabled - using basic template for ${language}`);
                    implementations[language] = this.getBasicCodeTemplate(language, enhancedProblem);
                    continue;
                }
                const codePrompt = `Generate production-quality ${language} code for this LeetCode problem:

PROBLEM: ${enhancedProblem.title}
PATTERN: ${enhancedProblem.pattern}
DIFFICULTY: ${enhancedProblem.difficulty}

PROBLEM STATEMENT:
${enhancedProblem.problemStatement}

APPROACH:
${enhancedProblem.approach.algorithm}
Time: ${enhancedProblem.approach.timeComplexity}
Space: ${enhancedProblem.approach.spaceComplexity}

Generate 3 components:

1. STARTER CODE - Template with:
   - Function signature with proper types
   - Parameter descriptions in comments
   - TODO comments guiding implementation
   - Basic structure/skeleton

2. SOLUTION CODE - Complete implementation with:
   - Optimal algorithm implementation
   - Detailed comments explaining logic
   - Edge case handling
   - Clean, readable code

3. TEST RUNNER - Comprehensive test suite with:
   - All provided test cases
   - Additional edge cases
   - Performance validation
   - Clear output formatting

LANGUAGE REQUIREMENTS for ${language}:
${this.getLanguageRequirements(language)}

Return as JSON:
{
  "starterCode": "template with function signature and TODOs",
  "solutionCode": "complete optimized implementation",
  "testRunner": "comprehensive test suite with runner",
  "explanation": "detailed implementation explanation"
}

Return ONLY valid JSON.`;

                const response = await this.claudeClient.post('/v1/messages', {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 3000,
                    messages: [{
                        role: 'user',
                        content: codePrompt
                    }]
                });

                let responseText = response.data.content[0].text;
                implementations[language] = this.parseCleanJSON(responseText);
                console.log(`✅ Generated ${language} code`);

                // Small delay to respect API limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error generating ${language} code:`, error.message);
                implementations[language] = this.getBasicCodeTemplate(language, enhancedProblem);
            }
        }

        return implementations;
    }

    /**
     * Get language-specific requirements
     */
    getLanguageRequirements(language) {
        const requirements = {
            javascript: `
- Use modern ES6+ syntax and features
- Include comprehensive JSDoc comments
- Use const/let appropriately (no var)
- Include console.log based test runner
- Use proper error handling
- Follow JavaScript naming conventions`,

            python: `
- Use type hints for all functions
- Include detailed docstrings (Google style)
- Follow PEP 8 conventions strictly
- Use unittest framework for tests
- Include proper exception handling
- Use snake_case naming convention`,

            java: `
- Use proper Java naming conventions
- Include comprehensive Javadoc comments
- Use generic types where appropriate
- Include JUnit test framework
- Proper exception handling
- Follow Oracle Java style guidelines`
        };

        return requirements[language] || requirements.javascript;
    }

    /**
     * Get basic code template if AI generation fails
     */
    getBasicCodeTemplate(language, problem) {
        const templates = {
            javascript: {
                starterCode: `/**
 * ${problem.title}
 * Pattern: ${problem.pattern}
 * Difficulty: ${problem.difficulty}
 *
 * @param {any} input - Problem input
 * @return {any} - Problem output
 */
function solve(input) {
    // TODO: Implement your solution here
    // Pattern: ${problem.pattern}
    // Consider time and space complexity

    return null;
}

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = solve;
}`,
                solutionCode: `/**
 * ${problem.title} - Solution
 * Pattern: ${problem.pattern}
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */
function solve(input) {
    // Basic implementation for ${problem.title}
    // Using ${problem.pattern} pattern

    return input; // Placeholder implementation
}

if (typeof module !== 'undefined') {
    module.exports = solve;
}`,
                testRunner: `// Test cases for ${problem.title}
const solve = require('./solution');

const testCases = [
    { input: "test1", expected: "result1", description: "Basic test case" },
    { input: "test2", expected: "result2", description: "Edge case" },
    { input: "test3", expected: "result3", description: "Large input" }
];

console.log('Running tests for ${problem.title}...');

testCases.forEach((testCase, index) => {
    try {
        const result = solve(testCase.input);
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
        console.log(\`Test \${index + 1}: \${passed ? '✅ PASS' : '❌ FAIL'} - \${testCase.description}\`);
        if (!passed) {
            console.log(\`  Expected: \${JSON.stringify(testCase.expected)}\`);
            console.log(\`  Got: \${JSON.stringify(result)}\`);
        }
    } catch (error) {
        console.log(\`Test \${index + 1}: ❌ ERROR - \${error.message}\`);
    }
});`,
                explanation: `Basic ${language} implementation for ${problem.title} using ${problem.pattern} pattern`
            },
            python: {
                starterCode: `"""
${problem.title}
Pattern: ${problem.pattern}
Difficulty: ${problem.difficulty}
"""

def solve(input_data):
    """
    TODO: Implement your solution here
    Pattern: ${problem.pattern}

    Args:
        input_data: Problem input

    Returns:
        Problem output
    """
    pass`,
                solutionCode: `"""
${problem.title} - Solution
Pattern: ${problem.pattern}
Time Complexity: O(n)
Space Complexity: O(1)
"""

def solve(input_data):
    """
    Basic implementation for ${problem.title}
    Using ${problem.pattern} pattern
    """
    return input_data  # Placeholder implementation`,
                testRunner: `#!/usr/bin/env python3
"""Test cases for ${problem.title}"""

def solve(input_data):
    # Import your solution here
    return input_data  # Placeholder

def run_tests():
    test_cases = [
        {"input": "test1", "expected": "result1", "description": "Basic test case"},
        {"input": "test2", "expected": "result2", "description": "Edge case"},
        {"input": "test3", "expected": "result3", "description": "Large input"}
    ]

    print(f"Running tests for ${problem.title}...")

    for i, test_case in enumerate(test_cases, 1):
        try:
            result = solve(test_case["input"])
            passed = result == test_case["expected"]
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"Test {i}: {status} - {test_case['description']}")

            if not passed:
                print(f"  Expected: {test_case['expected']}")
                print(f"  Got: {result}")
        except Exception as e:
            print(f"Test {i}: ❌ ERROR - {str(e)}")

if __name__ == "__main__":
    run_tests()`,
                explanation: `Basic ${language} implementation for ${problem.title} using ${problem.pattern} pattern`
            },
            java: {
                starterCode: `/**
 * ${problem.title}
 * Pattern: ${problem.pattern}
 * Difficulty: ${problem.difficulty}
 */
public class Solution {
    /**
     * TODO: Implement your solution here
     * Pattern: ${problem.pattern}
     *
     * @param input Problem input
     * @return Problem output
     */
    public Object solve(Object input) {
        // TODO: Implement solution
        return null;
    }
}`,
                solutionCode: `/**
 * ${problem.title} - Solution
 * Pattern: ${problem.pattern}
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */
public class Solution {
    /**
     * Basic implementation for ${problem.title}
     * Using ${problem.pattern} pattern
     */
    public Object solve(Object input) {
        return input; // Placeholder implementation
    }
}`,
                testRunner: `import java.util.*;

public class TestRunner {
    public static void main(String[] args) {
        Solution solution = new Solution();

        // Test cases for ${problem.title}
        Object[][] testCases = {
            {"test1", "result1", "Basic test case"},
            {"test2", "result2", "Edge case"},
            {"test3", "result3", "Large input"}
        };

        System.out.println("Running tests for ${problem.title}...");

        for (int i = 0; i < testCases.length; i++) {
            try {
                Object input = testCases[i][0];
                Object expected = testCases[i][1];
                String description = (String) testCases[i][2];

                Object result = solution.solve(input);
                boolean passed = Objects.equals(result, expected);

                System.out.printf("Test %d: %s - %s%n",
                    i + 1,
                    passed ? "✅ PASS" : "❌ FAIL",
                    description);

                if (!passed) {
                    System.out.printf("  Expected: %s%n", expected);
                    System.out.printf("  Got: %s%n", result);
                }
            } catch (Exception e) {
                System.out.printf("Test %d: ❌ ERROR - %s%n", i + 1, e.getMessage());
            }
        }
    }
}`,
                explanation: `Basic ${language} implementation for ${problem.title} using ${problem.pattern} pattern`
            }
        };

        return templates[language] || templates.javascript;
    }

    /**
     * Create a comprehensive LeetCode-style course
     */
    async generateLeetCodeCourse(courseSpec) {
        console.log(`🚀 Generating LeetCode course: ${courseSpec.title}`);

        const course = {
            id: uuidv4(),
            title: courseSpec.title,
            description: courseSpec.description,
            difficulty_level: courseSpec.difficulty,
            estimated_duration: courseSpec.estimatedDuration || "20-30 hours",
            prerequisites: courseSpec.prerequisites || ["Basic programming knowledge"],
            learning_objectives: courseSpec.learningObjectives || [
                "Master algorithmic problem solving",
                "Learn industry coding patterns",
                "Prepare for technical interviews"
            ],
            course_type: "leetcode_enhanced",
            modules: []
        };

        // Generate modules based on patterns
        const patterns = courseSpec.patterns || Object.keys(this.codingPatterns).slice(0, 5);

        for (let i = 0; i < patterns.length; i++) {
            const patternKey = patterns[i];
            const pattern = this.codingPatterns[patternKey];

            if (!pattern) continue;

            console.log(`📚 Generating module: ${pattern.name}`);

            // Fetch problems for this pattern
            const problems = await this.fetchLeetCodeProblems(
                courseSpec.problemsPerPattern || 5,
                pattern.difficulty
            );

            const lessons = [];

            // Enhance each problem
            for (let j = 0; j < problems.length; j++) {
                const problem = problems[j];

                try {
                    // Enhance with AI
                    const enhancedProblem = await this.enhanceProblemWithAI(problem, pattern.name);

                    // Generate code implementations
                    const implementations = await this.generateCodeImplementations(enhancedProblem);

                    // Create lesson structure
                    const lesson = {
                        title: enhancedProblem.title,
                        description: enhancedProblem.problemStatement,
                        pattern: enhancedProblem.pattern,
                        difficulty: enhancedProblem.difficulty,
                        estimated_time: "30-45 minutes",
                        problemData: enhancedProblem,
                        languageImplementations: implementations,
                        metadata: {
                            leetcodeNumber: problem.problemNumber,
                            timeComplexity: enhancedProblem.approach.timeComplexity,
                            spaceComplexity: enhancedProblem.approach.spaceComplexity,
                            pattern: patternKey,
                            testCases: enhancedProblem.testCases
                        }
                    };

                    lessons.push(lesson);
                    console.log(`✅ Created lesson: ${lesson.title}`);

                } catch (error) {
                    console.error(`❌ Failed to create lesson for ${problem.title}:`, error.message);
                }
            }

            // Create module
            const module = {
                title: pattern.name,
                description: pattern.description,
                estimated_duration: `${lessons.length * 45} minutes`,
                core_patterns: [pattern.name],
                difficulty: pattern.difficulty,
                lessons: {
                    count: lessons.length,
                    lessons: lessons
                }
            };

            course.modules.push(module);
        }

        console.log(`✅ Course generation completed: ${course.modules.length} modules, ${course.modules.reduce((sum, m) => sum + m.lessons.count, 0)} lessons`);
        return course;
    }

    /**
     * Save enhanced course to database
     */
    async saveCourseToDatabase(courseData, teacherId = null) {
        console.log('💾 Saving enhanced course to database...');

        try {
            const courseId = courseData.id;
            // Use NULL for system-generated courses if no teacher provided
            const systemTeacherId = teacherId || null;

            // Save to enhanced_courses table
            await db.query(`
                INSERT INTO enhanced_courses (
                    id, title, description, difficulty_level, estimated_duration,
                    prerequisites, learning_outcomes, metadata, teacher_id,
                    is_published, course_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                courseId,
                courseData.title,
                courseData.description,
                courseData.difficulty_level,
                courseData.estimated_duration,
                JSON.stringify(courseData.prerequisites),
                JSON.stringify(courseData.learning_objectives || courseData.learning_outcomes || []),
                JSON.stringify(courseData),
                systemTeacherId,
                true,
                courseData.course_type
            ]);

            console.log(`✅ Enhanced course saved with ID: ${courseId}`);
            return courseId;

        } catch (error) {
            console.error('❌ Error saving course:', error.message);
            throw error;
        }
    }

    /**
     * Generate example enhanced courses
     */
    async generateExampleCourses() {
        console.log('🎯 Generating enhanced LeetCode courses...');

        const courses = [
            {
                title: "LeetCode Interview Prep - Arrays & Hashing Mastery",
                description: "Master the most fundamental coding interview patterns with comprehensive problems, solutions, and test cases.",
                difficulty: "beginner",
                patterns: ['arrays-hashing', 'two-pointers', 'sliding-window'],
                problemsPerPattern: 6,
                estimatedDuration: "15-20 hours"
            },
            {
                title: "Advanced Data Structures - Trees, Graphs & Dynamic Programming",
                description: "Tackle complex algorithmic challenges with advanced data structures and dynamic programming techniques.",
                difficulty: "advanced",
                patterns: ['trees', 'graphs', '1d-dynamic-programming', '2d-dynamic-programming'],
                problemsPerPattern: 5,
                estimatedDuration: "25-30 hours"
            },
            {
                title: "System Design Foundations - Algorithm Patterns",
                description: "Build algorithmic thinking skills essential for system design interviews and scalable software development.",
                difficulty: "intermediate",
                patterns: ['binary-search', 'heap-priority-queue', 'greedy', 'intervals'],
                problemsPerPattern: 4,
                estimatedDuration: "18-22 hours"
            }
        ];

        const results = [];

        for (const courseSpec of courses) {
            try {
                console.log(`\n🔄 Generating: ${courseSpec.title}`);
                const courseData = await this.generateLeetCodeCourse(courseSpec);
                const courseId = await this.saveCourseToDatabase(courseData);

                results.push({
                    courseId,
                    title: courseSpec.title,
                    modulesCount: courseData.modules.length,
                    lessonsCount: courseData.modules.reduce((sum, m) => sum + m.lessons.count, 0)
                });

                console.log(`✅ Successfully generated: ${courseSpec.title}`);

                // Longer delay between courses
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error) {
                console.error(`❌ Failed to generate: ${courseSpec.title}`, error.message);
            }
        }

        return results;
    }

    /**
     * Enhance existing courses with better descriptions and test cases
     */
    async enhanceExistingCourses() {
        console.log('🔧 Enhancing existing courses...');

        try {
            // Get existing enhanced courses
            const result = await db.query(`
                SELECT id, title, metadata
                FROM enhanced_courses
                WHERE course_type = 'leetcode_enhanced' OR metadata IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 10
            `);

            console.log(`Found ${result.rows.length} courses to enhance`);

            for (const course of result.rows) {
                try {
                    console.log(`🔄 Enhancing course: ${course.title}`);

                    const metadata = course.metadata;
                    if (!metadata || !metadata.modules) {
                        console.log(`⏭️ Skipping ${course.title} - no modules found`);
                        continue;
                    }

                    let enhanced = false;

                    // Enhance each module and lesson
                    for (const module of metadata.modules) {
                        if (!module.lessons || !module.lessons.lessons) continue;

                        for (const lesson of module.lessons.lessons) {
                            // Check if lesson needs enhancement
                            if (!lesson.problemData || !lesson.problemData.testCases ||
                                lesson.problemData.testCases.length < 5) {

                                console.log(`  📝 Enhancing lesson: ${lesson.title}`);

                                // Enhance the lesson
                                const enhancedProblem = await this.enhanceProblemWithAI(
                                    { title: lesson.title, difficulty: lesson.difficulty },
                                    lesson.pattern || 'general'
                                );

                                // Update lesson data
                                lesson.problemData = enhancedProblem;
                                lesson.description = enhancedProblem.problemStatement;

                                if (!lesson.languageImplementations) {
                                    lesson.languageImplementations = await this.generateCodeImplementations(enhancedProblem);
                                }

                                enhanced = true;

                                // Small delay between lessons
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }
                    }

                    // Save enhanced course back to database
                    if (enhanced) {
                        await db.query(`
                            UPDATE enhanced_courses
                            SET metadata = $1, updated_at = NOW()
                            WHERE id = $2
                        `, [JSON.stringify(metadata), course.id]);

                        console.log(`✅ Enhanced course: ${course.title}`);
                    }

                } catch (error) {
                    console.error(`❌ Error enhancing course ${course.title}:`, error.message);
                }
            }

            console.log('✅ Course enhancement completed');

        } catch (error) {
            console.error('❌ Error in enhanceExistingCourses:', error.message);
            throw error;
        }
    }

    /**
     * Validate and test course integrity
     */
    async validateCourses() {
        console.log('🔍 Validating course integrity...');

        try {
            const result = await db.query(`
                SELECT id, title, metadata, course_type
                FROM enhanced_courses
                WHERE course_type = 'leetcode_enhanced'
                ORDER BY created_at DESC
            `);

            console.log(`\n📊 Validation Report for ${result.rows.length} courses:\n`);

            for (const course of result.rows) {
                const metadata = course.metadata;
                let issues = [];
                let totalLessons = 0;
                let lessonsWithTests = 0;
                let lessonsWithCode = 0;

                if (!metadata) {
                    issues.push('Missing metadata');
                } else if (!metadata.modules) {
                    issues.push('No modules found');
                } else {
                    for (const module of metadata.modules) {
                        if (module.lessons && module.lessons.lessons) {
                            for (const lesson of module.lessons.lessons) {
                                totalLessons++;

                                if (lesson.problemData && lesson.problemData.testCases &&
                                    lesson.problemData.testCases.length >= 3) {
                                    lessonsWithTests++;
                                }

                                if (lesson.languageImplementations &&
                                    Object.keys(lesson.languageImplementations).length >= 2) {
                                    lessonsWithCode++;
                                }
                            }
                        }
                    }
                }

                const testCoverage = totalLessons > 0 ? (lessonsWithTests / totalLessons * 100).toFixed(1) : 0;
                const codeCoverage = totalLessons > 0 ? (lessonsWithCode / totalLessons * 100).toFixed(1) : 0;

                console.log(`📚 ${course.title}`);
                console.log(`   Modules: ${metadata?.modules?.length || 0}`);
                console.log(`   Lessons: ${totalLessons}`);
                console.log(`   Test Coverage: ${testCoverage}% (${lessonsWithTests}/${totalLessons})`);
                console.log(`   Code Coverage: ${codeCoverage}% (${lessonsWithCode}/${totalLessons})`);

                if (issues.length > 0) {
                    console.log(`   ⚠️ Issues: ${issues.join(', ')}`);
                }

                console.log('');
            }

        } catch (error) {
            console.error('❌ Error validating courses:', error.message);
        }
    }
}

// CLI Interface
async function main() {
    const generator = new EnhancedLeetCodeGenerator();

    const command = process.argv[2];

    try {
        switch (command) {
            case 'generate-examples':
                console.log('🚀 Starting enhanced LeetCode course generation...\n');
                const results = await generator.generateExampleCourses();
                console.log('\n✅ Generation Summary:');
                results.forEach(r => {
                    console.log(`  - ${r.title}: ${r.modulesCount} modules, ${r.lessonsCount} lessons`);
                });
                break;

            case 'enhance-existing':
                await generator.enhanceExistingCourses();
                break;

            case 'validate':
                await generator.validateCourses();
                break;

            case 'test-api':
                console.log('🧪 Testing LeetCode APIs...');
                const problems = await generator.fetchLeetCodeProblems(5, 'easy');
                console.log(`Found ${problems.length} problems:`, problems.map(p => p.title));
                break;

            case 'generate-custom':
                const customSpec = {
                    title: process.argv[3] || "Custom LeetCode Course",
                    description: `Custom course: ${process.argv[3] || "Custom LeetCode Course"}`,
                    difficulty: process.argv[4] || "beginner",
                    patterns: process.argv[5] ? process.argv[5].split(',') : ['arrays-hashing'],
                    problemsPerPattern: parseInt(process.argv[6]) || 3,
                    estimatedDuration: "5-10 hours"
                };
                console.log(`🚀 Generating custom course: ${customSpec.title}`);
                const customResult = await generator.generateLeetCodeCourse(customSpec);
                const customCourseId = await generator.saveCourseToDatabase(customResult);
                console.log(`✅ Custom course created with ID: ${customCourseId}`);
                break;

            default:
                console.log(`
🎯 Enhanced LeetCode Course Generator

Commands:
  generate-examples     Generate 3 comprehensive LeetCode courses with real problems
  enhance-existing      Enhance existing courses with better descriptions and test cases
  validate             Validate course integrity and coverage
  test-api             Test LeetCode API connectivity

Features:
  ✅ Real LeetCode problems from free APIs
  ✅ Comprehensive test cases and validation
  ✅ Multi-language support (JS, Python, Java)
  ✅ Industry-standard problem descriptions
  ✅ Pattern-based learning approach
  ✅ Progressive difficulty curves
  ✅ AI-enhanced problem analysis

Environment:
  CLAUDE_API_KEY=your_claude_api_key_here

Examples:
  node enhancedLeetCodeGenerator.js generate-examples
  node enhancedLeetCodeGenerator.js enhance-existing
  node enhancedLeetCodeGenerator.js validate
                `);
        }
    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = EnhancedLeetCodeGenerator;