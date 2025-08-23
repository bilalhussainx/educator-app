import fs from 'fs';
import matter from 'gray-matter';

/**
 * A robust parser that can handle the project-based markdown format.
 * @param {string} filePath - The full path to the .md file.
 * @returns {object|null} A structured lesson object, or null if it's not a valid challenge.
 */
export async function parseMarkdownFile(filePath) {
    try {
        const mdContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter, content: challengeContent } = matter(mdContent);

        if (!frontMatter.id || !frontMatter.title) {
            return null; // Not a valid challenge file.
        }

        // A more robust way to extract sections by splitting the content
        const sections = challengeContent.split(/(?=^# --)/m);
        let description = '';
        let testCode = '';
        let seedContents = '';

        for (const section of sections) {
            if (section.startsWith('# --description--')) {
                description = section.replace('# --description--', '').trim();
            } else if (section.startsWith('# --hints--')) {
                testCode = section.replace('# --hints--', '').trim();
            } else if (section.startsWith('# --tests--')) { // Legacy format support
                testCode = section.replace('# --tests--', '').trim();
            } else if (section.startsWith('# --seed--')) {
                const seedMatch = section.match(/# --seed-contents--\n([\s\S]*)/);
                if (seedMatch) {
                    seedContents = seedMatch[1].trim();
                }
            }
        }

        // Parse the multiple files from the seed contents
        const files = [];
        const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(seedContents)) !== null) {
            const lang = match[1];
            const code = match[2].trim();
            let fileName = 'script.js';
            if (lang === 'html') fileName = 'index.html';
            if (lang === 'css') fileName = 'styles.css';
            files.push({ name: fileName, language: lang, content: code });
        }

        return {
            title: frontMatter.title,
            description,
            files,
            testCode,
        };

    } catch (error) {
        console.warn(`[WARN] Could not parse file: ${filePath}. Error: ${error.message}`);
        return null;
    }
}