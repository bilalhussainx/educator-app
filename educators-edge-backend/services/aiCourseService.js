// FILE: services/aiCourseService.js
// Advanced AI Course Generation Service with Rate Limiting and Error Handling

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

// --- ANTHROPIC CLAUDE SETUP ---
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- CONFIGURATION ---
const CONFIG = {
    MAX_RETRIES: 5,
    BASE_DELAY: 2000, // 2 seconds
    MAX_DELAY: 30000, // 30 seconds
    RATE_LIMIT_DELAY: 60000, // 1 minute for rate limit errors
    REQUESTS_PER_MINUTE: 50, // Claude has higher rate limits than Gemini
    CONCURRENT_REQUESTS: 3,
    LOG_FILE: path.join(__dirname, '..', 'logs', 'ai-course-generation.log')
};

// --- RATE LIMITING & QUEUE MANAGEMENT ---
class RateLimiter {
    constructor(requestsPerMinute = CONFIG.REQUESTS_PER_MINUTE) {
        this.requests = [];
        this.limit = requestsPerMinute;
        this.queue = [];
        this.processing = false;
    }

    async makeRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            await this.waitIfNeeded();
            const { requestFn, resolve, reject } = this.queue.shift();
            
            try {
                const result = await requestFn();
                this.recordRequest();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.processing = false;
    }

    async waitIfNeeded() {
        this.cleanOldRequests();
        if (this.requests.length >= this.limit) {
            const oldestRequest = this.requests[0];
            const waitTime = 60000 - (Date.now() - oldestRequest);
            if (waitTime > 0) {
                await this.sleep(waitTime);
            }
        }
    }

    cleanOldRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 60000);
    }

    recordRequest() {
        this.requests.push(Date.now());
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// --- LOGGING SYSTEM ---
class Logger {
    static async log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(data && { data })
        };

        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
        
        try {
            await fs.mkdir(path.dirname(CONFIG.LOG_FILE), { recursive: true });
            await fs.appendFile(CONFIG.LOG_FILE, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    static async info(message, data = null) {
        await this.log('info', message, data);
    }

    static async warn(message, data = null) {
        await this.log('warn', message, data);
    }

    static async error(message, data = null) {
        await this.log('error', message, data);
    }

    static async debug(message, data = null) {
        await this.log('debug', message, data);
    }
}

// --- ERROR HANDLING ---
class AIServiceError extends Error {
    constructor(message, type = 'UNKNOWN', retryable = false, details = null) {
        super(message);
        this.name = 'AIServiceError';
        this.type = type;
        this.retryable = retryable;
        this.details = details;
    }
}

// --- UTILITY FUNCTIONS ---
function sanitizeJsonString(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        throw new Error("Invalid input for JSON sanitization");
    }

    let sanitized = jsonString.trim();
    
    // Remove any surrounding markdown or code block markers
    sanitized = sanitized.replace(/^```(?:json|javascript)?\s*/, '');
    sanitized = sanitized.replace(/\s*```$/, '');
    
    // Fix common JSON formatting issues
    // 1. Replace single quotes around property names with double quotes
    sanitized = sanitized.replace(/([{,]\s*)(['"]?)([a-zA-Z_$][a-zA-Z0-9_$]*)\2\s*:/g, '$1"$3":');
    
    // 2. Handle string values with proper escaping
    // First, fix unescaped quotes inside strings
    sanitized = sanitized.replace(/"([^"]*)"([^"]*)"([^"]*?)"/g, (match, p1, p2, p3) => {
        if (p2.includes('"')) {
            return `"${p1}${p2.replace(/"/g, '\\"')}${p3}"`;
        }
        return match;
    });
    
    // 3. Replace single quotes around values with double quotes (but be careful)
    // Use a more sophisticated approach to avoid breaking already-correct JSON
    sanitized = sanitized.replace(/:(\s*)'([^']*?)'/g, ': "$2"');
    
    // 4. Fix backtick strings
    sanitized = sanitized.replace(/`([^`]*?)`/g, '"$1"');
    
    // 5. Remove trailing commas before closing brackets/braces
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
    
    // 6. Fix multiline strings by escaping newlines
    sanitized = sanitized.replace(/"([^"]*?)"/g, (match, content) => {
        const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return `"${escaped}"`;
    });
    
    // 7. Try to balance quotes if they're unbalanced
    const quoteMatches = sanitized.match(/"/g);
    if (quoteMatches && quoteMatches.length % 2 !== 0) {
        // Find unterminated strings and try to fix them
        let inString = false;
        let escaped = false;
        let result = '';
        
        for (let i = 0; i < sanitized.length; i++) {
            const char = sanitized[i];
            
            if (char === '"' && !escaped) {
                inString = !inString;
            } else if (char === '\\' && inString) {
                escaped = !escaped;
                result += char;
                continue;
            }
            
            escaped = false;
            result += char;
        }
        
        // If we end in a string, close it
        if (inString) {
            result += '"';
        }
        
        sanitized = result;
    }
    
    // 8. Handle common array formatting issues
    sanitized = sanitized.replace(/\[\s*,/g, '[');
    sanitized = sanitized.replace(/,\s*,/g, ',');
    
    // 9. Clean up extra whitespace around structural elements
    sanitized = sanitized.replace(/\s*:\s*/g, ':');
    sanitized = sanitized.replace(/\s*,\s*/g, ',');
    
    return sanitized;
}

// Helper function to balance JSON brackets and braces
function balanceJsonBrackets(jsonString) {
    let bracketCount = 0;
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        
        if (char === '"' && !escaped) {
            inString = !inString;
        } else if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
        }
        
        escaped = (char === '\\' && !escaped);
    }
    
    // Add missing closing brackets/braces
    let result = jsonString;
    while (braceCount > 0) {
        result += '}';
        braceCount--;
    }
    while (bracketCount > 0) {
        result += ']';
        bracketCount--;
    }
    
    return result;
}

// Aggressive JSON cleaning for malformed responses
function aggressiveJsonClean(jsonString) {
    let cleaned = jsonString.trim();
    
    // Remove common prefixes/suffixes that aren't JSON
    cleaned = cleaned.replace(/^[^{[]*/, ''); // Remove everything before first { or [
    cleaned = cleaned.replace(/[^\]}]*$/, ''); // Remove everything after last } or ]
    
    // Fix common issues
    // Remove comments (// and /* */)
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Fix unescaped control characters
    cleaned = cleaned.replace(/[\x00-\x1F]/g, '');
    
    // Fix trailing commas more aggressively
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    cleaned = cleaned.replace(/,(\s*$)/gm, '');
    
    // Fix missing quotes around property names
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Try to fix incomplete strings at the end
    const lastQuote = cleaned.lastIndexOf('"');
    if (lastQuote !== -1) {
        const afterLastQuote = cleaned.substring(lastQuote + 1);
        if (!afterLastQuote.match(/^\s*[,:}\]]/)) {
            // Looks like an unterminated string
            const nextStructChar = afterLastQuote.search(/[{}\[\],]/);
            if (nextStructChar !== -1) {
                cleaned = cleaned.substring(0, lastQuote + 1 + nextStructChar) + '"' + 
                          cleaned.substring(lastQuote + 1 + nextStructChar);
            } else {
                cleaned += '"';
            }
        }
    }
    
    return cleaned;
}

function sanitizeAndParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new AIServiceError("AI response is null, undefined, or not a string", 'INVALID_RESPONSE', false);
    }

    console.log("Raw AI response length:", rawText.length);
    console.log("Raw AI response preview:", rawText.substring(0, 500) + '...');

    // Enhanced JSON extraction with multiple patterns
    const patterns = [
        /```json\s*([\s\S]*?)\s*```/i,  // JSON code blocks
        /```javascript\s*([\s\S]*?)\s*```/i,  // JavaScript code blocks containing JSON
        /```\s*(\{[\s\S]*?\})\s*```/i,  // JSON in generic code blocks
        /```\s*(\[[\s\S]*?\])\s*```/i,  // JSON arrays in generic code blocks
        /(\{[\s\S]*\})/,                // JSON objects (greedy)
        /(\[[\s\S]*\])/                 // JSON arrays (greedy)
    ];

    let extractedJson = null;
    let patternUsed = null;
    
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = rawText.match(pattern);
        if (match && match[1]) {
            extractedJson = match[1].trim();
            patternUsed = i;
            console.log(`JSON extracted using pattern ${i}:`, extractedJson.substring(0, 200) + '...');
            break;
        }
    }

    if (extractedJson) {
        // Try progressive parsing approaches
        const parseAttempts = [
            () => JSON.parse(extractedJson),
            () => {
                console.log("Attempting sanitization...");
                const sanitized = sanitizeJsonString(extractedJson);
                console.log("Sanitized JSON preview:", sanitized.substring(0, 200) + '...');
                return JSON.parse(sanitized);
            },
            () => {
                console.log("Attempting bracket balancing...");
                const balanced = balanceJsonBrackets(extractedJson);
                return JSON.parse(balanced);
            },
            () => {
                console.log("Attempting aggressive cleaning...");
                const cleaned = aggressiveJsonClean(extractedJson);
                return JSON.parse(cleaned);
            }
        ];

        for (let i = 0; i < parseAttempts.length; i++) {
            try {
                const result = parseAttempts[i]();
                console.log(`JSON parsing succeeded on attempt ${i + 1}`);
                return result;
            } catch (e) {
                console.warn(`Parse attempt ${i + 1} failed:`, e.message);
                if (i === parseAttempts.length - 1) {
                    // Last attempt failed, log detailed error
                    console.error("All parsing attempts failed for JSON:", {
                        originalLength: rawText.length,
                        extractedLength: extractedJson.length,
                        patternUsed,
                        lastError: e.message,
                        errorPosition: e.message.match(/position (\d+)/)?.[1],
                        jsonPreview: extractedJson.substring(0, 500)
                    });
                    
                    // Try to provide helpful error context
                    const errorPos = parseInt(e.message.match(/position (\d+)/)?.[1]) || 0;
                    if (errorPos > 0) {
                        const contextStart = Math.max(0, errorPos - 100);
                        const contextEnd = Math.min(extractedJson.length, errorPos + 100);
                        const context = extractedJson.substring(contextStart, contextEnd);
                        console.error("Error context:", context);
                    }
                    
                    throw new AIServiceError(
                        `AI response contained malformed JSON after all sanitization attempts: ${e.message}`,
                        'MALFORMED_JSON',
                        false,
                        { originalError: e.message, extractedJson: extractedJson.substring(0, 1000) }
                    );
                }
            }
        }
    }

    // Check if the response looks like it might contain JSON but wasn't matched
    if (rawText.includes('{') && rawText.includes('}')) {
        console.log("Attempting aggressive JSON extraction...");
        // Try to find JSON more aggressively
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            try {
                const potentialJson = rawText.substring(jsonStart, jsonEnd);
                console.log("Aggressive extraction:", potentialJson.substring(0, 200) + '...');
                return JSON.parse(potentialJson);
            } catch (e) {
                // Fall through to error below
            }
        }
    }

    // Final fallback: if we can't extract JSON, create a minimal valid structure
    console.warn("No valid JSON found, using fallback structure");
    console.debug("Raw AI response for debugging:", { rawResponse: rawText.substring(0, 1000) + '...' });
    
    // Return a minimal but valid structure so the system doesn't completely fail
    return {
        recommended_courses: [{
            theme: "AI-Generated Course",
            title: "Programming Fundamentals",
            description: "A basic programming course generated when AI response parsing failed.",
            difficulty_level: "beginner",
            estimated_duration: "4 weeks",
            target_lessons: [],
            learning_outcomes: ["Basic programming concepts"],
            prerequisites: ["None"],
            course_structure: {
                modules: [{
                    module_title: "Introduction",
                    lessons: []
                }]
            }
        }],
        analysis_summary: "Fallback course created due to AI response parsing failure"
    };
}

function calculateBackoffDelay(attempt, baseDelay = CONFIG.BASE_DELAY) {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), CONFIG.MAX_DELAY);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return exponentialDelay + jitter;
}

function isRateLimitError(error) {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('quota') || 
           message.includes('429') ||
           message.includes('too many requests');
}

function isRetryableError(error) {
    const retryableTypes = ['RATE_LIMIT', 'NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableTypes.includes(error.type) || 
           error.message.includes('503') || 
           error.message.includes('502') ||
           error.message.includes('timeout');
}

// --- MAIN AI SERVICE CLASS ---
class AIService {
    constructor() {
        this.rateLimiter = new RateLimiter();
        this.activeRequests = new Set();
    }

    async generateWithRetries(prompt, description, options = {}) {
        const {
            maxRetries = CONFIG.MAX_RETRIES,
            timeout = 30000,
            temperature = 0.7
        } = options;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await Logger.info(`Starting AI request attempt ${attempt}/${maxRetries}`, { description });

                const result = await this.rateLimiter.makeRequest(async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);

                    try {
                        const response = await anthropic.messages.create({
                            model: "claude-3-haiku-20240307",
                            max_tokens: 4096,
                            temperature,
                            messages: [
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ]
                        });

                        clearTimeout(timeoutId);

                        if (!response || !response.content || !response.content[0]) {
                            throw new AIServiceError("Empty response from AI", 'EMPTY_RESPONSE', true);
                        }

                        const responseText = response.content[0].text;
                        if (!responseText || responseText.trim() === '') {
                            throw new AIServiceError("AI returned empty text", 'EMPTY_TEXT', true);
                        }

                        await Logger.info(`AI request successful on attempt ${attempt}`, { 
                            description, 
                            responseLength: responseText.length 
                        });

                        return sanitizeAndParseJson(responseText);

                    } catch (error) {
                        clearTimeout(timeoutId);
                        throw error;
                    }
                });

                return result;

            } catch (error) {
                const isRetryable = isRetryableError(error);
                const isRateLimit = isRateLimitError(error);

                await Logger.warn(`AI request failed on attempt ${attempt}/${maxRetries}`, {
                    description,
                    error: error.message,
                    type: error.type || 'UNKNOWN',
                    retryable: isRetryable
                });

                if (attempt === maxRetries) {
                    await Logger.error(`All ${maxRetries} attempts failed for AI request`, { 
                        description, 
                        finalError: error.message 
                    });
                    throw new AIServiceError(
                        `AI request failed after ${maxRetries} attempts: ${error.message}`,
                        'MAX_RETRIES_EXCEEDED',
                        false,
                        { originalError: error, attempts: maxRetries }
                    );
                }

                if (!isRetryable && !isRateLimit) {
                    await Logger.error("Non-retryable error encountered", { 
                        description, 
                        error: error.message 
                    });
                    throw error;
                }

                // Calculate delay for next attempt
                const delay = isRateLimit ? CONFIG.RATE_LIMIT_DELAY : calculateBackoffDelay(attempt);
                await Logger.info(`Waiting ${delay}ms before retry ${attempt + 1}`, { description });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // --- SPECIALIZED COURSE GENERATION METHODS ---
    
    async analyzeFreeCodeCampLessons(lessons) {
        const prompt = `
