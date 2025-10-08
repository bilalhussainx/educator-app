import mammoth from 'mammoth';
import JSZip from 'jszip';

interface EnhancedWordResult {
    text: string;
    html: string;
    metadata: {
        title?: string;
        author?: string;
        company?: string;
        creator?: string;
        lastModifiedBy?: string;
        created?: Date;
        modified?: Date;
        wordCount?: number;
        characterCount?: number;
    };
    structure: {
        sections: Array<{
            title: string;
            content: string;
            level: number;
            confidence: number;
        }>;
        styles: Array<{
            name: string;
            type: 'paragraph' | 'character' | 'table';
            usage: number;
        }>;
        formatting: {
            fonts: string[];
            hasTables: boolean;
            hasLists: boolean;
            hasImages: boolean;
            hasHeaders: boolean;
        };
    };
    quality: {
        extractionMethod: 'enhanced-mammoth' | 'docx-analysis' | 'hybrid';
        completeness: number;
        formattingPreserved: number;
        issues: string[];
    };
}

class EnhancedWordProcessor {
    private readonly enhancedStyleMap = [
        // Enhanced header mappings
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",

        // Professional resume styles
        "p[style-name='Name'] => h1.name:fresh",
        "p[style-name='Contact'] => p.contact:fresh",
        "p[style-name='Section Header'] => h2.section:fresh",
        "p[style-name='Job Title'] => h3.job-title:fresh",
        "p[style-name='Company'] => p.company:fresh",
        "p[style-name='Date Range'] => p.date-range:fresh",

        // Text formatting with semantic meaning
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Important'] => mark",
        "b => strong",
        "i => em",
        "u => u",

        // List mappings with better structure
        "ul => ul.resume-list:fresh",
        "ol => ol.resume-list:fresh",
        "li => li:fresh",

        // Table mappings for structured data
        "table => table.resume-table:fresh",
        "tr => tr:fresh",
        "td => td:fresh",
        "th => th:fresh",

        // Special formatting
        "p[style-name='Normal'] => p:fresh",
        "p[style-name='No Spacing'] => p.no-spacing:fresh",
        "p[style-name='Quote'] => blockquote:fresh",

        // Hyperlinks
        "hyperlink => a"
    ];

    async processWord(file: File): Promise<EnhancedWordResult> {
        console.log('📝 Starting enhanced Word processing:', file.name);

        const arrayBuffer = await file.arrayBuffer();

        // Try multiple extraction methods
        const results = await Promise.allSettled([
            this.extractWithEnhancedMammoth(arrayBuffer),
            this.extractWithDocxAnalysis(arrayBuffer)
        ]);

        // Select best result
        const bestResult = this.selectBestResult(results);

        console.log('✅ Enhanced Word processing complete:', {
            method: bestResult.quality.extractionMethod,
            textLength: bestResult.text.length,
            htmlLength: bestResult.html.length,
            completeness: bestResult.quality.completeness,
            sections: bestResult.structure.sections.length
        });

        return bestResult;
    }

    private async extractWithEnhancedMammoth(arrayBuffer: ArrayBuffer): Promise<EnhancedWordResult> {
        const options = {
            styleMap: this.enhancedStyleMap,
            includeDefaultStyleMap: true,
            includeEmbeddedStyleMap: true,
            convertImage: mammoth.images.imgElement((image: any) => {
                // Convert images to base64 data URLs for better preservation
                return image.read("base64").then((imageBuffer: string) => {
                    const mimeType = this.detectImageMimeType(image);
                    return {
                        src: `data:${mimeType};base64,${imageBuffer}`,
                        alt: image.altText || 'Resume Image'
                    };
                });
            }),
            // Remove transform for now to avoid compatibility issues
            // transformDocument can be added later if needed
        };

        // Extract both HTML and text
        const [htmlResult, textResult] = await Promise.all([
            mammoth.convertToHtml({ arrayBuffer }, options),
            mammoth.extractRawText({ arrayBuffer })
        ]);

        // DEBUG: Check if raw text extraction is preserving content
        console.log('🔍 WORD EXTRACTION DEBUG:', {
            rawTextLength: textResult.value.length,
            htmlLength: htmlResult.value.length,
            firstLine: textResult.value.split('\n')[0],
            lastLine: textResult.value.split('\n').slice(-1)[0],
            sampleRawText: textResult.value.substring(0, 500) + '...',
            extractionWarnings: textResult.messages?.length || 0,
            htmlWarnings: htmlResult.messages?.length || 0
        });

        // Extract document metadata
        const metadata = await this.extractDocumentMetadata(arrayBuffer);

        // Analyze document structure
        const structure = await this.analyzeDocumentStructure(htmlResult.value, textResult.value);

        // Convert HTML to enhanced plain text
        const enhancedText = this.convertHtmlToEnhancedText(htmlResult.value);

        // Assess quality
        const quality = this.assessExtractionQuality(
            enhancedText,
            htmlResult.value,
            'enhanced-mammoth',
            htmlResult.messages
        );

        return {
            text: enhancedText,
            html: htmlResult.value,
            metadata,
            structure,
            quality
        };
    }

