interface ParsedResumeSection {
    title: string;
    content: string;
    originalContent: string;
    confidence: number;
}

interface ParsedResume {
    name: string;
    contact: {
        email: string;
        phone: string;
        address: string;
        linkedin: string;
        website: string;
    };
    sections: ParsedResumeSection[];
    rawContent: string;
    wordCount: number;
}

class UniversalResumeParser {

    parseResume(content: string): ParsedResume {
        console.log('🔍 Starting universal resume parsing...');
        console.log('📄 Content length:', content.length);
        console.log('📄 First 200 chars:', content.substring(0, 200));

        const result: ParsedResume = {
            name: this.extractName(content),
            contact: this.extractContact(content),
            sections: this.extractSections(content),
            rawContent: content,
            wordCount: content.trim().split(/\s+/).filter(word => word.length > 0).length
        };

        console.log('✅ Universal parsing complete:', {
            name: result.name,
            contactFound: Object.values(result.contact).filter(v => v).length,
            sectionsFound: result.sections.length,
            sectionTitles: result.sections.map(s => `${s.title} (${s.content.length} chars)`),
            wordCount: result.wordCount
        });

        return result;
    }

    private extractName(content: string): string {
        const lines = content.split('\n').filter(line => line.trim());

        // Try to find name in first few lines
        for (let i = 0; i < Math.min(8, lines.length); i++) {
            const line = lines[i].trim();

            // Enhanced cleaning for markdown and special characters
            const cleanLine = line
                .replace(/\*\*/g, '') // Remove ** markdown
                .replace(/\*/g, '') // Remove * markdown
                .replace(/[=_\-📄🎓💼📧📞📍]/g, '') // Remove other symbols
                .replace(/[^\w\s]/g, ' ') // Replace any remaining special chars with spaces
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            console.log(`🔍 Line ${i + 1}: "${line}" → cleaned: "${cleanLine}"`);

            // Skip if it's clearly not a name
            if (cleanLine.length < 2 || cleanLine.length > 50) continue;
            if (cleanLine.includes('@') || cleanLine.includes('http') || cleanLine.includes('www')) continue;
            if (/^\d+/.test(cleanLine)) continue; // Starts with number
            if (cleanLine.toLowerCase().includes('resume') || cleanLine.toLowerCase().includes('cv')) continue;
            if (cleanLine.toLowerCase().includes('toronto') || cleanLine.toLowerCase().includes('ontario')) continue;

            // Check if it looks like a name (2-4 words, proper case)
            const words = cleanLine.split(/\s+/).filter(word => word.length > 0);
            if (words.length >= 2 && words.length <= 4) {
                const hasProperCase = words.every(word =>
                    word.length > 1 &&
                    /^[A-Z]/.test(word) &&
                    !/[0-9]/.test(word) &&
                    word.length < 20 // Reasonable name length
                );

                if (hasProperCase) {
                    console.log('👤 Name found:', cleanLine);
                    return cleanLine;
                }
            }
        }

        console.log('❌ No name found, using default');
        return 'Name Not Found';
    }