You are an expert Computer Science curriculum designer with 15+ years of experience creating engaging coding bootcamps and university programs.

Analyze these FreeCodeCamp lessons and extract key learning patterns that would make for excellent standalone courses:

${JSON.stringify(lessons.map(l => ({
    id: l.id,
    title: l.title,
    description: l.description,
    language: l.language,
    chapter: l.chapter,
    sub_chapter: l.sub_chapter,
    solution_files: l.solution_files
})))}

Your task:
1. Identify 3-5 course themes that naturally emerge from these lessons
2. For each theme, suggest 6-8 lessons that would create a progressive learning path
3. Analyze the solution patterns to understand the complexity progression
4. Recommend difficulty levels and prerequisites

Respond with a JSON object containing:
{
    "analysis_summary": "Brief overview of the lesson patterns you found",
    "recommended_courses": [
        {
            "theme": "Course theme name",
            "description": "What students will learn in this course",
            "difficulty_level": "beginner|intermediate|advanced",
            "estimated_hours": number,
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "learning_objectives": ["objective1", "objective2"],
            "suggested_lessons": ["lesson_id1", "lesson_id2", ...],
            "unique_selling_points": ["What makes this course special"]
        }
    ],
    "solution_patterns": {
        "common_algorithms": ["pattern1", "pattern2"],
        "code_complexity_levels": ["beginner_patterns", "advanced_patterns"],
        "teaching_opportunities": ["specific teaching moments identified"]
    }
}
        `;

        return await this.generateWithRetries(prompt, "FreeCodeCamp Lessons Analysis");
    }

    async generateCourseFromSolutions(courseConcept, selectedLessons) {
        const prompt = `