    private async extractWithDocxAnalysis(arrayBuffer: ArrayBuffer): Promise<EnhancedWordResult> {
        // Direct DOCX XML analysis for better structure understanding
        const zip = new JSZip();
        const docx = await zip.loadAsync(arrayBuffer);

        // Extract document.xml for content analysis
        const documentXml = await docx.file('word/document.xml')?.async('text');
        const stylesXml = await docx.file('word/styles.xml')?.async('text');
        const coreXml = await docx.file('docProps/core.xml')?.async('text');

        if (!documentXml) {
            throw new Error('Invalid DOCX file - missing document.xml');
        }

        // Parse XML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(documentXml, 'text/xml');
        const stylesDoc = stylesXml ? parser.parseFromString(stylesXml, 'text/xml') : null;
        const coreDoc = coreXml ? parser.parseFromString(coreXml, 'text/xml') : null;

        // Extract text with structure
        const { text, structure } = this.extractTextFromDocxXml(doc, stylesDoc);

        // Extract metadata from core properties
        const metadata = this.extractMetadataFromCore(coreDoc);

        // Create basic HTML representation
        const html = this.createHtmlFromStructure(structure);

        // Quality assessment
        const quality = this.assessExtractionQuality(text, html, 'docx-analysis', []);

        return {
            text,
            html,
            metadata,
            structure: {
                sections: structure.sections,
                styles: structure.styles,
                formatting: structure.formatting
            },
            quality
        };
    }

    private enhanceElementForResume(element: any): any {
        // Detect and enhance resume-specific elements
        const text = element.children?.[0]?.text || '';

        // Detect section headers
        if (this.isLikelySectionHeader(text)) {
            return {
                ...element,
                styleName: 'Section Header',
                properties: {
                    ...element.properties,
                    bold: true
                }
            };
        }

        // Detect job titles and companies
        if (this.isLikelyJobTitle(text)) {
            return {
                ...element,
                styleName: 'Job Title',
                properties: {
                    ...element.properties,
                    bold: true
                }
            };
        }

        return element;
    }

    private isLikelySectionHeader(text: string): boolean {
        const sectionKeywords = [
            'summary', 'objective', 'profile', 'about',
            'experience', 'employment', 'work', 'career',
            'education', 'academic', 'qualifications',
            'skills', 'technical', 'competencies',
            'projects', 'portfolio', 'achievements',
            'certifications', 'awards', 'publications',
            'volunteer', 'languages', 'references'
        ];

        const cleanText = text.toLowerCase().trim();
        return cleanText.length < 50 &&
               sectionKeywords.some(keyword =>
                   cleanText === keyword ||
                   cleanText.includes(keyword) && cleanText.length < keyword.length + 10
               );
    }

    private isLikelyJobTitle(text: string): boolean {
        const jobTitlePatterns = [
            /^[A-Z][a-z\s]+(Manager|Director|Engineer|Analyst|Specialist|Coordinator|Assistant|Lead|Developer|Designer|Consultant)$/,
            /^(Senior|Junior|Lead|Principal|Staff)\s+[A-Z][a-z\s]+$/,
            /^[A-Z][a-z\s]+(at|@)\s+[A-Z][a-zA-Z\s&.,-]+$/
        ];

        return jobTitlePatterns.some(pattern => pattern.test(text.trim()));
    }

