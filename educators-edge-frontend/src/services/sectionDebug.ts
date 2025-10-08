// Section content debug tool
export const debugSectionParsing = () => {
    console.log('🧩 SECTION PARSING DEBUG');
    console.log('=' .repeat(60));

    // Get the current resume content from the page
    const resumeTextArea = document.querySelector('textarea') as HTMLTextAreaElement;
    const content = resumeTextArea?.value || '';

    if (!content) {
        console.log('❌ No resume content found in textarea');
        return;
    }

    console.log('📄 RAW CONTENT:');
    console.log('─'.repeat(40));
    console.log(content);
    console.log('─'.repeat(40));

    const lines = content.split('\n');
    console.log(`\n📊 Total lines: ${lines.length}`);

    // Enhanced section keywords (same as in universalResumeParser)
    const sectionKeywords = {
        'Professional Summary': ['summary', 'profile', 'objective', 'about', 'overview', 'professional summary', 'career summary'],
        'Work Experience': ['experience', 'employment', 'work history', 'professional experience', 'career', 'work experience', 'employment history', 'professional background'],
        'Education': ['education', 'academic', 'qualifications', 'degrees', 'academic background', 'educational background'],
        'Technical Skills': ['skills', 'technical skills', 'competencies', 'technologies', 'expertise', 'technical competencies', 'core skills', 'key skills'],
        'Projects': ['projects', 'portfolio', 'work samples', 'key projects', 'notable projects'],
        'Certifications': ['certifications', 'certificates', 'credentials', 'professional certifications'],
        'Achievements': ['achievements', 'accomplishments', 'awards', 'honors', 'recognition'],
        'Languages': ['languages', 'linguistic', 'language skills'],
        'Volunteer Experience': ['volunteer', 'community service', 'volunteer experience'],
        'Publications': ['publications', 'papers', 'articles', 'research'],
        'References': ['references', 'professional references']
    };

    const detectSectionHeader = (line: string): {standardTitle: string, confidence: number} | null => {
        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();

        if (cleanLine.length < 2 || cleanLine.length > 60) return null;

        let bestMatch: {standardTitle: string, confidence: number} | null = null;

        for (const [standardTitle, keywords] of Object.entries(sectionKeywords)) {
            for (const keyword of keywords) {
                if (cleanLine === keyword) {
                    return { standardTitle, confidence: 1.0 };
                }

                const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (wordBoundaryRegex.test(cleanLine)) {
                    const confidence = 0.9;
                    if (!bestMatch || confidence > bestMatch.confidence) {
                        bestMatch = { standardTitle, confidence };
                    }
                }

                if (cleanLine.includes(keyword)) {
                    const confidence = Math.min(0.8, keyword.length / cleanLine.length);
                    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
                        bestMatch = { standardTitle, confidence };
                    }
                }
            }
        }

        return bestMatch && bestMatch.confidence > 0.5 ? bestMatch : null;
    };

    // Parse sections manually to debug
    const sections: Array<{title: string, startLine: number, endLine?: number, content: string[]}> = [];
    let currentSection: any = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) continue;

        const sectionMatch = detectSectionHeader(trimmed);

        if (sectionMatch) {
            // End previous section
            if (currentSection) {
                currentSection.endLine = i - 1;
                sections.push(currentSection);
            }

            // Start new section
            currentSection = {
                title: sectionMatch.standardTitle,
                startLine: i,
                content: []
            };

            console.log(`\n📋 SECTION FOUND: "${sectionMatch.standardTitle}"`);
            console.log(`   Line ${i + 1}: "${trimmed}"`);
            console.log(`   Confidence: ${sectionMatch.confidence.toFixed(2)}`);
        } else if (currentSection) {
            currentSection.content.push(line);
            console.log(`   Content line ${i + 1}: "${trimmed.substring(0, 60)}${trimmed.length > 60 ? '...' : ''}"`);
        }
    }

    // End final section
    if (currentSection) {
        currentSection.endLine = lines.length - 1;
        sections.push(currentSection);
    }

    console.log(`\n📊 SECTIONS SUMMARY:`);
    sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.title}:`);
        console.log(`   Lines: ${section.startLine + 1} - ${section.endLine ? section.endLine + 1 : 'end'}`);
        console.log(`   Content lines: ${section.content.length}`);
        console.log(`   First few content lines:`);
        section.content.slice(0, 3).forEach((line, i) => {
            console.log(`     ${i + 1}: "${line.trim()}"`);
        });
        if (section.content.length === 0) {
            console.log('     ⚠️  NO CONTENT FOUND!');
        }
        console.log('');
    });

    return {content, lines, sections};
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).debugSectionParsing = debugSectionParsing;
    console.log('🧩 Section Debug loaded! Run: debugSectionParsing()');
}

export default debugSectionParsing;