You are an elite coding instructor creating a premium course similar to "Grokking the Coding Interview" or "AlgoExpert". 

Create a comprehensive course based on this concept: "${courseConcept.theme}"

Use these FreeCodeCamp lessons as inspiration, but create ORIGINAL, ENHANCED versions:
${JSON.stringify(selectedLessons.map(l => ({
    title: l.title,
    description: l.description,
    solution_code: l.solution_files,
    key_concepts: l.sub_chapter
})))}

Requirements:
1. Create 8-12 progressive lessons that build upon each other
2. Each lesson should have original problems inspired by but NOT copying the FreeCodeCamp content
3. Include multiple difficulty variations for each concept
4. Add real-world applications and interview-style questions
5. Create engaging narratives and practical examples

Respond with:
{
    "course": {
        "title": "Original, engaging course title",
        "description": "Comprehensive course description (200-300 words)",
        "difficulty_level": "beginner|intermediate|advanced",
        "estimated_duration": "X weeks",
        "prerequisites": ["prerequisite1", "prerequisite2"],
        "learning_outcomes": ["outcome1", "outcome2", "outcome3"],
        "target_audience": "Who this course is for",
        "unique_value_proposition": "Why this course is special"
    },
    "curriculum": [
        {
            "lesson_number": 1,
            "title": "Lesson title",
            "description": "What students will learn",
            "objectives": ["objective1", "objective2"],
            "concepts": ["concept1", "concept2"],
            "problems": [
                {
                    "title": "Problem title",
                    "difficulty": "easy|medium|hard",
                    "description": "Problem statement (be specific and engaging)",
                    "hints": ["hint1", "hint2"],
                    "real_world_application": "Where this is used in practice",
                    "interview_relevance": "Why this matters for coding interviews"
                }
            ],
            "key_insights": ["insight1", "insight2"]
        }
    ],
    "assessment_strategy": {
        "progress_tracking": "How progress is measured",
        "final_project": "Capstone project description",
        "certification_criteria": "What students need to complete"
    }
}
        `;

        return await this.generateWithRetries(prompt, `Course Generation: ${courseConcept.theme}`);
    }

    async createLessonContent(lessonPlan, previousLessons = []) {
        const prompt = `
