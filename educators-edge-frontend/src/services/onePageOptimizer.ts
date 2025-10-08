// One-page resume optimization service
export interface ContentPriority {
    section: string;
    priority: number; // 1-10, 10 being highest
    maxLines: number;
    compressionLevel: 'none' | 'light' | 'medium' | 'aggressive';
}

export class OnePageOptimizer {
    private static readonly SECTION_PRIORITIES: ContentPriority[] = [
        { section: 'Professional Summary', priority: 10, maxLines: 4, compressionLevel: 'light' },
        { section: 'Technical Skills', priority: 9, maxLines: 8, compressionLevel: 'light' },
        { section: 'Work Experience', priority: 8, maxLines: 18, compressionLevel: 'light' },
        { section: 'Education', priority: 6, maxLines: 6, compressionLevel: 'light' },
        { section: 'Projects', priority: 7, maxLines: 8, compressionLevel: 'light' },
        { section: 'Certifications', priority: 5, maxLines: 5, compressionLevel: 'medium' },
        { section: 'Achievements', priority: 4, maxLines: 4, compressionLevel: 'medium' },
        { section: 'Languages', priority: 3, maxLines: 3, compressionLevel: 'medium' },
    ];

    static optimizeForOnePage(content: string): string {
        console.log('🎯 OPTIMIZING FOR ONE-PAGE PREMIUM QUALITY');
        console.log(`📄 Input content length: ${content.length} characters`);
        console.log(`📄 First 200 chars: ${content.substring(0, 200)}`);

        const sections = this.parseIntoSections(content);
        console.log(`📋 Parsed ${sections.length} sections:`, sections.map(s => `${s.title} (${s.content.length} chars)`));

        const optimizedSections = this.prioritizeAndCompress(sections);
        const result = this.reconstructOptimizedContent(optimizedSections);

        console.log(`✅ Optimized content length: ${result.length} characters`);
        return result;
    }

    private static parseIntoSections(content: string): Array<{title: string, content: string}> {
        const sections: Array<{title: string, content: string}> = [];
        const lines = content.split('\n');

        let currentSection: {title: string, content: string} | null = null;
        let contentBuffer: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Check if this is a section header
            const isHeader = this.isSectionHeader(trimmed);

            if (isHeader) {
                // Save previous section
                if (currentSection && contentBuffer.length > 0) {
                    currentSection.content = contentBuffer.join('\n').trim();
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = { title: trimmed, content: '' };
                contentBuffer = [];
            } else if (currentSection && trimmed) {
                contentBuffer.push(line);
            }
        }

        // Add final section
        if (currentSection && contentBuffer.length > 0) {
            currentSection.content = contentBuffer.join('\n').trim();
            sections.push(currentSection);
        }

        return sections;
    }

    private static isSectionHeader(line: string): boolean {
        const headerKeywords = [
            'summary', 'objective', 'profile', 'about',
            'experience', 'employment', 'work', 'career',
            'education', 'academic', 'qualifications',
            'skills', 'technical', 'competencies', 'expertise',
            'projects', 'portfolio', 'work samples',
            'certifications', 'certificates', 'credentials',
            'achievements', 'accomplishments', 'awards',
            'languages', 'linguistic'
        ];

        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
        return headerKeywords.some(keyword => cleanLine.includes(keyword)) &&
               line.length < 50 &&
               !line.includes('.');
    }

    private static prioritizeAndCompress(sections: Array<{title: string, content: string}>): Array<{title: string, content: string}> {
        const optimized: Array<{title: string, content: string}> = [];

        // Sort sections by priority
        const prioritizedSections = sections.sort((a, b) => {
            const aPriority = this.getSectionPriority(a.title);
            const bPriority = this.getSectionPriority(b.title);
            return bPriority.priority - aPriority.priority;
        });

        for (const section of prioritizedSections) {
            const priority = this.getSectionPriority(section.title);
            const compressedContent = this.compressContent(section.content, priority);

            if (compressedContent.trim()) {
                optimized.push({
                    title: section.title,
                    content: compressedContent
                });
            }
        }

        return optimized;
    }

    private static getSectionPriority(sectionTitle: string): ContentPriority {
        const match = this.SECTION_PRIORITIES.find(p =>
            sectionTitle.toLowerCase().includes(p.section.toLowerCase().split(' ')[0])
        );
        return match || { section: 'Other', priority: 2, maxLines: 2, compressionLevel: 'aggressive' };
    }

    private static compressContent(content: string, priority: ContentPriority): string {
        const lines = content.split('\n').filter(line => line.trim());

        // Apply compression based on level
        let compressed = lines;

        switch (priority.compressionLevel) {
            case 'aggressive':
                compressed = this.aggressiveCompress(lines);
                break;
            case 'medium':
                compressed = this.mediumCompress(lines);
                break;
            case 'light':
                compressed = this.lightCompress(lines);
                break;
        }

        // Limit to max lines
        if (compressed.length > priority.maxLines) {
            compressed = compressed.slice(0, priority.maxLines);
        }

        return compressed.join('\n');
    }

    private static aggressiveCompress(lines: string[]): string[] {
        return lines
            .map(line => {
                // Very light compression - just clean up spacing
                return line
                    .replace(/\b(very|extremely)\s+/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(line => line.length > 3);
    }

    private static mediumCompress(lines: string[]): string[] {
        return lines
            .map(line => {
                // Minimal compression - just normalize spacing
                return line
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(line => line.length > 0);
    }

    private static lightCompress(lines: string[]): string[] {
        return lines
            .map(line => line.replace(/\s+/g, ' ').trim())
            .filter(line => line.length > 0);
    }

    private static reconstructOptimizedContent(sections: Array<{title: string, content: string}>): string {
        return sections
            .map(section => `${section.title}\n${section.content}`)
            .join('\n\n');
    }
}

export default OnePageOptimizer;