    private async extractDocumentMetadata(arrayBuffer: ArrayBuffer): Promise<EnhancedWordResult['metadata']> {
        try {
            const zip = new JSZip();
            const docx = await zip.loadAsync(arrayBuffer);

            // Core properties
            const coreXml = await docx.file('docProps/core.xml')?.async('text');
            const appXml = await docx.file('docProps/app.xml')?.async('text');

            const metadata: EnhancedWordResult['metadata'] = {};

            if (coreXml) {
                const parser = new DOMParser();
                const coreDoc = parser.parseFromString(coreXml, 'text/xml');

                metadata.title = coreDoc.querySelector('title')?.textContent || undefined;
                metadata.author = coreDoc.querySelector('creator')?.textContent || undefined;
                metadata.lastModifiedBy = coreDoc.querySelector('lastModifiedBy')?.textContent || undefined;

                const created = coreDoc.querySelector('created')?.textContent;
                const modified = coreDoc.querySelector('modified')?.textContent;

                if (created) metadata.created = new Date(created);
                if (modified) metadata.modified = new Date(modified);
            }

            if (appXml) {
                const parser = new DOMParser();
                const appDoc = parser.parseFromString(appXml, 'text/xml');

                metadata.company = appDoc.querySelector('Company')?.textContent || undefined;

                const words = appDoc.querySelector('Words')?.textContent;
                const characters = appDoc.querySelector('Characters')?.textContent;

                if (words) metadata.wordCount = parseInt(words);
                if (characters) metadata.characterCount = parseInt(characters);
            }

            return metadata;
        } catch (error) {
            console.warn('Failed to extract document metadata:', error);
            return {};
        }
    }

