/**
 * =================================================================
 * FOLDER: services/
 * FILE:   claudeApiService.js
 * =================================================================
 * DESCRIPTION: Claude API integration for generating specialized courses
 * like Educative.io with comprehensive modules, lessons, and coding challenges
 */

const axios = require('axios');

class ClaudeApiService {
    constructor() {
        this.apiKey = process.env.CLAUDE_API_KEY;
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
        this.maxTokens = 4000;
        
        if (!this.apiKey) {
            console.warn('⚠️  CLAUDE_API_KEY not found in environment variables');
        }
    }

    async generateMessage(messages, systemPrompt = null) {
        if (!this.apiKey) {
            throw new Error('Claude API key not configured');
        }

        try {
            const payload = {
                model: 'claude-3-sonnet-20240229',
                max_tokens: this.maxTokens,
                messages: messages
            };

            if (systemPrompt) {
                payload.system = systemPrompt;
            }

            const response = await axios.post(this.baseUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000
            });

            return response.data.content[0].text;
        } catch (error) {
            console.error('❌ Claude API Error:', error.response?.data || error.message);
            throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async generateSpecializedCourse(courseConfig) {
        const systemPrompt = `You are an expert technical course creator specialized in generating high-quality programming courses similar to Educative.io, LeetCode, and other premium platforms.

Your task is to create comprehensive, hands-on programming courses with:
1. **Structured Learning Path**: Well-organized modules and lessons
2. **LeetCode-Style Problems**: Coding challenges with proper constraints and test cases
3. **Pattern-Based Learning**: Focus on algorithmic patterns and data structures
4. **Multi-Language Support**: Code examples in JavaScript, Python, and Java
5. **Progressive Difficulty**: From beginner to advanced levels
6. **Real-World Applications**: Practical examples and use cases

Generate ONLY valid JSON response with no additional text or formatting.`;

        const userPrompt = `Create a specialized programming course with the following requirements:

**Course Configuration:**
- Title: ${courseConfig.title}
- Language: ${courseConfig.language || 'javascript'}
- Difficulty: ${courseConfig.difficulty || 'intermediate'}
- Focus Areas: ${courseConfig.focusAreas?.join(', ') || 'algorithms, data-structures'}
- Course Type: ${courseConfig.courseType || 'coding-patterns'}
- Target Modules: ${courseConfig.moduleCount || 4}
- Lessons per Module: ${courseConfig.lessonsPerModule || 5}

**Requirements:**
1. Create ${courseConfig.moduleCount || 4} comprehensive modules
2. Each module should have ${courseConfig.lessonsPerModule || 5} lessons
3. Each lesson must include:
   - Engaging title and description
   - Specific algorithmic pattern (Sliding Window, Two Pointers, DFS/BFS, Dynamic Programming, etc.)
   - LeetCode-style problem with constraints
   - Starter code templates for all 3 languages
   - Comprehensive test cases
   - Optimal solution with explanations
   - Time/space complexity analysis

4. Course should follow Educative.io style with:
   - Interactive coding challenges
   - Pattern-based learning approach
   - Progressive difficulty curve
   - Real-world problem scenarios

**JSON Structure Required:**
{
  "title": "Course Title",
  "description": "Comprehensive course description",
  "language": "javascript",
  "difficulty_level": "intermediate",
  "estimated_duration": "40 hours",
  "prerequisites": ["Basic programming knowledge"],
  "learning_objectives": ["Objective 1", "Objective 2"],
  "metadata": {
    "modules": [
      {
        "title": "Module Title",
        "description": "Module description",
        "core_patterns": ["Pattern1", "Pattern2"],
        "estimated_time": "8 hours",
        "lessons": {
          "lessons": [
            {
              "title": "Lesson Title",
              "description": "Detailed lesson description with problem scenario",
              "difficulty": "easy|medium|hard",
              "estimated_time": "45min",
              "pattern": "Algorithmic Pattern",
              "problem_statement": "LeetCode-style problem description",
              "constraints": ["1 <= n <= 1000", "constraints list"],
              "examples": [
                {"input": "example input", "output": "expected output", "explanation": "why this output"}
              ],
              "starter_code": {
                "javascript": "function template",
                "python": "def template",
                "java": "class template"
              },
              "test_cases": {
                "javascript": "test code",
                "python": "test code", 
                "java": "test code"
              },
              "solution": {
                "javascript": "optimal solution",
                "python": "optimal solution",
                "java": "optimal solution"
              },
              "explanation": "Solution explanation with complexity analysis"
            }
          ]
        }
      }
    ]
  }
}

Generate a complete course following this exact structure.`;

        try {
            const response = await this.generateMessage([
                { role: 'user', content: userPrompt }
            ], systemPrompt);

            // Parse the JSON response
            let courseData;
            try {
                courseData = JSON.parse(response);
            } catch (parseError) {
                // Try to extract JSON from response if it's wrapped in text
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    courseData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Invalid JSON response from Claude API');
                }
            }

            // Validate the course structure
            this.validateCourseStructure(courseData);
            
            return courseData;
        } catch (error) {
            console.error('❌ Error generating specialized course:', error);
            throw error;
        }
    }

