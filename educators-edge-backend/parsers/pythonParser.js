// src/parsers/pythonParser.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function extractSection(content, sectionName) {
    const regex = new RegExp(`# --${sectionName}--\n([\\s\\S]*?)(?=\n# --|$)`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parses a single Python markdown file.
 * @param {string} filePath - The full path to the .md file.
 * @returns {object|null} A structured lesson object, or null.
 */
function parsePythonMarkdownFile(filePath) {
    try {
        const mdContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter, content: challengeContent } = matter(mdContent);

        if (!frontMatter.id || !frontMatter.title) return null;

        // Python projects often have a single 'main.py' file in the seed
        const seedBlock = extractSection(challengeContent, 'seed');
        const boilerplateMatch = seedBlock.match(/```py\n([\s\S]*?)```/);
        const boilerplate = boilerplateMatch ? boilerplateMatch[1].trim() : '';
        
        const files = [{
            name: 'main.py',
            language: 'python',
            content: boilerplate
        }];

        return {
            title: frontMatter.title,
            description: extractSection(challengeContent, 'description'),
            files: files,
            testCode: extractSection(challengeContent, 'hints'),
        };
    } catch (error) {
        console.warn(`[WARN] Could not parse Python file: ${filePath}.`);
        return null;
    }
}

/**
 * Recursively finds all markdown files in a directory.
 * @param {string} dir - The directory to search.
 * @returns {string[]} An array of full file paths.
 */
function findAllMarkdownFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(findAllMarkdownFiles(fullPath));
        } else if (path.extname(file.name) === '.md') {
            results.push(fullPath);
        }
    }
    return results;
}

module.exports = {
    findAllMarkdownFiles,
    parsePythonMarkdownFile,
};