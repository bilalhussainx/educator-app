/**
 * =================================================================
 * LEETCODE CONTROLLER - REAL SOLUTIONS INTEGRATION
 * =================================================================
 * Serves real LeetCode problems from GitHub repository with actual solutions
 */

const LeetCodeRepoManager = require('../leetcode-repo-manager');
const pool = require('../db');

class LeetCodeController {
    constructor() {
        this.repoManager = new LeetCodeRepoManager();
        this.problemsCache = null;
        this.cacheExpiry = null;
    }

    /**
     * Get all available LeetCode problems
     */
    async getAllProblems(req, res) {
        try {
            console.log('📋 Fetching all LeetCode problems...');
            
            const problems = await this.getCachedProblems();
            
            // Format for frontend
            const formattedProblems = problems.map(problem => ({
                id: problem.number,
                number: parseInt(problem.number),
                title: problem.title,
                difficulty: this.estimateDifficulty(problem.number),
                languages: Array.from(problem.languages.keys()),
                topic: this.categorizeProblem(problem.title)
            }));
            
            console.log(`✅ Returning ${formattedProblems.length} LeetCode problems`);
            res.json(formattedProblems);
        } catch (error) {
            console.error('❌ Error fetching problems:', error.message);
            res.status(500).json({ error: 'Failed to fetch LeetCode problems' });
        }
    }

    /**
     * Get specific LeetCode problem for IDE
     */
    async getProblemForIDE(req, res) {
        try {
            const { problemNumber } = req.params;
            const { language = 'javascript' } = req.query;
            
            console.log(`🔍 Fetching problem ${problemNumber} in ${language}...`);
            
            // Get solution from repository
            const solution = await this.repoManager.getSolutionCode(problemNumber, language);
            
            // Create starter code
            const starterCode = this.repoManager.createStarterCode(solution.code, language);
            
            // Get problem metadata from LeetCode API or our mapping
            const problemData = await this.getProblemMetadata(problemNumber, solution.title);
            
            // Format for AscentIDE
            const ideData = {
                lesson: {
                    id: `leetcode-${problemNumber}`,
                    title: `${problemNumber}. ${solution.title}`,
                    description: problemData.description,
                    instructions: problemData.instructions,
                    difficulty: problemData.difficulty,
                    language: language,
                    metadata: {
                        problemNumber,
                        isLeetCode: true,
                        originalTitle: solution.title,
                        topic: problemData.topic
                    }
                },
                files: [
                    {
                        id: '1',
                        filename: this.getFileName(language, solution.title),
                        content: starterCode,
                        type: 'main'
                    },
                    {
                        id: '2',
                        filename: this.getTestFileName(language),
                        content: this.generateTestTemplate(language, solution.title),
                        type: 'test'
                    }
                ],
                testCases: problemData.testCases || [],
                starterCode: starterCode,
                tests: this.generateTestTemplate(language, solution.title),
                solution: solution.code,
                hints: problemData.hints || [],
                submissionHistory: [],
                gradedSubmission: null,
                submissions: [],
                isCompleted: false,
                timeLimit: null,
                maxAttempts: null
            };
            
            console.log(`✅ Returning ${language} solution for problem ${problemNumber}`);
            res.json(ideData);
        } catch (error) {
            console.error(`❌ Error fetching problem ${req.params.problemNumber}:`, error.message);
            res.status(500).json({ error: 'Failed to fetch problem' });
        }
    }

    /**
     * Get solution for LeetCode problem
     */
    async getProblemSolution(req, res) {
        try {
            const { problemNumber } = req.params;
            const { language = 'javascript' } = req.query;
            
            console.log(`🔑 Fetching solution for problem ${problemNumber} in ${language}...`);
            
            const solution = await this.repoManager.getSolutionCode(problemNumber, language);
            
            const solutionFiles = [
                {
                    id: '1',
                    filename: this.getFileName(language, solution.title),
                    content: solution.code,
                    type: 'solution',
                    explanation: `# Solution for ${solution.title}\n\nThis is a real LeetCode solution from the NeetCode repository.\n\n## Approach\nThe solution uses efficient algorithms and data structures to solve the problem optimally.\n\n## Language: ${language.toUpperCase()}\n- Follows ${language} best practices\n- Optimized for performance\n- Clean, readable code structure`
                }
            ];
            
            console.log(`✅ Returning solution for problem ${problemNumber} in ${language}`);
            res.json({
                files: solutionFiles,
                explanation: solutionFiles[0].explanation
            });
        } catch (error) {
            console.error(`❌ Error fetching solution for ${req.params.problemNumber}:`, error.message);
            res.status(500).json({ error: 'Failed to fetch solution' });
        }
    }

    /**
     * Get cached problems with 1-hour cache
     */
    async getCachedProblems() {
        const now = Date.now();
        const cacheValidFor = 60 * 60 * 1000; // 1 hour
        
        if (!this.problemsCache || !this.cacheExpiry || now > this.cacheExpiry) {
            console.log('🔄 Refreshing problems cache...');
            await this.repoManager.setupRepository();
            this.problemsCache = await this.repoManager.getAvailableProblems();
            this.cacheExpiry = now + cacheValidFor;
        }
        
        return this.problemsCache;
    }