You are a master coding instructor creating detailed lesson content for a premium programming course.

Create comprehensive content for this lesson:
${JSON.stringify(lessonPlan)}

Context from previous lessons: ${JSON.stringify(previousLessons.map(l => l.title))}

Generate:
1. Detailed problem statements with engaging storylines
2. Progressive difficulty levels (starter, main challenge, expert bonus)
3. Boilerplate code with helpful comments
4. Comprehensive test cases
5. Step-by-step solution approaches
6. Code explanations and learning insights
7. Common mistakes and how to avoid them

Respond with:
{
    "lesson_content": {
        "introduction": "Engaging lesson introduction with context",
        "main_concepts": ["concept1", "concept2"],
        "problems": [
            {
                "title": "Problem title",
                "difficulty": "starter|main|expert",
                "story": "Engaging problem narrative",
                "problem_statement": "Clear, detailed problem description",
                "examples": [
                    {
                        "input": "example input",
                        "output": "expected output",
                        "explanation": "why this output"
                    }
                ],
                "constraints": ["constraint1", "constraint2"],
                "boilerplate_code": {
                    "javascript": "// Boilerplate with helpful comments",
                    "python": "# Boilerplate with helpful comments"
                },
                "test_cases": [
                    {
                        "input": "test input",
                        "expected_output": "expected result",
                        "description": "what this tests"
                    }
                ],
                "solution_approach": {
                    "strategy": "High-level approach",
                    "steps": ["step1", "step2", "step3"],
                    "time_complexity": "O notation with explanation",
                    "space_complexity": "O notation with explanation"
                },
                "solution_code": {
                    "javascript": "// Complete solution with comments",
                    "python": "# Complete solution with comments"
                },
                "learning_insights": ["insight1", "insight2"],
                "common_mistakes": ["mistake1", "mistake2"],
                "variations": ["How to modify for different scenarios"]
            }
        ],
        "summary": "Key takeaways from this lesson",
        "next_steps": "How this connects to the next lesson"
    }
}
        `;

        return await this.generateWithRetries(prompt, `Lesson Content: ${lessonPlan.title}`);
    }

    async generatePopularCourseClone(courseReference) {
        const prompt = `
