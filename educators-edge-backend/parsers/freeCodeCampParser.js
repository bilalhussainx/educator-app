// FILE: src/parsers/freeCodeCampParser.js (Definitive, Corrected Version)

const fs = require('fs');
const matter = require('gray-matter');

/**
 * Extracts content from a specific section of the markdown (e.g., # --description--).
 * @param {string} content - The full markdown content.
 * @param {string} sectionName - The name of the section (e.g., "description", "hints").
 */
function extractSection(content, sectionName) {
    const regex = new RegExp(`# --${sectionName}--\n([\\s\\S]*?)(?=\n# --|$)`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parses a block of code containing multiple file types (html, css, js).
 * @param {string} blockContent - The content of a # --seed-contents-- or # --solutions-- block.
 * @returns {object[]} An array of file objects.
 */
function parseSeedOrSolution(blockContent) {
    const files = [];
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(blockContent)) !== null) {
        const lang = match[1];
        const code = match[2].trim();
        let fileName = 'script.js'; // Default
        if (lang === 'html') fileName = 'index.html';
        if (lang === 'css') fileName = 'styles.css';
        files.push({ name: fileName, language: lang, content: code });
    }
    return files;
}

/**
 * Parses a single JavaScript markdown file to extract its content.
 * @param {string} filePath - The full path to the .md file.
 * @returns {object|null} A structured lesson object, or null if it's not a valid challenge.
 */
async function parseMarkdownFile(filePath) {
    try {
        const mdContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter, content: challengeContent } = matter(mdContent);

        // A valid challenge MUST have an id and a title in its front matter.
        if (!frontMatter.id || !frontMatter.title) {
            return null;
        }

        const seedBlock = extractSection(challengeContent, 'seed-contents');
        const solutionBlock = extractSection(challengeContent, 'solutions');

        return {
            title: frontMatter.title,
            description: extractSection(challengeContent, 'description'),
            files: parseSeedOrSolution(seedBlock), // Boilerplate code
            solutionFiles: parseSeedOrSolution(solutionBlock), // Solution code
            testCode: extractSection(challengeContent, 'hints') || extractSection(challengeContent, 'tests'), // Support both formats
        };
    } catch (error) {
        console.warn(`[WARN] Could not parse file: ${filePath}. Error: ${error.message}`);
        return null;
    }
}

// THIS IS THE MOST IMPORTANT PART.
// It makes the parseMarkdownFile function available for other files to import.
module.exports = {
    parseMarkdownFile
};