    private extractContact(content: string): ParsedResume['contact'] {
        const contact = {
            email: '',
            phone: '',
            address: '',
            linkedin: '',
            website: ''
        };

        // Email
        const emailMatch = content.match(/([\w._%+-]+@[\w.-]+\.[A-Z]{2,})/gi);
        if (emailMatch) {
            contact.email = emailMatch[0];
            console.log('📧 Email found:', contact.email);
        }

        // Phone
        const phoneMatches = [
            /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
            /(\+\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
            /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g
        ];

        for (const regex of phoneMatches) {
            const match = content.match(regex);
            if (match) {
                contact.phone = match[0].trim();
                console.log('📞 Phone found:', contact.phone);
                break;
            }
        }

        // LinkedIn
        const linkedinMatch = content.match(/(linkedin\.com\/in\/[\w-]+|linkedin\.com\/[\w-]+)/gi);
        if (linkedinMatch) {
            contact.linkedin = linkedinMatch[0];
            console.log('🔗 LinkedIn found:', contact.linkedin);
        }

        // Website
        const websiteMatch = content.match(/(https?:\/\/[\w.-]+|www\.[\w.-]+)/gi);
        if (websiteMatch) {
            contact.website = websiteMatch[0];
            console.log('🌐 Website found:', contact.website);
        }

        // Address (simplified - look for city, state patterns)
        const addressMatch = content.match(/([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/);
        if (addressMatch) {
            contact.address = addressMatch[0];
            console.log('📍 Address found:', contact.address);
        }

        return contact;
    }

    private extractSections(content: string): ParsedResumeSection[] {
        const sections: ParsedResumeSection[] = [];
        const lines = content.split('\n');

        // Enhanced section keywords with more variations
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

        let currentSection: ParsedResumeSection | null = null;
        let contentBuffer: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                if (contentBuffer.length > 0) {
                    contentBuffer.push('');
                }
                continue;
            }

            // Check if this line is a section header
            const sectionMatch = this.detectSectionHeader(trimmed, sectionKeywords);

            if (sectionMatch) {
                // Save previous section
                if (currentSection && contentBuffer.length > 0) {
                    currentSection.content = contentBuffer.join('\n').trim();
                    currentSection.originalContent = currentSection.content;
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: sectionMatch.standardTitle,
                    content: '',
                    originalContent: '',
                    confidence: sectionMatch.confidence
                };
                contentBuffer = [];

                console.log(`📋 Section detected: "${sectionMatch.standardTitle}" from line: "${trimmed}" (confidence: ${sectionMatch.confidence.toFixed(2)})`);
            } else if (currentSection) {
                // Add content to current section
                contentBuffer.push(line);
            } else {
                // Content before any section (might be summary/intro)
                if (!sections.find(s => s.title === 'Professional Summary')) {
                    if (!currentSection) {
                        currentSection = {
                            title: 'Professional Summary',
                            content: '',
                            originalContent: '',
                            confidence: 0.5
                        };
                        contentBuffer = [];
                    }
                    contentBuffer.push(line);
                }
            }
        }

        // Add final section
        if (currentSection && contentBuffer.length > 0) {
            currentSection.content = contentBuffer.join('\n').trim();
            currentSection.originalContent = currentSection.content;
            sections.push(currentSection);
            console.log(`📋 Final section added: ${currentSection.title} (${currentSection.content.length} chars)`);
        }

        // Debug: show all detected sections
        console.log('📊 SECTION DETECTION SUMMARY:');
        sections.forEach((section, index) => {
            console.log(`${index + 1}. ${section.title}: ${section.content.length} characters`);
            if (section.content.length === 0) {
                console.log(`   ⚠️  Section "${section.title}" has NO CONTENT!`);
            } else {
                console.log(`   Preview: ${section.content.substring(0, 100)}...`);
            }
        });

        // If very few sections found, try alternative detection method
        if (sections.length <= 2) {
            console.log('⚠️ Few sections detected, trying alternative method...');
            const alternativeSections = this.detectSectionsByContent(content);
            if (alternativeSections.length > sections.length) {
                console.log('✅ Alternative method found more sections, using those');
                sections.length = 0; // Clear existing
                sections.push(...alternativeSections);
            }
        }

        // Final fallback: if we still have empty sections, try to fill them with content
        if (sections.some(s => s.content.length === 0)) {
            console.log('🔧 Attempting to fill empty sections with remaining content...');
            this.fillEmptySections(sections, content);
        }

        // Ensure we have a minimum of content by creating a comprehensive section if needed
        if (sections.length === 0 || sections.every(s => s.content.length < 50)) {
            console.log('🚨 Creating comprehensive fallback section...');
            sections.push({
                title: 'Resume Content',
                content: content,
                originalContent: content,
                confidence: 0.5
            });
        }

        // If still no sections found, create a single "Content" section
        if (sections.length === 0) {
            sections.push({
                title: 'Resume Content',
                content: content,
                originalContent: content,
                confidence: 1.0
            });
        }

        return sections;
    }

    private fillEmptySections(sections: ParsedResumeSection[], fullContent: string): void {
        const lines = fullContent.split('\n');
        const usedLines = new Set<number>();

        // First pass: mark lines that are already used in sections with content
        sections.forEach(section => {
            if (section.content.length > 0) {
                const sectionLines = section.content.split('\n');
                sectionLines.forEach(sectionLine => {
                    const lineIndex = lines.findIndex(line => line.includes(sectionLine.trim()));
                    if (lineIndex >= 0) usedLines.add(lineIndex);
                });
            }
        });

        // Second pass: fill empty sections with unused content
        let unusedContent: string[] = [];
        lines.forEach((line, index) => {
            if (!usedLines.has(index) && line.trim().length > 0) {
                unusedContent.push(line);
            }
        });

        if (unusedContent.length > 0) {
            console.log(`🔧 Found ${unusedContent.length} unused content lines to distribute`);

            const emptySections = sections.filter(s => s.content.length === 0);
            if (emptySections.length > 0) {
                // Distribute unused content among empty sections
                const contentPerSection = Math.ceil(unusedContent.length / emptySections.length);

                emptySections.forEach((section, index) => {
                    const startIndex = index * contentPerSection;
                    const endIndex = Math.min(startIndex + contentPerSection, unusedContent.length);
                    const sectionContent = unusedContent.slice(startIndex, endIndex).join('\n');

                    if (sectionContent.trim().length > 0) {
                        section.content = sectionContent.trim();
                        section.originalContent = section.content;
                        console.log(`✅ Filled ${section.title} with ${section.content.length} characters`);
                    }
                });
            }
        }
    }

    private detectSectionHeader(line: string, sectionKeywords: Record<string, string[]>): {standardTitle: string, confidence: number} | null {
        const originalLine = line.trim();
        const cleanLine = line
            .replace(/[📋▶━─=*_\-:]/g, '')
            .replace(/^\d+\.?\s*/, '') // Remove numbering
            .trim()
            .toLowerCase();

        if (cleanLine.length < 2 || cleanLine.length > 60) return null;

        let bestMatch: {standardTitle: string, confidence: number} | null = null;

        // Enhanced keyword matching with better scoring
        for (const [standardTitle, keywords] of Object.entries(sectionKeywords)) {
            for (const keyword of keywords) {
                // Exact match (highest confidence)
                if (cleanLine === keyword) {
                    return { standardTitle, confidence: 1.0 };
                }

                // Word boundary match (high confidence)
                const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (wordBoundaryRegex.test(cleanLine)) {
                    const confidence = 0.9;
                    if (!bestMatch || confidence > bestMatch.confidence) {
                        bestMatch = { standardTitle, confidence };
                    }
                }

                // Partial match (medium confidence)
                if (cleanLine.includes(keyword)) {
                    const confidence = Math.min(0.8, keyword.length / cleanLine.length);
                    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
                        bestMatch = { standardTitle, confidence };
                    }
                }
            }
        }

        // Enhanced formatting pattern detection
        const headerPatterns = [
            { pattern: /^[A-Z\s&-]{3,40}$/, confidence: 0.9 },  // ALL CAPS
            { pattern: /^[A-Z][a-z\s&-]{2,39}$/, confidence: 0.8 },  // Title Case
            { pattern: /^[A-Z][A-Z\s&-]*[A-Z]$/, confidence: 0.85 }, // Mixed caps
            { pattern: /^\w+\s+(EXPERIENCE|EDUCATION|SKILLS|SUMMARY)$/i, confidence: 0.9 }, // Common patterns
        ];

        // Check if the line has section-like formatting
        const hasFormatting = /[━─=*_\-]{3,}|📋|▶/.test(originalLine);
        const isShortLine = cleanLine.length <= 30;
        const followedByLine = hasFormatting || isShortLine;

        for (const { pattern, confidence } of headerPatterns) {
            if (pattern.test(originalLine.replace(/[📋▶━─=*_\-:]/g, '').trim())) {
                if (bestMatch && bestMatch.confidence > 0.6) {
                    return bestMatch;
                }

                // Only create generic section if it looks like a header
                if (followedByLine) {
                    return {
                        standardTitle: this.toTitleCase(cleanLine),
                        confidence: Math.min(confidence, 0.7)
                    };
                }
            }
        }

        // Additional heuristics for section detection
        if (bestMatch && bestMatch.confidence > 0.4) {
            // Boost confidence if line appears to be formatted as a header
            if (hasFormatting) {
                bestMatch.confidence = Math.min(1.0, bestMatch.confidence + 0.2);
            }
            if (isShortLine && !cleanLine.includes(',') && !cleanLine.includes('.')) {
                bestMatch.confidence = Math.min(1.0, bestMatch.confidence + 0.1);
            }
        }

        return bestMatch && bestMatch.confidence > 0.5 ? bestMatch : null;
    }