    /**
     * Get problem metadata (description, test cases, etc.)
     */
    async getProblemMetadata(problemNumber, title) {
        // This would ideally come from LeetCode API or a database
        // For now, we'll create reasonable defaults based on problem patterns
        
        const metadata = {
            description: this.generateProblemDescription(problemNumber, title),
            instructions: `Solve the "${title}" problem using efficient algorithms.`,
            difficulty: this.estimateDifficulty(problemNumber),
            topic: this.categorizeProblem(title),
            testCases: this.generateTestCases(problemNumber, title),
            hints: this.generateHints(title)
        };
        
        return metadata;
    }

    /**
     * Generate problem description
     */
    generateProblemDescription(problemNumber, title) {
        return `# ${problemNumber}. ${title}

This is a real LeetCode problem from the NeetCode solutions repository.

## Problem Statement
Solve the "${title}" algorithmic challenge using optimal approaches.

## Input/Output
- Study the solution code to understand the expected input and output format
- Test your implementation with various edge cases
- Optimize for time and space complexity

## Approach
1. Analyze the problem requirements
2. Choose appropriate data structures
3. Implement an efficient algorithm
4. Test with edge cases`;
    }

    /**
     * Estimate difficulty based on problem number and patterns
     */
    estimateDifficulty(problemNumber) {
        const num = parseInt(problemNumber);
        
        // Simple heuristic based on problem number ranges
        if (num <= 100) return 'easy';
        if (num <= 300) return 'medium';
        if (num <= 600) return 'easy';
        if (num <= 1000) return 'medium';
        if (num <= 1500) return 'hard';
        return 'medium';
    }

    /**
     * Categorize problem by title keywords
     */
    categorizeProblem(title) {
        const lower = title.toLowerCase();
        
        if (lower.includes('tree') || lower.includes('binary')) return 'Trees';
        if (lower.includes('array') || lower.includes('sort')) return 'Arrays';
        if (lower.includes('string')) return 'Strings';
        if (lower.includes('linked') || lower.includes('list')) return 'Linked Lists';
        if (lower.includes('graph') || lower.includes('node')) return 'Graphs';
        if (lower.includes('dynamic') || lower.includes('dp')) return 'Dynamic Programming';
        if (lower.includes('two') || lower.includes('sum')) return 'Hash Table';
        
        return 'Algorithms';
    }

    /**
     * Generate test cases based on problem
     */
    generateTestCases(problemNumber, title) {
        // Basic test cases - would be enhanced with real LeetCode test data
        return [
            {
                id: 1,
                input: 'See problem description',
                expected: 'See solution code',
                description: 'Basic test case'
            },
            {
                id: 2,
                input: 'Edge case input',
                expected: 'Expected output',
                description: 'Edge case test'
            }
        ];
    }

    /**
     * Generate hints based on problem title
     */
    generateHints(title) {
        const lower = title.toLowerCase();
        const hints = [];
        
        if (lower.includes('two sum')) {
            hints.push('Use a hash map to store numbers you\'ve seen');
            hints.push('Look for the complement: target - current number');
        } else if (lower.includes('tree')) {
            hints.push('Consider recursive tree traversal');
            hints.push('Think about DFS or BFS approaches');
        } else if (lower.includes('array')) {
            hints.push('Consider sorting the array first');
            hints.push('Look for patterns with two pointers');
        } else {
            hints.push('Break down the problem into smaller subproblems');
            hints.push('Consider the time and space complexity trade-offs');
        }
        
        return hints;
    }

    /**
     * Get appropriate filename for language
     */
    getFileName(language, title) {
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        switch (language) {
            case 'javascript': return `${cleanTitle}.js`;
            case 'python': return `${cleanTitle}.py`;
            case 'java': return 'Solution.java';
            default: return `${cleanTitle}.txt`;
        }
    }

    /**
     * Get test filename for language
     */
    getTestFileName(language) {
        switch (language) {
            case 'javascript': return 'test.js';
            case 'python': return 'test.py';
            case 'java': return 'SolutionTest.java';
            default: return 'test.txt';
        }
    }

    /**
     * Generate test template
     */
    generateTestTemplate(language, title) {
        switch (language) {
            case 'javascript':
                return `// Test cases for ${title}
console.log('Running tests for ${title}...');

// TODO: Add your test cases here
// Example:
// console.log(yourSolution(input)); // Expected: output

console.log('Tests completed!');`;
            
            case 'python':
                return `# Test cases for ${title}
print(f"Running tests for ${title}...")

# TODO: Add your test cases here
# Example:
# print(your_solution(input))  # Expected: output

print("Tests completed!")`;
            
            case 'java':
                return `// Test cases for ${title}
public class SolutionTest {
    public static void main(String[] args) {
        System.out.println("Running tests for ${title}...");
        
        // TODO: Add your test cases here
        // Example:
        // System.out.println(solution.method(input)); // Expected: output
        
        System.out.println("Tests completed!");
    }
}`;
            
            default:
                return `// Test cases for ${title}`;
        }
    }

    /**
     * Get repository statistics
     */
    async getStatistics(req, res) {
        try {
            const stats = await this.repoManager.getStatistics();
            res.json(stats);
        } catch (error) {
            console.error('❌ Error getting statistics:', error.message);
            res.status(500).json({ error: 'Failed to get statistics' });
        }
    }
}

module.exports = new LeetCodeController();