    private async analyzeDocumentStructure(html: string, text: string): Promise<EnhancedWordResult['structure']> {
        const structure: EnhancedWordResult['structure'] = {
            sections: [],
            styles: [],
            formatting: {
                fonts: [],
                hasTables: false,
                hasLists: false,
                hasImages: false,
                hasHeaders: false
            }
        };

        // Parse HTML to analyze structure
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract sections
        structure.sections = this.extractSectionsFromHtml(doc);

        // Analyze formatting
        structure.formatting.hasTables = doc.querySelectorAll('table').length > 0;
        structure.formatting.hasLists = doc.querySelectorAll('ul, ol').length > 0;
        structure.formatting.hasImages = doc.querySelectorAll('img').length > 0;
        structure.formatting.hasHeaders = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;

        // Extract font information (basic)
        const fontElements = doc.querySelectorAll('[style*="font-family"]');
        const fonts = new Set<string>();
        fontElements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const fontMatch = style.match(/font-family:\s*([^;]+)/);
            if (fontMatch) {
                fonts.add(fontMatch[1].replace(/['"]/g, '').trim());
            }
        });
        structure.formatting.fonts = Array.from(fonts);

        return structure;
    }

    private extractSectionsFromHtml(doc: Document): EnhancedWordResult['structure']['sections'] {
        const sections: EnhancedWordResult['structure']['sections'] = [];

        // Find headers that likely represent sections
        const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, .section, .job-title');

        headers.forEach((header, index) => {
            const title = header.textContent?.trim() || '';
            const level = this.getHeaderLevel(header);

            // Extract content until next header of same or higher level
            const content = this.extractContentUntilNextHeader(header, level);

            if (title && this.isLikelySectionHeader(title)) {
                sections.push({
                    title,
                    content,
                    level,
                    confidence: this.calculateSectionConfidence(title, content)
                });
            }
        });

        return sections;
    }

    private getHeaderLevel(element: Element): number {
        const tagName = element.tagName.toLowerCase();
        if (tagName.match(/^h[1-6]$/)) {
            return parseInt(tagName.charAt(1));
        }
        if (element.classList.contains('section')) return 2;
        if (element.classList.contains('job-title')) return 3;
        return 2; // Default
    }

    private extractContentUntilNextHeader(startElement: Element, currentLevel: number): string {
        let content = '';
        let nextElement = startElement.nextElementSibling;

        while (nextElement) {
            const nextLevel = this.getHeaderLevel(nextElement);

            // Stop if we hit a header of same or higher level
            if (nextElement.tagName.match(/^H[1-6]$/i) && nextLevel <= currentLevel) {
                break;
            }

            if (nextElement.classList.contains('section') ||
                nextElement.classList.contains('job-title')) {
                break;
            }

            content += nextElement.textContent || '';
            nextElement = nextElement.nextElementSibling;
        }

        return content.trim();
    }

    private calculateSectionConfidence(title: string, content: string): number {
        let confidence = 0.5;

        const sectionKeywords = [
            'summary', 'objective', 'experience', 'education',
            'skills', 'projects', 'achievements', 'certifications'
        ];

        // Check if title matches known section types
        if (sectionKeywords.some(keyword =>
            title.toLowerCase().includes(keyword))) {
            confidence += 0.3;
        }

        // Check content length and quality
        if (content.length > 50) confidence += 0.1;
        if (content.length > 200) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    private extractTextFromDocxXml(doc: Document, stylesDoc: Document | null): { text: string; structure: any } {
        const paragraphs = doc.querySelectorAll('w\\:p, p');
        let text = '';
        const sections: any[] = [];
        const styles: any[] = [];

        paragraphs.forEach(para => {
            const paraText = this.extractTextFromParagraph(para);
            if (paraText.trim()) {
                text += paraText + '\n';

                // Check if paragraph is a section header
                if (this.isLikelySectionHeader(paraText)) {
                    sections.push({
                        title: paraText.trim(),
                        content: '',
                        level: 2,
                        confidence: 0.8
                    });
                }
            }
        });

        return {
            text: text.trim(),
            structure: {
                sections,
                styles,
                formatting: {
                    fonts: [],
                    hasTables: doc.querySelectorAll('w\\:tbl, tbl').length > 0,
                    hasLists: doc.querySelectorAll('w\\:numPr, numPr').length > 0,
                    hasImages: doc.querySelectorAll('w\\:drawing, drawing').length > 0,
                    hasHeaders: sections.length > 0
                }
            }
        };
    }

    private extractTextFromParagraph(para: Element): string {
        const runs = para.querySelectorAll('w\\:r, r');
        let text = '';

        runs.forEach(run => {
            const textElements = run.querySelectorAll('w\\:t, t');
            textElements.forEach(textEl => {
                text += textEl.textContent || '';
            });
        });

        return text;
    }

    private extractMetadataFromCore(coreDoc: Document | null): EnhancedWordResult['metadata'] {
        if (!coreDoc) return {};

        return {
            title: coreDoc.querySelector('title')?.textContent || undefined,
            author: coreDoc.querySelector('creator')?.textContent || undefined,
            lastModifiedBy: coreDoc.querySelector('lastModifiedBy')?.textContent || undefined,
            created: this.parseDate(coreDoc.querySelector('created')?.textContent),
            modified: this.parseDate(coreDoc.querySelector('modified')?.textContent)
        };
    }

    private parseDate(dateString: string | null | undefined): Date | undefined {
        if (!dateString) return undefined;
        try {
            return new Date(dateString);
        } catch {
            return undefined;
        }
    }

    private createHtmlFromStructure(structure: any): string {
        let html = '<div class="resume-content">';

        structure.sections.forEach((section: any) => {
            html += `<h${section.level} class="section-header">${section.title}</h${section.level}>`;
            if (section.content) {
                html += `<div class="section-content">${section.content}</div>`;
            }
        });

        html += '</div>';
        return html;
    }

    private convertHtmlToEnhancedText(html: string): string {
        // Enhanced HTML to text conversion with better formatting
        return html
            // Handle headers with visual hierarchy
            .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n\n📋 $1\n' + '═'.repeat(30) + '\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n\n📋 $1\n' + '━'.repeat(25) + '\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n\n▶ $1\n' + '─'.repeat(15) + '\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gis, '\n\n• $1\n')

            // Enhanced list formatting
            .replace(/<ul[^>]*>/gi, '\n')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<ol[^>]*>/gi, '\n')
            .replace(/<\/ol>/gi, '\n')
            .replace(/<li[^>]*>(.*?)<\/li>/gis, '  • $1\n')

            // Table formatting with borders
            .replace(/<table[^>]*>/gi, '\n┌─ TABLE ─┐\n')
            .replace(/<\/table>/gi, '\n└─────────┘\n')
            .replace(/<tr[^>]*>/gi, '')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<td[^>]*>(.*?)<\/td>/gis, '│ $1 ')
            .replace(/<th[^>]*>(.*?)<\/th>/gis, '│ **$1** ')

