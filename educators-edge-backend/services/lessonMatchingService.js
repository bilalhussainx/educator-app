const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Intelligent lesson matching service using Gemini AI
 * Analyzes lesson descriptions and matches them with appropriate freeCodeCamp content
 */
class LessonMatchingService {
    
    /**
     * Find the best matching freeCodeCamp lesson for an active lesson
     * @param {Object} activeLesson - The active lesson from lessons table
     * @returns {Object} - Best matching ingested lesson with complete content
     */
    async findBestMatch(activeLesson) {
        try {
            // Get all potential matches from ingested_lessons
            const candidateQuery = `
                SELECT id, title, description, lesson_name, section_name, files, solution_files
                FROM ingested_lessons 
                WHERE files IS NOT NULL 
                AND jsonb_array_length(files) > 0
                AND (
                    files @> '[{"language": "html"}]'::jsonb 
                    OR files @> '[{"language": "js"}]'::jsonb
                    OR files @> '[{"language": "css"}]'::jsonb
                )
                ORDER BY 
                    -- Prioritize lessons with HTML content
                    CASE WHEN files @> '[{"language": "html"}]'::jsonb THEN 0 ELSE 1 END,
                    -- Prioritize lessons with solutions
                    CASE WHEN solution_files IS NOT NULL AND jsonb_array_length(solution_files) > 0 THEN 0 ELSE 1 END,
                    -- Prioritize complete web lessons (HTML + CSS + JS)
                    CASE WHEN files @> '[{"language": "html"}]'::jsonb 
                              AND files @> '[{"language": "css"}]'::jsonb 
                              AND files @> '[{"language": "js"}]'::jsonb THEN 0 ELSE 1 END
                LIMIT 50
            `;
            
            const candidates = await db.query(candidateQuery);
            
            if (candidates.rows.length === 0) {
                throw new Error('No candidate lessons found');
            }
            
            // Use Gemini AI to analyze and match
            const bestMatch = await this.analyzeWithGemini(activeLesson, candidates.rows);
            return bestMatch;
            
        } catch (error) {
            console.error('Error in findBestMatch:', error);
            throw error;
        }
    }
    
    /**
     * Use Gemini AI to analyze lesson descriptions and find the best match
     */
    async analyzeWithGemini(activeLesson, candidates) {
        try {
            const prompt = `
You are an expert curriculum analyzer. I need you to find the best matching freeCodeCamp lesson for a given active lesson.

ACTIVE LESSON TO MATCH:
Title: "${activeLesson.title}"
Description: "${activeLesson.description}"
Type: "${activeLesson.lesson_type || 'N/A'}"

CANDIDATE LESSONS FROM FREECODECAMP:
${candidates.map((candidate, index) => `
${index + 1}. ID: ${candidate.id}
   Title: ${candidate.title}
   Lesson Name: ${candidate.lesson_name || 'N/A'}
   Section: ${candidate.section_name || 'N/A'}
   Description: ${candidate.description.substring(0, 200)}...
   File Types: ${candidate.files.map(f => f.language).join(', ')}
   Has Solutions: ${candidate.solution_files && candidate.solution_files.length > 0 ? 'Yes' : 'No'}
   Content Quality: ${this.assessContentQuality(candidate)}
`).join('')}

ANALYSIS CRITERIA:
1. Match the learning objective and topic (most important)
2. Prefer lessons with complete HTML + CSS + JS content
3. Prefer lessons that have solution files
4. Prefer lessons with substantial content (not just empty placeholders)
5. Consider the lesson progression (Step 1 should be beginner-friendly)

Please analyze the active lesson and return ONLY the ID of the best matching candidate lesson. 
Consider what would make the most sense for a student learning web development.

Return format: Just the ID, nothing else.
Example: 35a71e06-5d73-4529-911e-0e8159d4ee89
`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const selectedId = response.text().trim();
            
            // Find the selected candidate
            const bestMatch = candidates.find(candidate => candidate.id === selectedId);
            
            if (!bestMatch) {
                console.warn('Gemini selected invalid ID, falling back to best available option');
                // Fallback to the first candidate with complete content and solutions
                return candidates.find(c => 
                    c.files.some(f => f.language === 'html') &&
                    c.files.some(f => f.language === 'css') &&
                    c.files.some(f => f.language === 'js') &&
                    c.solution_files && c.solution_files.length > 0
                ) || candidates[0];
            }
            
            console.log(`Gemini selected: ${bestMatch.title} - ${bestMatch.lesson_name}`);
            return bestMatch;
            
        } catch (error) {
            console.error('Error in Gemini analysis:', error);
            // Fallback to first complete lesson
            return candidates.find(c => 
                c.files.some(f => f.language === 'html') &&
                c.files.some(f => f.language === 'css') &&
                c.solution_files && c.solution_files.length > 0
            ) || candidates[0];
        }
    }
    
