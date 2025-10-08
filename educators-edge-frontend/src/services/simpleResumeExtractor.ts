/**
 * Simple Resume Text Extractor
 * Extracts plain text from PDF and DOCX files without complex processing
 */

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractionResult {
    success: boolean;
    text: string;
    error?: string;
    metadata?: {
        pages?: number;
        wordCount?: number;
        fileType?: string;
    };
}

class SimpleResumeExtractor {
    /**
     * Extract text from any supported file type
     */
    async extractText(file: File): Promise<ExtractionResult> {
        const fileType = file.name.split('.').pop()?.toLowerCase();

        try {
            switch (fileType) {
                case 'pdf':
                    return await this.extractFromPDF(file);
                case 'docx':
                case 'doc':
                    return await this.extractFromDOCX(file);
                case 'txt':
                    return await this.extractFromTXT(file);
                default:
                    return {
                        success: false,
                        text: '',
                        error: `Unsupported file type: .${fileType}`
                    };
            }
        } catch (error: any) {
            console.error('Text extraction failed:', error);
            return {
                success: false,
                text: '',
                error: error.message || 'Failed to extract text from file'
            };
        }
    }

    /**
     * Extract text from PDF using PDF.js
     */
    private async extractFromPDF(file: File): Promise<ExtractionResult> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }

        return {
            success: true,
            text: fullText.trim(),
            metadata: {
                pages: pdf.numPages,
                wordCount: fullText.split(/\s+/).length,
                fileType: 'PDF'
            }
        };
    }

    /**
     * Extract text from DOCX using Mammoth
     */
    private async extractFromDOCX(file: File): Promise<ExtractionResult> {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        return {
            success: true,
            text: result.value,
            metadata: {
                wordCount: result.value.split(/\s+/).length,
                fileType: 'DOCX'
            }
        };
    }

    /**
     * Extract text from TXT file
     */
    private async extractFromTXT(file: File): Promise<ExtractionResult> {
        const text = await file.text();

        return {
            success: true,
            text: text,
            metadata: {
                wordCount: text.split(/\s+/).length,
                fileType: 'TXT'
            }
        };
    }

    /**
     * Validate file before extraction
     */
    validateFile(file: File): { valid: boolean; error?: string } {
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'File size exceeds 10MB limit' };
        }

        // Check file type
        const allowedTypes = ['pdf', 'docx', 'doc', 'txt'];
        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (!fileType || !allowedTypes.includes(fileType)) {
            return { valid: false, error: `Unsupported file type. Please upload PDF, DOCX, or TXT files.` };
        }

        return { valid: true };
    }
}

export default new SimpleResumeExtractor();