You are an expert course creator tasked with creating an original course inspired by popular coding education platforms.

Create a comprehensive course inspired by this concept: "${courseReference}"

Research indicates these types of courses typically include:
- System design fundamentals
- Data structures and algorithms
- Problem-solving patterns
- Interview preparation
- Real-world applications

Create an ORIGINAL course that captures the essence and quality of top-tier coding education:

{
    "course_overview": {
        "title": "Original course title (not copying existing names)",
        "tagline": "Catchy one-liner",
        "description": "Compelling 300-word course description",
        "target_audience": "Who this is for",
        "difficulty_progression": "How difficulty scales",
        "unique_features": ["What makes this special"],
        "estimated_time": "Complete course duration",
        "career_outcomes": ["What jobs this prepares for"]
    },
    "curriculum_structure": {
        "modules": [
            {
                "module_name": "Module title",
                "description": "What this module covers",
                "duration": "Time estimate",
                "lessons": [
                    {
                        "title": "Lesson title",
                        "concepts": ["concept1", "concept2"],
                        "practice_problems": number,
                        "difficulty_range": "easy to hard"
                    }
                ],
                "module_project": "Hands-on project description"
            }
        ]
    },
    "teaching_methodology": {
        "learning_approach": "How concepts are taught",
        "practice_structure": "How students practice",
        "assessment_methods": ["how progress is measured"],
        "support_system": "How students get help"
    },
    "sample_problems": [
        {
            "category": "Problem category",
            "title": "Specific problem title",
            "difficulty": "easy|medium|hard",
            "description": "Detailed problem statement",
            "learning_value": "Why this problem is included",
            "real_world_relevance": "Where this applies"
        }
    ]
}
        `;

        return await this.generateWithRetries(prompt, `Popular Course Clone: ${courseReference}`);
    }
}

// --- EXPORT ---
module.exports = {
    AIService,
    Logger,
    AIServiceError,
    CONFIG
};