            // Enhanced text formatting
            .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
            .replace(/<u[^>]*>(.*?)<\/u>/gis, '_$1_')
            .replace(/<mark[^>]*>(.*?)<\/mark>/gis, '===$1===')

            // Links and contact info
            .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '$2 ($1)')

            // Paragraphs and line breaks
            .replace(/<p[^>]*>(.*?)<\/p>/gis, '\n$1\n')
            .replace(/<br[^>]*\/?>/gi, '\n')
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '\n')

            // Remove remaining HTML tags
            .replace(/<[^>]*>/g, '')

            // Enhanced text cleanup
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&lsquo;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')

            // Final formatting
            .replace(/[ \t]+/g, ' ')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private detectImageMimeType(image: any): string {
        // Basic MIME type detection for images
        const contentType = image.contentType;
        if (contentType) return contentType;

        // Fallback based on common patterns
        return 'image/png'; // Default fallback
    }

    private assessExtractionQuality(
        text: string,
        html: string,
        method: EnhancedWordResult['quality']['extractionMethod'],
        messages: any[]
    ): EnhancedWordResult['quality'] {
        const issues: string[] = [];
        let completeness = 1.0;
        let formattingPreserved = 1.0;

        // Check extraction completeness
        if (text.length < 100) {
            issues.push('Very short text - possible extraction failure');
            completeness *= 0.3;
        }

        // Check formatting preservation
        if (html.length < text.length * 0.5) {
            issues.push('Limited HTML structure - formatting may be lost');
            formattingPreserved *= 0.7;
        }

        // Check for mammoth messages (warnings/errors)
        if (messages && messages.length > 0) {
            const warnings = messages.filter(m => m.type === 'warning').length;
            const errors = messages.filter(m => m.type === 'error').length;

            if (errors > 0) {
                issues.push(`${errors} extraction errors encountered`);
                completeness *= 0.8;
            }

            if (warnings > 5) {
                issues.push(`${warnings} extraction warnings`);
                formattingPreserved *= 0.9;
            }
        }

        // Check for common extraction issues
        if (text.includes('undefined') || text.includes('null')) {
            issues.push('Contains undefined values');
            completeness *= 0.9;
        }

        return {
            extractionMethod: method,
            completeness: Math.max(0, completeness),
            formattingPreserved: Math.max(0, formattingPreserved),
            issues
        };
    }

    private selectBestResult(results: PromiseSettledResult<EnhancedWordResult>[]): EnhancedWordResult {
        const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<EnhancedWordResult> =>
                result.status === 'fulfilled'
            )
            .map(result => result.value);

        if (successfulResults.length === 0) {
            throw new Error('All Word extraction methods failed');
        }

        // Score results
        const scoredResults = successfulResults.map(result => {
            const score = (result.quality.completeness * 0.5) +
                         (result.quality.formattingPreserved * 0.3) +
                         (result.structure.sections.length * 0.1) +
                         (result.html.length > 0 ? 0.1 : 0);

            return { result, score };
        });

        scoredResults.sort((a, b) => b.score - a.score);

        console.log('📊 Word extraction comparison:',
            scoredResults.map(r => ({
                method: r.result.quality.extractionMethod,
                score: r.score.toFixed(3),
                completeness: r.result.quality.completeness.toFixed(3),
                sections: r.result.structure.sections.length,
                textLength: r.result.text.length,
                firstLine: r.result.text.split('\n')[0],
                preservedOriginal: r.result.text.length > 100 // Basic sanity check
            }))
        );

        return scoredResults[0].result;
    }

    // Validation method
    validateWord(file: File): { valid: boolean; error?: string } {
        const maxSize = 50 * 1024 * 1024; // 50MB

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `Word file too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`
            };
        }

        const validTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const validExtensions = ['.doc', '.docx'];

        const hasValidType = validTypes.includes(file.type);
        const hasValidExtension = validExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidType && !hasValidExtension) {
            return {
                valid: false,
                error: 'Invalid Word document format'
            };
        }

        return { valid: true };
    }
}

export default new EnhancedWordProcessor();
export type { EnhancedWordResult };