    private detectSectionsByContent(content: string): ParsedResumeSection[] {
        console.log('🔍 Trying content-based section detection...');
        const sections: ParsedResumeSection[] = [];
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Look for common patterns in resume content
        let currentSection: ParsedResumeSection | null = null;
        let sectionContent: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip name and contact info at the beginning
            if (i < 5 && (line.includes('@') || line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) || line.length < 30)) {
                continue;
            }

            // Look for potential section starts based on content patterns
            let detectedSection = null;

            // Work experience patterns
            if (line.match(/\b(assistant|dispatcher|manager|engineer|analyst|coordinator|specialist|developer|consultant)\b/i) &&
                line.length < 80 && !line.includes('.') && !line.includes(',')) {
                detectedSection = 'Work Experience';
            }
            // Education patterns
            else if (line.match(/\b(school|university|college|diploma|degree|bachelor|master|phd|certification)\b/i) &&
                     line.length < 80) {
                detectedSection = 'Education';
            }
            // Skills patterns
            else if (line.match(/\b(python|javascript|java|sql|aws|react|node|html|css|programming|technical)\b/i) &&
                     line.length < 100) {
                detectedSection = 'Technical Skills';
            }
            // Summary patterns
            else if (line.match(/\b(experienced|professional|dedicated|skilled|proven|results|years)\b/i) &&
                     line.length > 50 && i < 10) {
                detectedSection = 'Professional Summary';
            }

