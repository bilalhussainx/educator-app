/**
 * Word Document Processing API
 * Handles extraction of clean text from Word documents (.doc, .docx)
 * Integrates with Claude AI formatting agent for authenticity preservation
 */

import mammoth from 'mammoth';

export interface FormattedText {
    text: string;
    isBold: boolean;
    isHeading: boolean;
    fontSize?: number;
    headingLevel?: number;
}

export interface WordProcessingResult {
    success: boolean;
    extractedText: string;
    htmlContent?: string;
    formattedContent?: FormattedText[];
    detectedHeadings?: Array<{
        text: string;
        level: number;
        position: number;
        formatting: {
            isBold: boolean;
            fontSize?: number;
            isUpperCase: boolean;
        };
    }>;
    metadata?: {
        fileName: string;
        fileSize: number;
        wordCount: number;
        characterCount: number;
        sections: string[];
        headingsFound: number;
    };
    error?: string;
}

export interface DocumentStructure {
    sections: Array<{
        title: string;
        content: string;
        position: number;
    }>;
    fullText: string;
    preservedFormatting: boolean;
}

class WordDocumentAPI {
    /**
     * Process Word document and extract clean text with structure preservation
     */
    async processWordDocument(file: File): Promise<WordProcessingResult> {
        console.log('📄 Word Document API: Processing', file.name);

        try {
            // Validate file type
            if (!this.isWordDocument(file)) {
                throw new Error('Invalid file type. Please upload a Word document (.doc or .docx)');
            }

            // Convert file to ArrayBuffer
            const arrayBuffer = await this.fileToArrayBuffer(file);

            // Extract text and HTML using Mammoth.js with formatting preservation
            const textResult = await mammoth.extractRawText({ arrayBuffer });
            const htmlResult = await mammoth.convertToHtml({
                arrayBuffer,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Title'] => h1:fresh",
                    "b => strong"
                ]
            });

            // Clean and structure the extracted text
            const cleanText = this.cleanExtractedText(textResult.value);

            // Extract formatting information from HTML
            const formattedContent = this.extractFormattingFromHTML(htmlResult.value);
            const detectedHeadings = this.detectHeadingsFromFormatting(formattedContent, htmlResult.value);

            // Identify sections using both text patterns and formatting
            const sections = this.identifyDocumentSectionsWithFormatting(cleanText, detectedHeadings);

            const result: WordProcessingResult = {
                success: true,
                extractedText: cleanText,
                htmlContent: htmlResult.value,
                formattedContent,
                detectedHeadings,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    wordCount: this.countWords(cleanText),
                    characterCount: cleanText.length,
                    sections: sections.map(s => s.title),
                    headingsFound: detectedHeadings.length
                }
            };

            console.log('✅ Word document processed successfully:', {
                fileName: file.name,
                textLength: cleanText.length,
                sectionsFound: sections.length,
                wordsExtracted: result.metadata?.wordCount
            });

