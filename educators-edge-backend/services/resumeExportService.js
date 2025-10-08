/**
 * Resume Export Service
 * High-fidelity PDF and DOCX export with full formatting preservation
 * Uses Puppeteer for PDF generation to maintain all CSS styling
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate complete HTML document with embedded styles
 * Enhanced to preserve all inline styles and formatting
 */
const generateCompleteHTML = (htmlContent, template) => {
    const templateStyles = template ? `
        body {
            font-family: ${template.fonts?.body || 'Arial, sans-serif'};
            color: ${template.colors?.primary || '#000000'};
            margin: 0;
            padding: 40px;
            background: white;
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: ${template.fonts?.heading || 'Arial, sans-serif'};
            color: ${template.colors?.primary || '#000000'};
        }
        h1 {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
        }
        h2 {
            font-size: 18px;
            font-weight: bold;
            color: ${template.colors?.accent || '#2563eb'};
            border-bottom: 2px solid ${template.colors?.accent || '#2563eb'};
            padding-bottom: 5px;
            margin: 20px 0 15px 0;
        }
        h3 {
            font-size: 14px;
            font-weight: bold;
            margin: 12px 0 8px 0;
        }
        p {
            margin: 8px 0;
            line-height: 1.6;
        }
        ul, ol {
            margin: 8px 0;
            padding-left: 20px;
        }
        li {
            margin: 6px 0;
            line-height: 1.5;
        }
        strong, b {
            font-weight: bold;
        }
        em, i {
            font-style: italic;
        }
        u {
            text-decoration: underline;
        }
        .resume-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid ${template.colors?.accent || '#2563eb'};
            padding-bottom: 20px;
        }
        .resume-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .contact-info {
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
        }
    ` : `
        body {
            font-family: Arial, sans-serif;
            color: #000000;
            margin: 0;
            padding: 40px;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        h1 { font-size: 28px; font-weight: bold; margin: 0 0 10px 0; }
        h2 {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 5px;
            margin: 20px 0 15px 0;
        }
        h3 { font-size: 14px; font-weight: bold; margin: 12px 0 8px 0; }
        p { margin: 8px 0; line-height: 1.6; }
        ul, ol { margin: 8px 0; padding-left: 20px; }
        li { margin: 6px 0; line-height: 1.5; }
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        u { text-decoration: underline; }
        .resume-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }
        .resume-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .contact-info {
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
        }
    `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume</title>
    <style>
        * {
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        @media print {
            body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .page-break {
                page-break-before: always;
            }
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }

        ${templateStyles}

        /* CRITICAL: Do NOT override inline styles - they take precedence */
        /* Remove the !important rules that were breaking inline styles */
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `;
};

/**
 * Export resume to PDF with full formatting
 */
const exportToPDF = async (htmlContent, template = null, options = {}) => {
    console.log('[EXPORT SERVICE] Generating PDF...');

    let browser;
    try {
        // Generate complete HTML document
        const completeHTML = generateCompleteHTML(htmlContent, template);

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set content with proper encoding
        await page.setContent(completeHTML, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Generate PDF with high quality settings
        const pdfBuffer = await page.pdf({
            format: options.format || 'A4',
            printBackground: true,
            margin: {
                top: options.margin?.top || '0.5in',
                right: options.margin?.right || '0.5in',
                bottom: options.margin?.bottom || '0.5in',
                left: options.margin?.left || '0.5in'
            },
            preferCSSPageSize: false,
            displayHeaderFooter: false
        });

        console.log('[EXPORT SERVICE] PDF generated successfully:', pdfBuffer.length, 'bytes');

        return {
            success: true,
            buffer: pdfBuffer,
            mimeType: 'application/pdf',
            filename: `resume-${Date.now()}.pdf`
        };

    } catch (error) {
        console.error('[EXPORT SERVICE] PDF generation failed:', error);
        throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Export resume to DOCX with enhanced formatting preservation
 */
const exportToDOCX = async (htmlContent, template = null) => {
    console.log('[EXPORT SERVICE] Generating Word-compatible DOCX...');
    console.log('[EXPORT SERVICE] HTML content length:', htmlContent.length);
    console.log('[EXPORT SERVICE] HTML preview:', htmlContent.substring(0, 500));

    try {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } = require('docx');
        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);

        // Parse HTML using Cheerio for better style extraction
        const sections = [];

        const processElement = (element, parentFormatting = {}) => {
            const $el = $(element);
            const tagName = element.tagName;
            const styleAttr = $el.attr('style') || '';
            const classAttr = $el.attr('class') || '';

            // Extract formatting from inline styles
            const formatting = {
                bold: tagName === 'strong' || tagName === 'b' ||
                      styleAttr.match(/font-weight:\s*(bold|700|800|900)/i) ||
                      classAttr.includes('font-bold'),
                italic: tagName === 'em' || tagName === 'i' ||
                       styleAttr.match(/font-style:\s*italic/i) ||
                       classAttr.includes('italic'),
                underline: tagName === 'u' ||
                          styleAttr.match(/text-decoration:\s*underline/i) ||
                          classAttr.includes('underline'),
                size: extractFontSize(styleAttr),
                color: extractColor(styleAttr),
                font: extractFontFamily(styleAttr),
                align: extractAlignment(styleAttr),
                ...parentFormatting
            };

            return formatting;
        };

        const extractTextRuns = ($el, parentFormatting = {}) => {
            const runs = [];

            $el.contents().each((i, node) => {
                if (node.type === 'text') {
                    const text = $(node).text();
                    if (text.trim()) {
                        runs.push({
                            text: text,
                            formatting: parentFormatting
                        });
                    }
                } else if (node.type === 'tag') {
                    const formatting = processElement(node, parentFormatting);
                    runs.push(...extractTextRuns($(node), formatting));
                }
            });

            return runs;
        };

        // Process all elements
        $('body, body > *').each((i, element) => {
            const $el = $(element);
            const tagName = element.tagName;

            if (!tagName) return;

            const formatting = processElement(element);
            const textRuns = extractTextRuns($el, formatting);

            if (textRuns.length === 0) return;

            let sectionType = 'paragraph';
            if (tagName === 'h1') sectionType = 'heading1';
            else if (tagName === 'h2') sectionType = 'heading2';
            else if (tagName === 'h3') sectionType = 'heading3';
            else if (tagName === 'li') sectionType = 'bullet';
            else if (tagName === 'p' || tagName === 'div') sectionType = 'paragraph';

            sections.push({
                type: sectionType,
                runs: textRuns,
                formatting: formatting
            });
        });

        // Fallback: if no sections found, extract plain text
        if (sections.length === 0) {
            console.log('[EXPORT SERVICE] No sections found, using plain text extraction...');

            const text = $.text().trim();
            if (text) {
                sections.push({
                    type: 'paragraph',
                    runs: [{ text: text, formatting: {} }],
                    formatting: {}
                });
            }
        }

        console.log(`[EXPORT SERVICE] Parsed ${sections.length} sections for DOCX`);

        // Create Word document with enhanced formatting
        const paragraphs = sections.map(section => {
            const textRuns = section.runs && section.runs.length > 0
                ? section.runs.map(run => new TextRun({
                    text: run.text || '',
                    bold: run.formatting?.bold || false,
                    italics: run.formatting?.italic || false,
                    underline: run.formatting?.underline ? { type: UnderlineType.SINGLE } : undefined,
                    size: run.formatting?.size || 24, // 12pt default
                    color: run.formatting?.color || '000000',
                    font: run.formatting?.font || 'Arial'
                }))
                : [new TextRun({ text: '' })];

            const alignment = section.formatting?.align || AlignmentType.LEFT;

            if (section.type === 'heading1') {
                return new Paragraph({
                    children: textRuns,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                    alignment
                });
            } else if (section.type === 'heading2') {
                return new Paragraph({
                    children: textRuns,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                    alignment
                });
            } else if (section.type === 'heading3') {
                return new Paragraph({
                    children: textRuns,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 160, after: 80 },
                    alignment
                });
            } else if (section.type === 'bullet') {
                return new Paragraph({
                    children: textRuns,
                    bullet: { level: 0 },
                    spacing: { before: 60, after: 60 },
                    alignment
                });
            } else {
                return new Paragraph({
                    children: textRuns,
                    spacing: { before: 100, after: 100 },
                    alignment
                });
            }
        });

        // Create the document
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 720,    // 0.5 inch
                            right: 720,
                            bottom: 720,
                            left: 720
                        }
                    }
                },
                children: paragraphs.length > 0 ? paragraphs : [
                    new Paragraph({ text: 'Resume content could not be parsed' })
                ]
            }]
        });

        const docxBuffer = await Packer.toBuffer(doc);

        console.log('[EXPORT SERVICE] DOCX generated successfully:', docxBuffer.length, 'bytes');

        return {
            success: true,
            buffer: docxBuffer,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename: `resume-${Date.now()}.docx`
        };

    } catch (error) {
        console.error('[EXPORT SERVICE] DOCX generation failed:', error);
        console.error('[EXPORT SERVICE] Error details:', error.stack);

        // Fallback to RTF
        const rtfContent = convertHTMLToRTF(htmlContent);
        const rtfBuffer = Buffer.from(rtfContent, 'utf-8');

        return {
            success: true,
            buffer: rtfBuffer,
            mimeType: 'application/rtf',
            filename: `resume-${Date.now()}.rtf`
        };
    }
};

// Helper functions for parsing styles
const extractFontSize = (style) => {
    // Try to extract font size in pt
    let match = style.match(/font-size:\s*(\d+)pt/);
    if (match) return parseInt(match[1]) * 2; // Convert to half-points

    // Try to extract font size in px
    match = style.match(/font-size:\s*(\d+)px/);
    if (match) {
        const px = parseInt(match[1]);
        return Math.round((px * 72) / 96) * 2; // Convert px to pt, then to half-points
    }

    return 24; // Default 12pt
};

const extractColor = (style) => {
    // Try hex color
    let match = style.match(/color:\s*#([0-9a-fA-F]{6})/);
    if (match) return match[1];

    // Try rgb color
    match = style.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return r + g + b;
    }

    return '000000'; // Default black
};

const extractFontFamily = (style) => {
    const match = style.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    if (match) {
        // Return first font in the family list
        return match[1].split(',')[0].trim().replace(/['"]/g, '');
    }
    return null;
};

const extractAlignment = (style) => {
    const { AlignmentType } = require('docx');
    const match = style.match(/text-align:\s*(\w+)/);
    if (match) {
        const align = match[1].toLowerCase();
        switch (align) {
            case 'center': return AlignmentType.CENTER;
            case 'right': return AlignmentType.RIGHT;
            case 'justify': return AlignmentType.JUSTIFIED;
            default: return AlignmentType.LEFT;
        }
    }
    return AlignmentType.LEFT;
};

/**
 * Simple HTML to RTF converter (fallback)
 */
const convertHTMLToRTF = (html) => {
    // Strip HTML tags and create basic RTF
    let text = html
        .replace(/<style[^>]*>.*?<\/style>/gs, '')
        .replace(/<script[^>]*>.*?<\/script>/gs, '')
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\\b\\fs32 $1\\b0\\fs24\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\\b\\fs28 $1\\b0\\fs24\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\\b $1\\b0\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\b $1\\b0')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\b $1\\b0')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\i $1\\i0')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\i $1\\i0')
        .replace(/<br\s*\/?>/gi, '\\line ')
        .replace(/<\/p>/gi, '\\par ')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\bullet $1\\par ')
        .replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\f0\\fs24
${text}
}`;
};

/**
 * Export resume to HTML file
 */
const exportToHTML = async (htmlContent, template = null) => {
    console.log('[EXPORT SERVICE] Generating HTML...');

    try {
        const completeHTML = generateCompleteHTML(htmlContent, template);
        const htmlBuffer = Buffer.from(completeHTML, 'utf-8');

        return {
            success: true,
            buffer: htmlBuffer,
            mimeType: 'text/html',
            filename: `resume-${Date.now()}.html`
        };

    } catch (error) {
        console.error('[EXPORT SERVICE] HTML generation failed:', error);
        throw new Error(`Failed to generate HTML: ${error.message}`);
    }
};

/**
 * Main export function
 */
const exportResume = async (htmlContent, format, template = null, options = {}) => {
    console.log('[EXPORT SERVICE] Exporting resume as', format);

    switch (format.toLowerCase()) {
        case 'pdf':
            return await exportToPDF(htmlContent, template, options);

        case 'docx':
        case 'doc':
            return await exportToDOCX(htmlContent, template);

        case 'html':
            return await exportToHTML(htmlContent, template);

        default:
            throw new Error(`Unsupported export format: ${format}`);
    }
};

module.exports = {
    exportResume,
    exportToPDF,
    exportToDOCX,
    exportToHTML
};