    /**
     * Assess the content quality of a candidate lesson
     */
    assessContentQuality(candidate) {
        let score = 0;
        let details = [];
        
        // Check file completeness
        const hasHtml = candidate.files.some(f => f.language === 'html');
        const hasCss = candidate.files.some(f => f.language === 'css');
        const hasJs = candidate.files.some(f => f.language === 'js');
        
        if (hasHtml && hasCss && hasJs) {
            score += 30;
            details.push('Complete web files');
        }
        
        // Check content length (substantial vs placeholder)
        const totalContentLength = candidate.files.reduce((sum, file) => sum + file.code.length, 0);
        if (totalContentLength > 1000) {
            score += 20;
            details.push('Substantial content');
        }
        
        // Check for solutions
        if (candidate.solution_files && candidate.solution_files.length > 0) {
            score += 25;
            details.push('Has solutions');
        }
        
        // Check for non-empty content (not just editable regions)
        const hasActualContent = candidate.files.some(file => 
            file.code.length > 100 && 
            !file.code.includes('--fcc-editable-region--\n\n--fcc-editable-region--')
        );
        
        if (hasActualContent) {
            score += 15;
            details.push('Real content');
        }
        
        return `${score}/90 (${details.join(', ')})`;
    }
    
    /**
     * Generate proper boilerplate files from matched lesson
     */
    generateBoilerplateFiles(matchedLesson, activeLesson) {
        const files = [];
        
        // Process HTML file
        const htmlFile = matchedLesson.files.find(f => f.language === 'html');
        if (htmlFile) {
            files.push({
                id: 'fcc-html',
                filename: 'index.html',
                content: htmlFile.code
            });
        }
        
        // Process CSS file
        const cssFile = matchedLesson.files.find(f => f.language === 'css');
        if (cssFile) {
            files.push({
                id: 'fcc-css',
                filename: 'styles.css',
                content: cssFile.code
            });
        }
        
        // Process JavaScript file
        const jsFile = matchedLesson.files.find(f => f.language === 'js');
        if (jsFile) {
            files.push({
                id: 'fcc-js',
                filename: 'script.js',
                content: jsFile.code
            });
        }
        
        // Ensure we have at least minimal files
        if (!files.find(f => f.filename === 'index.html')) {
            files.push({
                id: 'default-html',
                filename: 'index.html',
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeLesson.title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>${activeLesson.title}</h1>
    <p>Welcome to this lesson!</p>
    <script src="script.js"></script>
</body>
</html>`
            });
        }
        
        if (!files.find(f => f.filename === 'styles.css')) {
            files.push({
                id: 'default-css',
                filename: 'styles.css',
                content: `body { font-family: Arial, sans-serif; margin: 20px; }`
            });
        }
        
        if (!files.find(f => f.filename === 'script.js')) {
            files.push({
                id: 'default-js',
                filename: 'script.js',
                content: `console.log("${activeLesson.title} loaded!");`
            });
        }
        
        return files;
    }
    
    /**
     * Generate solution files from matched lesson
     */
    generateSolutionFiles(matchedLesson, activeLesson) {
        const solutionFiles = [];
        
        // First try actual solution files
        if (matchedLesson.solution_files && matchedLesson.solution_files.length > 0) {
            const htmlSolution = matchedLesson.solution_files.find(f => f.language === 'html');
            const cssSolution = matchedLesson.solution_files.find(f => f.language === 'css');
            const jsSolution = matchedLesson.solution_files.find(f => f.language === 'js');
            
            if (htmlSolution) {
                solutionFiles.push({
                    filename: 'index.html',
                    content: htmlSolution.code
                });
            }
            if (cssSolution) {
                solutionFiles.push({
                    filename: 'styles.css',
                    content: cssSolution.code
                });
            }
            if (jsSolution) {
                solutionFiles.push({
                    filename: 'script.js',
                    content: jsSolution.code
                });
            }
        }
        
        // Fallback to enhanced regular files if no solution files
        if (solutionFiles.length === 0) {
            const htmlFile = matchedLesson.files.find(f => f.language === 'html');
            const cssFile = matchedLesson.files.find(f => f.language === 'css');
            const jsFile = matchedLesson.files.find(f => f.language === 'js');
            
            if (htmlFile && htmlFile.code.length > 100) {
                solutionFiles.push({
                    filename: 'index.html',
                    content: htmlFile.code.replace(/--fcc-editable-region--/g, '<!-- Solution content -->')
                });
            }
            if (cssFile && cssFile.code.length > 50) {
                solutionFiles.push({
                    filename: 'styles.css',
                    content: cssFile.code.replace(/--fcc-editable-region--/g, '/* Solution styles */')
                });
            }
            if (jsFile && jsFile.code.length > 50) {
                solutionFiles.push({
                    filename: 'script.js',
                    content: jsFile.code.replace(/--fcc-editable-region--/g, '// Solution code')
                });
            }
        }
        
        return solutionFiles;
    }
}

module.exports = new LessonMatchingService();