            return result;

        } catch (error: any) {
            console.error('❌ Word document processing failed:', error);
            return {
                success: false,
                extractedText: '',
                error: error.message || 'Failed to process Word document'
            };
        }
    }

    /**
     * Extract structured content from Word document with section preservation
     */
    async extractStructuredContent(file: File): Promise<DocumentStructure> {
        console.log('🏗️ Extracting structured content from Word document...');

        const result = await this.processWordDocument(file);

        if (!result.success) {
            return {
                sections: [],
                fullText: '',
                preservedFormatting: false
            };
        }

        const sections = this.identifyDocumentSections(result.extractedText);

        return {
            sections,
            fullText: result.extractedText,
            preservedFormatting: true
        };
    }

    /**
     * Process Word document specifically for Claude AI formatting
     */
    async processForClaudeAI(file: File): Promise<{
        cleanText: string;
        sections: Array<{ title: string; content: string; position: number }>;
        metadata: any;
        success: boolean;
    }> {
        console.log('🤖 Processing Word document for Claude AI formatting agent...');

        const result = await this.processWordDocument(file);

        if (!result.success) {
            return {
                cleanText: '',
                sections: [],
                metadata: null,
                success: false
            };
        }

        const sections = this.identifyDocumentSections(result.extractedText);

        return {
            cleanText: result.extractedText,
            sections,
            metadata: result.metadata,
            success: true
        };
    }

    /**
     * Validate if file is a Word document
     */
    private isWordDocument(file: File): boolean {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'application/vnd.ms-word'
        ];

        const validExtensions = ['.doc', '.docx'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    }

    /**
     * Convert File to ArrayBuffer for processing
     */
    private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result instanceof ArrayBuffer) {
                    resolve(e.target.result);
                } else {
                    reject(new Error('Failed to read file as ArrayBuffer'));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Clean extracted text and normalize formatting
     */
    private cleanExtractedText(rawText: string): string {
        return rawText
            // Remove excessive whitespace
            .replace(/\\s+/g, ' ')
            // Fix common encoding issues
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            // Normalize line breaks
            .replace(/\\r\\n/g, '\\n')
            .replace(/\\r/g, '\\n')
            // Remove empty lines but preserve structure
            .split('\\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\\n')
            .trim();
    }

    /**
     * Extract formatting information from HTML content
     */
    private extractFormattingFromHTML(html: string): FormattedText[] {
        const formattedContent: FormattedText[] = [];

        // Parse HTML to extract text with formatting
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const processElement = (element: Element, parentBold = false): void => {
            if (element.nodeType === Node.TEXT_NODE) {
                const text = element.textContent?.trim();
                if (text && text.length > 0) {
                    formattedContent.push({
                        text,
                        isBold: parentBold,
                        isHeading: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.parentElement?.tagName || ''),
                        headingLevel: this.getHeadingLevel(element.parentElement?.tagName)
                    });
                }
                return;
            }

            const tagName = element.tagName;
            const isBold = parentBold || tagName === 'STRONG' || tagName === 'B' ||
                          element.getAttribute('style')?.includes('font-weight: bold') ||
                          element.getAttribute('style')?.includes('font-weight:bold');

            // Process child nodes
            Array.from(element.childNodes).forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent?.trim();
                    if (text && text.length > 0) {
                        formattedContent.push({
                            text,
                            isBold,
                            isHeading: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName),
                            headingLevel: this.getHeadingLevel(tagName)
                        });
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    processElement(child as Element, isBold);
                }
            });
        };

        Array.from(tempDiv.children).forEach(element => processElement(element));
        return formattedContent;
    }

    /**
     * Get heading level from tag name
     */
    private getHeadingLevel(tagName?: string): number | undefined {
        if (!tagName) return undefined;
        const match = tagName.match(/^H([1-6])$/);
        return match ? parseInt(match[1]) : undefined;
    }

    /**
     * Detect headings from formatting cues
     */
    private detectHeadingsFromFormatting(formattedContent: FormattedText[], html: string): Array<{
        text: string;
        level: number;
        position: number;
        formatting: {
            isBold: boolean;
            fontSize?: number;
            isUpperCase: boolean;
        };
    }> {
        const headings: Array<{
            text: string;
            level: number;
            position: number;
            formatting: { isBold: boolean; fontSize?: number; isUpperCase: boolean; };
        }> = [];

        formattedContent.forEach((item, index) => {
            // Check if this looks like a heading based on formatting
            const isLikelyHeading = this.isLikelyHeadingFromFormatting(item.text, item.isBold);

            if (isLikelyHeading || item.isHeading) {
                const level = item.headingLevel || this.inferHeadingLevel(item.text, item.isBold);

                headings.push({
                    text: item.text,
                    level,
                    position: index,
                    formatting: {
                        isBold: item.isBold,
                        fontSize: item.fontSize,
                        isUpperCase: item.text === item.text.toUpperCase()
                    }
                });
            }
        });

        return headings;
    }

    /**
     * Check if text is likely a heading based on formatting
     */
    private isLikelyHeadingFromFormatting(text: string, isBold: boolean): boolean {
        // Known resume section patterns
        const resumeSectionPatterns = [
            /^(SUMMARY|OBJECTIVE|PROFILE|PERSONAL SUMMARY)$/i,
            /^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT)$/i,
            /^(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)$/i,
            /^(SKILLS|TECHNICAL SKILLS|COMPETENCIES|EXPERTISE)$/i,
            /^(PROJECTS|PERSONAL PROJECTS|KEY PROJECTS)$/i,
            /^(CERTIFICATIONS|CERTIFICATES|LICENSES)$/i,
            /^(ACHIEVEMENTS|ACCOMPLISHMENTS|AWARDS)$/i,
            /^(CONTACT|CONTACT INFORMATION|PERSONAL DETAILS)$/i
        ];

        // Check if it matches known patterns
        const matchesPattern = resumeSectionPatterns.some(pattern => pattern.test(text));

        // Formatting-based detection
        const isShortLine = text.length < 50;
        const isAllCaps = text === text.toUpperCase() && text.length > 2;
        const hasNoTrailingPunctuation = !/[.!?]$/.test(text);
        const isAlphaNumeric = /^[A-Za-z0-9\s&-]+$/.test(text);

        // Likely heading if:
        // 1. Matches known resume section patterns, OR
        // 2. Is bold AND short AND doesn't end with punctuation, OR
        // 3. Is all caps AND short AND alphanumeric
        return matchesPattern ||
               (isBold && isShortLine && hasNoTrailingPunctuation && isAlphaNumeric) ||
               (isAllCaps && isShortLine && hasNoTrailingPunctuation && isAlphaNumeric);
    }

    /**
     * Infer heading level based on text content and formatting
     */
    private inferHeadingLevel(text: string, isBold: boolean): number {
        const textLower = text.toLowerCase().trim();

        // Main sections (H1)
        if (/(experience|education|skills|summary|objective|projects|certifications)/.test(textLower)) {
            return 1;
        }

        // Sub-sections (H2)
        if (/(professional experience|work experience|technical skills|personal projects)/.test(textLower)) {
            return 2;
        }

        // Job titles or specific entries (H3)
        if (isBold && text.length < 30) {
            return 3;
        }

        // Default
        return 2;
    }

    /**
     * Identify document sections using both text patterns and formatting information
     */
    private identifyDocumentSectionsWithFormatting(
        text: string,
        detectedHeadings: Array<{ text: string; level: number; position: number; }>
    ): Array<{ title: string; content: string; position: number }> {
        const lines = text.split('\n');
        const sections: Array<{ title: string; content: string; position: number }> = [];

        // Use detected headings to identify sections
        const headingTexts = detectedHeadings.map(h => h.text.toLowerCase().trim());

        let currentSection: { title: string; content: string; position: number } | null = null;
        let position = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) continue;

            // Check if this line is a detected heading
            const isDetectedHeading = headingTexts.includes(trimmedLine.toLowerCase());
            const isPatternHeading = this.isLikelyHeader(trimmedLine);

            if (isDetectedHeading || isPatternHeading) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: trimmedLine,
                    content: '',
                    position: position++
                };
            } else if (currentSection && trimmedLine.length > 0) {
                // Add content to current section
                currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
            }
        }

        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Identify document sections based on common resume patterns
     */
    private identifyDocumentSections(text: string): Array<{ title: string; content: string; position: number }> {
        const lines = text.split('\\n');
        const sections: Array<{ title: string; content: string; position: number }> = [];
        let currentSection: { title: string; content: string; position: number } | null = null;
        let position = 0;

        // Common section headers patterns
        const sectionPatterns = [
            /^(SUMMARY|OBJECTIVE|PROFILE|PERSONAL SUMMARY)$/i,
            /^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT)$/i,
            /^(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)$/i,
            /^(SKILLS|TECHNICAL SKILLS|COMPETENCIES|EXPERTISE)$/i,
            /^(PROJECTS|PERSONAL PROJECTS|KEY PROJECTS)$/i,
            /^(CERTIFICATIONS|CERTIFICATES|LICENSES)$/i,
            /^(ACHIEVEMENTS|ACCOMPLISHMENTS|AWARDS)$/i,
            /^(CONTACT|CONTACT INFORMATION|PERSONAL DETAILS)$/i
        ];

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check if line is a section header
            const isHeader = sectionPatterns.some(pattern => pattern.test(trimmedLine)) ||
                            this.isLikelySectionHeader(trimmedLine);

            if (isHeader) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: trimmedLine,
                    content: '',
                    position: position++
                };
            } else if (currentSection && trimmedLine.length > 0) {
                // Add content to current section
                currentSection.content += (currentSection.content ? '\\n' : '') + trimmedLine;
            }
        }

        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Check if a line is likely a header (for compatibility)
     */
    private isLikelyHeader(line: string): boolean {
        const headerPatterns = [
            /^[A-Z][A-Z\s]+$/,  // ALL CAPS
            /^[A-Z][a-z\s]+:$/,  // Title Case with colon
            /^(Experience|Education|Skills|Summary|Objective|Projects|Certifications)/i,
            /^[A-Z][^.]{2,30}$/  // Short capitalized line without period
        ];

        return headerPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Detect if a line is likely a section header
     */
    private isLikelySectionHeader(line: string): boolean {
        // Common header characteristics
        return (
            line.length < 50 && // Headers are usually short
            line === line.toUpperCase() && // All caps
            !/[.!?]$/.test(line) && // No sentence ending punctuation
            /^[A-Z\\s&-]+$/.test(line) // Only letters, spaces, ampersands, hyphens
        );
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.trim().split(/\\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Validate extracted content quality
     */
    validateExtractedContent(content: string): {
        isValid: boolean;
        quality: 'excellent' | 'good' | 'fair' | 'poor';
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check content length
        if (content.length < 100) {
            issues.push('Content too short');
            recommendations.push('Ensure document contains substantial text');
        }

        // Check for common extraction issues
        if (content.includes('PK') && content.includes('word/')) {
            issues.push('Binary content detected');
            recommendations.push('Document may be corrupted or encrypted');
        }

        // Check readability
        const words = content.split(/\\s+/);
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

        if (avgWordLength > 15) {
            issues.push('Unusually long words detected');
            recommendations.push('Check for encoding issues');
        }

        // Determine quality
        let quality: 'excellent' | 'good' | 'fair' | 'poor';
        if (issues.length === 0 && content.length > 500) {
            quality = 'excellent';
        } else if (issues.length <= 1 && content.length > 200) {
            quality = 'good';
        } else if (issues.length <= 2 && content.length > 100) {
            quality = 'fair';
        } else {
            quality = 'poor';
        }

        return {
            isValid: issues.length === 0,
            quality,
            issues,
            recommendations
        };
    }

    /**
     * Get processing statistics
     */
    getProcessingStats(result: WordProcessingResult) {
        if (!result.success || !result.metadata) {
            return null;
        }

        return {
            fileName: result.metadata.fileName,
            fileSize: `${(result.metadata.fileSize / 1024).toFixed(1)} KB`,
            wordCount: result.metadata.wordCount,
            characterCount: result.metadata.characterCount,
            sectionsFound: result.metadata.sections.length,
            extractionQuality: this.validateExtractedContent(result.extractedText).quality
        };
    }
}

// Export singleton instance
const wordDocumentAPI = new WordDocumentAPI();
export default wordDocumentAPI;