    async generateModuleContent(moduleConfig) {
        const systemPrompt = `You are an expert at creating detailed programming modules with hands-on coding challenges. Generate comprehensive module content with LeetCode-style problems and multi-language support.`;

        const userPrompt = `Create a detailed programming module with the following configuration:

**Module Configuration:**
- Title: ${moduleConfig.title}
- Core Patterns: ${moduleConfig.corePatterns?.join(', ')}
- Difficulty: ${moduleConfig.difficulty}
- Language: ${moduleConfig.language}
- Number of Lessons: ${moduleConfig.lessonCount || 5}

Generate ${moduleConfig.lessonCount || 5} lessons following the same JSON structure as the specialized course, but focus only on this specific module.

Ensure each lesson has:
1. Real-world problem scenarios
2. LeetCode-style constraints and examples
3. Starter code in JavaScript, Python, and Java
4. Comprehensive test cases
5. Optimal solutions with explanations
6. Progressive difficulty within the module

Return ONLY valid JSON with the module structure.`;

        try {
            const response = await this.generateMessage([
                { role: 'user', content: userPrompt }
            ], systemPrompt);

            return JSON.parse(response);
        } catch (error) {
            console.error('❌ Error generating module content:', error);
            throw error;
        }
    }

    async enhanceExistingCourse(courseId, enhancementType = 'add_lessons') {
        const systemPrompt = `You are an expert at enhancing existing programming courses with additional high-quality content.`;

        const userPrompt = `Enhance an existing course with ID: ${courseId}

Enhancement Type: ${enhancementType}

Generate additional content that maintains consistency with existing course structure while adding valuable new lessons and challenges.

Return the enhancement content in the same JSON format as the original course structure.`;

        try {
            const response = await this.generateMessage([
                { role: 'user', content: userPrompt }
            ], systemPrompt);

            return JSON.parse(response);
        } catch (error) {
            console.error('❌ Error enhancing course:', error);
            throw error;
        }
    }

    validateCourseStructure(courseData) {
        const required = ['title', 'description', 'metadata'];
        for (const field of required) {
            if (!courseData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!courseData.metadata.modules || !Array.isArray(courseData.metadata.modules)) {
            throw new Error('Course must have modules array');
        }

        for (const module of courseData.metadata.modules) {
            if (!module.title || !module.lessons?.lessons) {
                throw new Error('Each module must have title and lessons');
            }

            for (const lesson of module.lessons.lessons) {
                const requiredLessonFields = ['title', 'description', 'difficulty'];
                for (const field of requiredLessonFields) {
                    if (!lesson[field]) {
                        throw new Error(`Lesson missing required field: ${field}`);
                    }
                }
            }
        }
    }

    async generateCourseFromPrompt(prompt, options = {}) {
        const systemPrompt = `You are an expert technical educator creating premium programming courses. Generate comprehensive courses based on user prompts with proper structure, coding challenges, and multi-language support.`;

        const userPrompt = `User Request: "${prompt}"

Course Options:
- Difficulty: ${options.difficulty || 'auto-detect'}
- Languages: ${options.languages?.join(', ') || 'JavaScript, Python, Java'}
- Course Length: ${options.length || 'comprehensive'}
- Focus Areas: ${options.focusAreas?.join(', ') || 'auto-detect'}

Create a complete course that addresses this request. Include:
1. Proper course metadata and structure
2. Multiple modules with progressive difficulty
3. LeetCode-style coding challenges
4. Real-world applications and examples
5. Multi-language code examples
6. Comprehensive test cases and solutions

Return the complete course in the specified JSON format.`;

        try {
            const response = await this.generateMessage([
                { role: 'user', content: userPrompt }
            ], systemPrompt);

            const courseData = JSON.parse(response);
            this.validateCourseStructure(courseData);
            return courseData;
        } catch (error) {
            console.error('❌ Error generating course from prompt:', error);
            throw error;
        }
    }
}

module.exports = new ClaudeApiService();