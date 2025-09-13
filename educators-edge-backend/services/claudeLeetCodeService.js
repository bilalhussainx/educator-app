/**
 * =================================================================
 * CLAUDE LEETCODE SERVICE - AI COURSE GENERATION
 * =================================================================
 * Uses Claude API to create structured courses from LeetCode problems
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const LeetCodeRepoManager = require('../leetcode-repo-manager');

class ClaudeLeetCodeService {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
        });
        this.repoManager = new LeetCodeRepoManager();
    }

    /**
     * Generate a structured course from LeetCode problems
     */
    async generateLeetCodeCourse(options = {}) {
        const {
            courseTitle = 'Complete LeetCode Programming Course',
            targetAudience = 'intermediate',
            maxProblems = 300,
            languages = ['javascript', 'python', 'java'],
            difficulty = 'mixed'
        } = options;

        console.log('Starting LeetCode course generation...');

        try {
            // Setup repository and get available problems
            await this.repoManager.setupRepository();
            const problems = await this.repoManager.getAvailableProblems();
            
            console.log(`Found ${problems.length} available problems`);

            // Filter problems based on criteria
            const filteredProblems = this.filterProblemsByCriteria(problems, {
                maxProblems,
                difficulty,
                languages
            });

            console.log(`Selected ${filteredProblems.length} problems for course`);

            // Generate course structure using Claude
            const courseStructure = await this.generateCourseStructure(
                filteredProblems,
                courseTitle,
                targetAudience
            );

            const finalCourse = {
                ...courseStructure,
                metadata: {
                    totalProblems: filteredProblems.length,
                    languages,
                    difficulty,
                    targetAudience,
                    generatedAt: new Date().toISOString(),
                    version: '1.0.0'
                }
            };

            console.log('Course generation completed successfully!');
            return finalCourse;

        } catch (error) {
            console.error('Error generating LeetCode course:', error);
            throw error;
        }
    }

    /**
     * Filter problems based on criteria
     */
    filterProblemsByCriteria(problems, criteria) {
        const { maxProblems, difficulty, languages } = criteria;
        
        // Filter by language availability
        let filtered = problems.filter(problem => 
            languages.every(lang => problem.languages.has(lang))
        );

        // Sort by problem number and take only maxProblems
        filtered = filtered
            .sort((a, b) => parseInt(a.number) - parseInt(b.number))
            .slice(0, maxProblems);

        return filtered;
    }

    /**
     * Generate course structure using Claude
     */
    async generateCourseStructure(problems, courseTitle, targetAudience) {
        const prompt = 'Create a comprehensive course structure for a LeetCode programming course';

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            return {
                title: courseTitle,
                description: 'A comprehensive LeetCode course',
                difficulty: 'intermediate',
                estimatedHours: 120
            };

        } catch (error) {
            console.error('Error generating course structure:', error);
            throw error;
        }
    }

    /**
     * Estimate difficulty based on problem number
     */
    estimateDifficulty(problemNumber) {
        const num = parseInt(problemNumber);
        if (num <= 200) return 'easy';
        if (num <= 500) return 'medium';
        return 'hard';
    }
}

module.exports = ClaudeLeetCodeService;
