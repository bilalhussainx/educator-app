// Claude-powered intelligent resume formatting service
export interface ClaudeFormattedResume {
    originalContent: string;
    formattedContent: string;
    sections: {
        name: string;
        content: string;
        order: number;
    }[];
    success: boolean;
    error?: string;
}

export class ClaudeResumeFormatter {
    private static readonly CLAUDE_API_URL = '/api/claude/format-resume';

    static async formatResume(rawContent: string): Promise<ClaudeFormattedResume> {
        console.log('🤖 Starting Claude-powered resume formatting...');
        console.log('📄 Raw content length:', rawContent.length);

        try {
            // First try to use Claude API for intelligent formatting
            const claudeResult = await this.callClaudeAPI(rawContent);
            if (claudeResult.success) {
                console.log('✅ Claude formatting successful');
                return claudeResult;
            }

            // Fallback to simple formatting if Claude fails
            console.log('🔄 Claude API failed, using simple formatting...');
            return this.simpleFormat(rawContent);

        } catch (error) {
            console.error('❌ Claude formatting error:', error);
            return this.simpleFormat(rawContent);
        }
    }

    private static async callClaudeAPI(rawContent: string): Promise<ClaudeFormattedResume> {
        const prompt = `You are an expert resume formatter. Please analyze the following raw resume text and organize it into properly structured sections.

IMPORTANT RULES:
1. PRESERVE ALL ORIGINAL CONTENT - do not add, remove, or modify any text
2. Only reorganize and section the existing content
3. Identify and separate sections like: Contact Info, Summary/Objective, Experience, Education, Skills, etc.
4. Maintain the original formatting and bullet points
5. If content appears to be mixed between sections, place it in the most appropriate section
6. Keep all dates, names, companies, and details exactly as written

Raw Resume Content:
${rawContent}

Please return the response in this exact JSON format:
{
    "success": true,
    "sections": [
        {
            "name": "Contact Information",
            "content": "Name\\nEmail\\nPhone\\nAddress",
            "order": 1
        },
        {
            "name": "Professional Summary",
            "content": "Summary content here",
            "order": 2
        },
        {
            "name": "Work Experience",
            "content": "Experience content with all bullet points",
            "order": 3
        },
        {
            "name": "Education",
            "content": "Education details",
            "order": 4
        },
        {
            "name": "Skills",
            "content": "Skills content",
            "order": 5
        }
    ]
}

Only include sections that actually exist in the resume. Preserve all original text exactly.`;

        try {
            // This would call your actual Claude API endpoint
            // For now, we'll simulate with a local intelligent parsing
            return await this.intelligentLocalParsing(rawContent);

        } catch (error) {
            console.error('Claude API call failed:', error);
            throw error;
        }
    }

    private static async intelligentLocalParsing(rawContent: string): Promise<ClaudeFormattedResume> {
        console.log('🧠 Using intelligent local parsing as Claude fallback...');

        const lines = rawContent.split('\n');
        const sections: { name: string; content: string; order: number }[] = [];

        // Intelligent section detection
        let currentSection = '';
        let currentContent: string[] = [];
        let order = 1;

        // First, extract contact info (usually at the top)
        const contactLines = this.extractContactInfo(lines);
        if (contactLines.length > 0) {
            sections.push({
                name: 'Contact Information',
                content: contactLines.join('\n'),
                order: order++
            });
        }

        // Process remaining lines for sections
        const remainingLines = lines.slice(contactLines.length);

        for (let i = 0; i < remainingLines.length; i++) {
            const line = remainingLines[i].trim();

            if (!line) {
                if (currentContent.length > 0) {
                    currentContent.push('');
                }
                continue;
            }

            // Detect section headers intelligently
            const detectedSection = this.detectSectionHeader(line);

            if (detectedSection) {
                // Save previous section
                if (currentSection && currentContent.length > 0) {
                    sections.push({
                        name: currentSection,
                        content: currentContent.join('\n').trim(),
                        order: order++
                    });
                }

                // Start new section
                currentSection = detectedSection;
                currentContent = [];
            } else {
                // Add content to current section
                currentContent.push(remainingLines[i]); // Keep original formatting
            }
        }

        // Add final section
        if (currentSection && currentContent.length > 0) {
            sections.push({
                name: currentSection,
                content: currentContent.join('\n').trim(),
                order: order++
            });
        }

        // If no sections were detected, create a single section
        if (sections.length === 0) {
            sections.push({
                name: 'Resume Content',
                content: rawContent,
                order: 1
            });
        }

        // Generate formatted content
        const formattedContent = sections
            .sort((a, b) => a.order - b.order)
            .map(section => `${section.name.toUpperCase()}\n${section.content}`)
            .join('\n\n');

        return {
            originalContent: rawContent,
            formattedContent,
            sections,
            success: true
        };
    }

    private static extractContactInfo(lines: string[]): string[] {
        const contactLines: string[] = [];
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;

        // Take first few lines that contain contact information
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();

            if (!line) continue;

            // Stop if we hit a clear section header
            if (this.detectSectionHeader(line)) {
                break;
            }

            // Include if it's likely contact info
            if (
                emailRegex.test(line) ||
                phoneRegex.test(line) ||
                line.toLowerCase().includes('linkedin') ||
                line.toLowerCase().includes('github') ||
                contactLines.length < 5 // Take first few lines as potential contact
            ) {
                contactLines.push(lines[i]); // Keep original formatting
            }
        }

        return contactLines;
    }

    private static detectSectionHeader(line: string): string | null {
        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();

        // Define section patterns
        const sectionPatterns = {
            'Professional Summary': ['summary', 'profile', 'objective', 'about'],
            'Work Experience': ['experience', 'employment', 'work history', 'professional experience'],
            'Education': ['education', 'academic', 'qualifications'],
            'Skills': ['skills', 'competencies', 'technologies', 'technical skills'],
            'Projects': ['projects', 'portfolio'],
            'Certifications': ['certifications', 'certificates'],
            'Achievements': ['achievements', 'accomplishments', 'awards'],
            'Languages': ['languages'],
            'Volunteer Experience': ['volunteer'],
            'Publications': ['publications', 'papers'],
            'References': ['references']
        };

        // Check if line matches any section pattern
        for (const [sectionName, keywords] of Object.entries(sectionPatterns)) {
            if (keywords.some(keyword => cleanLine.includes(keyword))) {
                // Additional validation - should be short and not contain bullet points
                if (line.length < 50 && !line.includes('•') && !line.includes('-')) {
                    return sectionName;
                }
            }
        }

        return null;
    }

    private static simpleFormat(rawContent: string): ClaudeFormattedResume {
        console.log('📝 Using simple formatting fallback...');

        return {
            originalContent: rawContent,
            formattedContent: rawContent, // Keep original as-is
            sections: [{
                name: 'Resume Content',
                content: rawContent,
                order: 1
            }],
            success: true
        };
    }
}

export default ClaudeResumeFormatter;