            // If we detected a new section
            if (detectedSection && (!currentSection || currentSection.title !== detectedSection)) {
                // Save previous section
                if (currentSection && sectionContent.length > 0) {
                    currentSection.content = sectionContent.join('\n');
                    currentSection.originalContent = currentSection.content;
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: detectedSection,
                    content: '',
                    originalContent: '',
                    confidence: 0.7
                };
                sectionContent = [line];
                console.log(`📋 Content-based section detected: ${detectedSection} from line: "${line}"`);
            } else if (currentSection) {
                sectionContent.push(line);
            } else {
                // Content before any section (likely summary)
                if (!currentSection) {
                    currentSection = {
                        title: 'Professional Summary',
                        content: '',
                        originalContent: '',
                        confidence: 0.6
                    };
                    sectionContent = [line];
                }
            }
        }

        // Add final section
        if (currentSection && sectionContent.length > 0) {
            currentSection.content = sectionContent.join('\n');
            currentSection.originalContent = currentSection.content;
            sections.push(currentSection);
        }

        console.log('✅ Content-based detection found sections:', sections.map(s => s.title));
        return sections;
    }

    private toTitleCase(str: string): string {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    generateStructuredTemplate(parsedResume: ParsedResume): string {
        const template = `
# RESUME TEMPLATE - READY FOR CLAUDE AI EDITING

## PERSONAL INFORMATION
**Name:** ${parsedResume.name}
**Email:** ${parsedResume.contact.email || '[Add Email]'}
**Phone:** ${parsedResume.contact.phone || '[Add Phone]'}
**Address:** ${parsedResume.contact.address || '[Add Address]'}
**LinkedIn:** ${parsedResume.contact.linkedin || '[Add LinkedIn URL]'}
**Website:** ${parsedResume.contact.website || '[Add Website]'}

${parsedResume.sections.map(section => `
## ${section.title.toUpperCase()}

${section.content || '[Add content for this section]'}

`).join('')}

---
**PARSING STATISTICS:**
- Total Word Count: ${parsedResume.wordCount}
- Sections Identified: ${parsedResume.sections.length}
- Contact Information: ${Object.values(parsedResume.contact).filter(v => v).length}/5 fields found

**CLAUDE AI INSTRUCTIONS:**
This resume has been automatically parsed and organized into standard sections.
You can now:
1. Edit any section content
2. Add missing information in [brackets]
3. Reorganize or rename sections as needed
4. Improve formatting and content quality
5. Ensure consistency across all sections
        `.trim();

        return template;
    }

    // Debug function to analyze parsing quality
    analyzeParsingQuality(parsedResume: ParsedResume): {
        score: number;
        issues: string[];
        suggestions: string[];
    } {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let score = 100;

        // Check name quality
        if (parsedResume.name === 'Name Not Found') {
            issues.push('Name not detected');
            suggestions.push('Add the name at the top of the document');
            score -= 20;
        }

        // Check contact information
        const contactFields = Object.values(parsedResume.contact).filter(v => v).length;
        if (contactFields < 2) {
            issues.push('Insufficient contact information');
            suggestions.push('Ensure email and phone number are clearly visible');
            score -= 15;
        }

        // Check sections
        if (parsedResume.sections.length < 3) {
            issues.push('Few sections detected');
            suggestions.push('Use clear section headers like "EXPERIENCE", "EDUCATION", "SKILLS"');
            score -= 20;
        }

        // Check section confidence
        const lowConfidenceSections = parsedResume.sections.filter(s => s.confidence < 0.7);
        if (lowConfidenceSections.length > 0) {
            issues.push('Some sections may be misidentified');
            suggestions.push('Review section headers and ensure they use standard terminology');
            score -= 10;
        }

        return {
            score: Math.max(0, score),
            issues,
            suggestions
        };
    }
}

export default new UniversalResumeParser();
export type { ParsedResume, ParsedResumeSection };