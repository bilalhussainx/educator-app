import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with improved settings
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
} catch (error) {
    console.warn('Failed to load PDF.js worker from CDN, using fallback');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

interface EnhancedPdfResult {
    text: string;
    pages: number;
    metadata: {
        title?: string;
        author?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date;
        modificationDate?: Date;
    };
    structure: {
        sections: Array<{
            title: string;
            content: string;
            page: number;
            confidence: number;
        }>;
        fonts: Array<{
            name: string;
            size: number;
            frequency: number;
        }>;
        textBlocks: Array<{
            text: string;
            x: number;
            y: number;
            width: number;
            height: number;
            fontSize: number;
            fontName: string;
            page: number;
        }>;
    };
    quality: {
        extractionMethod: 'enhanced-pdfjs' | 'fallback-extraction' | 'hybrid';
        completeness: number; // 0-1 score
        readability: number; // 0-1 score
        issues: string[];
    };
}

class EnhancedPdfProcessor {
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000;

    async processPdf(file: File): Promise<EnhancedPdfResult> {
        console.log('🔍 Starting enhanced PDF processing:', file.name);

        const arrayBuffer = await file.arrayBuffer();

        // Use enhanced PDF.js extraction with automatic fallback
        const bestResult = await this.handleExtractionWithFallback(arrayBuffer);

        console.log('✅ Enhanced PDF processing complete:', {
            method: bestResult.quality.extractionMethod,
            pages: bestResult.pages,
            completeness: bestResult.quality.completeness,
            textLength: bestResult.text.length
        });

        return bestResult;
    }

    private async extractWithEnhancedPdfJs(arrayBuffer: ArrayBuffer): Promise<EnhancedPdfResult> {
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0, // Reduce console noise
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
        }).promise;

        const numPages = pdf.numPages;
        const metadata = await pdf.getMetadata().catch(() => ({ info: {}, metadata: null }));

        let fullText = '';
        const textBlocks: EnhancedPdfResult['structure']['textBlocks'] = [];
        const fontUsage = new Map<string, { size: number; count: number }>();
        const sections: EnhancedPdfResult['structure']['sections'] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent({
                includeMarkedContent: true
            });
            const viewport = page.getViewport({ scale: 1.0 });

            // Enhanced text extraction with positioning and font information
            const pageBlocks = this.processTextItems(textContent.items, viewport, pageNum);
            textBlocks.push(...pageBlocks);

            // Track font usage for section detection
            pageBlocks.forEach(block => {
                const fontKey = `${block.fontName}-${block.fontSize}`;
                const current = fontUsage.get(fontKey) || { size: block.fontSize, count: 0 };
                fontUsage.set(fontKey, { size: current.size, count: current.count + 1 });
            });

            // Extract page text with improved formatting
            const pageText = this.reconstructPageText(pageBlocks);

            // Detect sections on this page
            const pageSections = this.detectSections(pageText, pageNum, pageBlocks);
            sections.push(...pageSections);

            fullText += pageText;

            if (pageNum < numPages) {
                fullText += '\n\n--- Page Break ---\n\n';
            }

            // Progress logging for large PDFs
            if (pageNum % 5 === 0 || pageNum === numPages) {
                console.log(`📄 Enhanced processing page ${pageNum}/${numPages}`);
            }
        }

        // Analyze font usage for document structure
        const fonts = Array.from(fontUsage.entries())
            .map(([name, data]) => ({
                name: name.split('-')[0],
                size: data.size,
                frequency: data.count
            }))
            .sort((a, b) => b.frequency - a.frequency);

        // Apply final formatting
        const formattedText = this.enhancedTextFormatting(fullText, sections, fonts);

        // Quality assessment
        const quality = this.assessExtractionQuality(formattedText, textBlocks, 'enhanced-pdfjs');

        return {
            text: formattedText,
            pages: numPages,
            metadata: {
                title: (metadata.info as any)?.Title,
                author: (metadata.info as any)?.Author,
                creator: (metadata.info as any)?.Creator,
                producer: (metadata.info as any)?.Producer,
                creationDate: (metadata.info as any)?.CreationDate,
                modificationDate: (metadata.info as any)?.ModDate
            },
            structure: {
                sections,
                fonts,
                textBlocks
            },
            quality
        };
    }

    private async extractWithFallbackMethod(arrayBuffer: ArrayBuffer): Promise<EnhancedPdfResult> {
        // Browser-compatible fallback extraction
        try {
            // Try to read as a text-based PDF
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);

            // Look for text content between stream markers
            const textMatches = text.match(/BT[\s\S]*?ET/g) || [];
            let extractedText = '';

            textMatches.forEach(match => {
                // Basic text extraction from PDF text objects
                const textCommands = match.match(/\(([^)]+)\)/g);
                if (textCommands) {
                    textCommands.forEach(cmd => {
                        const content = cmd.slice(1, -1); // Remove parentheses
                        extractedText += content + ' ';
                    });
                }
            });

            if (extractedText.length < 50) {
                throw new Error('Insufficient text extracted from fallback method');
            }

            // Create basic structure
            const sections = this.detectBasicSections(extractedText);
            const textBlocks = this.createBasicTextBlocks(extractedText);
            const quality = this.assessExtractionQuality(extractedText, textBlocks, 'fallback-extraction');

            return {
                text: extractedText.trim(),
                pages: 1, // Can't determine page count with this method
                metadata: {},
                structure: {
                    sections,
                    fonts: [],
                    textBlocks
                },
                quality
            };
        } catch (error) {
            throw new Error('Fallback PDF extraction failed: ' + error);
        }
    }

    private processTextItems(items: any[], viewport: any, pageNum: number): EnhancedPdfResult['structure']['textBlocks'] {
        const blocks: EnhancedPdfResult['structure']['textBlocks'] = [];

        items.forEach((item: any) => {
            if (item.str && item.str.trim()) {
                const transform = item.transform;
                const x = transform[4];
                const y = viewport.height - transform[5]; // Convert to top-down coordinates
                const fontSize = Math.abs(transform[0]); // Font size from transform matrix

                blocks.push({
                    text: item.str,
                    x: x,
                    y: y,
                    width: item.width || 0,
                    height: item.height || fontSize,
                    fontSize: fontSize,
                    fontName: item.fontName || 'unknown',
                    page: pageNum
                });
            }
        });

        return blocks.sort((a, b) => a.y - b.y || a.x - b.x); // Sort by position
    }

    private reconstructPageText(blocks: EnhancedPdfResult['structure']['textBlocks']): string {
        if (blocks.length === 0) return '';

        // Group blocks by lines (similar Y coordinates)
        const lines: Array<EnhancedPdfResult['structure']['textBlocks']> = [];
        const lineThreshold = 5; // Pixels

        blocks.forEach(block => {
            let line = lines.find(l =>
                l.length > 0 && Math.abs(l[0].y - block.y) < lineThreshold
            );

            if (!line) {
                line = [];
                lines.push(line);
            }
            line.push(block);
        });

        // Sort lines by Y position and blocks within lines by X position
        lines.sort((a, b) => a[0].y - b[0].y);
        lines.forEach(line => line.sort((a, b) => a.x - b.x));

        // Reconstruct text with proper spacing
        let pageText = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let lineText = '';
            let lastX = 0;

            line.forEach((block, index) => {
                if (index > 0) {
                    const gap = block.x - lastX;
                    if (gap > 30) {
                        lineText += '   '; // Large gap
                    } else if (gap > 10) {
                        lineText += ' '; // Normal space
                    }
                }
                lineText += block.text;
                lastX = block.x + block.width;
            });

            pageText += lineText.trim() + '\n';

            // Add extra spacing for potential section breaks
            if (i < lines.length - 1) {
                const currentAvgFontSize = line.reduce((sum, b) => sum + b.fontSize, 0) / line.length;
                const nextAvgFontSize = lines[i + 1].reduce((sum, b) => sum + b.fontSize, 0) / lines[i + 1].length;
                const yGap = lines[i + 1][0].y - line[0].y;

                // Detect section breaks
                if (yGap > currentAvgFontSize * 2 || currentAvgFontSize > nextAvgFontSize * 1.2) {
                    pageText += '\n';
                }
            }
        }

        return pageText;
    }

    private detectSections(pageText: string, pageNum: number, blocks: EnhancedPdfResult['structure']['textBlocks']): EnhancedPdfResult['structure']['sections'] {
        const sections: EnhancedPdfResult['structure']['sections'] = [];
        const lines = pageText.split('\n');

        const avgFontSize = blocks.length > 0
            ? blocks.reduce((sum, b) => sum + b.fontSize, 0) / blocks.length
            : 12;

        const sectionKeywords = [
            'summary', 'objective', 'profile', 'about',
            'experience', 'employment', 'work', 'career',
            'education', 'academic', 'qualifications',
            'skills', 'technical', 'competencies',
            'projects', 'portfolio', 'achievements',
            'certifications', 'awards', 'publications'
        ];

        lines.forEach((line, index) => {
            const trimmed = line.trim().toLowerCase();

            // Check if line looks like a section header
            const isShort = trimmed.length > 2 && trimmed.length < 50;
            const hasKeyword = sectionKeywords.some(keyword =>
                trimmed.includes(keyword) || trimmed === keyword
            );

            // Check font size if we have block data for this line
            const lineBlocks = blocks.filter(b => {
                const blockLine = Math.floor(b.y / avgFontSize);
                return Math.abs(blockLine - index) <= 1;
            });

            const isLargeFont = lineBlocks.length > 0 &&
                lineBlocks.some(b => b.fontSize > avgFontSize * 1.1);

            if (isShort && (hasKeyword || isLargeFont)) {
                const confidence = hasKeyword ? 0.9 : 0.6;
                sections.push({
                    title: line.trim(),
                    content: '', // Will be filled by main processor
                    page: pageNum,
                    confidence
                });
            }
        });

        return sections;
    }

    private enhancedTextFormatting(text: string, sections: EnhancedPdfResult['structure']['sections'], fonts: EnhancedPdfResult['structure']['fonts']): string {
        let formatted = text;

        // Apply resume-specific formatting
        formatted = formatted
            // Clean up basic formatting
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')

            // Enhance section headers based on detected sections
            .replace(/^\s*(SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|WORK EXPERIENCE|EMPLOYMENT|CERTIFICATIONS|ACHIEVEMENTS|PROJECTS|CONTACT|QUALIFICATIONS|HIGHLIGHTS)\s*$/gim,
                '\n\n📋 $1\n' + '━'.repeat(25) + '\n')

            // Preserve contact information with icons
            .replace(/([\w._%+-]+@[\w.-]+\.[A-Z]{2,})/gi, '📧 $1')
            .replace(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g, '📞 $1')
            .replace(/(https?:\/\/[\w.-]+|www\.[\w.-]+)/gi, '🌐 $1')

            // Enhance bullet points
            .replace(/^[\s]*[•▪▫◦‣⁃]\s*/gm, '  • ')
            .replace(/^[\s]*[-*]\s+/gm, '  • ')

            // Enhance dates
            .replace(/(\d{4})\s*[-–—]\s*(\d{4}|present|current)/gi, '📅 $1 - $2')
            .replace(/(\w{3,9}\s+\d{4})\s*[-–—]\s*(\w{3,9}\s+\d{4}|present|current)/gi, '📅 $1 - $2')

            // Clean up excessive whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{4,}/g, '\n\n\n');

        return formatted.trim();
    }

    private detectBasicSections(text: string): EnhancedPdfResult['structure']['sections'] {
        const sections: EnhancedPdfResult['structure']['sections'] = [];
        const lines = text.split('\n');

        const sectionPatterns = [
            { pattern: /^\s*(summary|profile|objective|about)\s*:?\s*$/i, title: 'Professional Summary' },
            { pattern: /^\s*(experience|employment|work|career)\s*:?\s*$/i, title: 'Work Experience' },
            { pattern: /^\s*(education|academic|qualifications)\s*:?\s*$/i, title: 'Education' },
            { pattern: /^\s*(skills|technical|competencies)\s*:?\s*$/i, title: 'Skills' },
            { pattern: /^\s*(projects|portfolio)\s*:?\s*$/i, title: 'Projects' },
            { pattern: /^\s*(certifications|certificates)\s*:?\s*$/i, title: 'Certifications' }
        ];

        lines.forEach((line, index) => {
            sectionPatterns.forEach(({ pattern, title }) => {
                if (pattern.test(line.trim())) {
                    sections.push({
                        title,
                        content: '',
                        page: 1, // pdf-parse doesn't provide page info per line
                        confidence: 0.8
                    });
                }
            });
        });

        return sections;
    }

    private createBasicTextBlocks(text: string): EnhancedPdfResult['structure']['textBlocks'] {
        const blocks: EnhancedPdfResult['structure']['textBlocks'] = [];
        const lines = text.split('\n');

        lines.forEach((line, index) => {
            if (line.trim()) {
                blocks.push({
                    text: line,
                    x: 0,
                    y: index * 12, // Estimate line position
                    width: line.length * 6, // Estimate width
                    height: 12,
                    fontSize: 12,
                    fontName: 'unknown',
                    page: 1
                });
            }
        });

        return blocks;
    }

    private assessExtractionQuality(text: string, blocks: EnhancedPdfResult['structure']['textBlocks'], method: EnhancedPdfResult['quality']['extractionMethod']): EnhancedPdfResult['quality'] {
        const issues: string[] = [];
        let completeness = 1.0;
        let readability = 1.0;

        // Check text length
        if (text.length < 100) {
            issues.push('Very short text extracted - possible extraction failure');
            completeness *= 0.3;
        } else if (text.length < 500) {
            issues.push('Short text extracted - document may be incomplete');
            completeness *= 0.7;
        }

        // Check for common extraction issues
        if (text.includes('undefined') || text.includes('null')) {
            issues.push('Contains undefined/null values - partial extraction failure');
            completeness *= 0.8;
        }

        // Check readability
        const words = text.trim().split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        if (words < 50) {
            issues.push('Very few words extracted');
            readability *= 0.5;
        }

        // Check for formatting issues
        const lineBreaks = (text.match(/\n/g) || []).length;
        const wordLineRatio = words / Math.max(lineBreaks, 1);
        if (wordLineRatio < 3) {
            issues.push('Possible line break issues - text may be fragmented');
            readability *= 0.8;
        }

        // Check block quality (for enhanced methods)
        if (method === 'enhanced-pdfjs' && blocks.length === 0) {
            issues.push('No text blocks extracted - layout information missing');
            completeness *= 0.9;
        }

        return {
            extractionMethod: method,
            completeness: Math.max(0, completeness),
            readability: Math.max(0, readability),
            issues
        };
    }

    // Enhanced error handling with automatic fallback
    private async handleExtractionWithFallback(arrayBuffer: ArrayBuffer): Promise<EnhancedPdfResult> {
        try {
            // Try enhanced PDF.js first
            return await this.extractWithEnhancedPdfJs(arrayBuffer);
        } catch (pdfJsError) {
            console.warn('Enhanced PDF.js extraction failed, trying fallback:', pdfJsError.message);

            try {
                // Try fallback extraction method
                return await this.extractWithFallbackMethod(arrayBuffer);
            } catch (fallbackError) {
                console.error('All PDF extraction methods failed');

                // Return minimal result to avoid complete failure
                return {
                    text: 'PDF extraction failed. Please try a different file or convert to Word/text format.',
                    pages: 1,
                    metadata: {},
                    structure: {
                        sections: [],
                        fonts: [],
                        textBlocks: []
                    },
                    quality: {
                        extractionMethod: 'enhanced-pdfjs',
                        completeness: 0,
                        readability: 0,
                        issues: [
                            'Enhanced PDF.js failed: ' + pdfJsError.message,
                            'Fallback extraction failed: ' + fallbackError.message
                        ]
                    }
                };
            }
        }
    }

    // Utility method to validate PDF before processing
    validatePdf(file: File): { valid: boolean; error?: string } {
        const maxSize = 100 * 1024 * 1024; // 100MB limit

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `PDF file too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`
            };
        }

        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            return {
                valid: false,
                error: 'File is not a valid PDF'
            };
        }

        return { valid: true };
    }
}

export default new EnhancedPdfProcessor();
export type { EnhancedPdfResult };