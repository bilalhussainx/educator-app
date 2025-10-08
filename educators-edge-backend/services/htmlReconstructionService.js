/**
 * HTML Reconstruction Service
 * Reconstructs the visual appearance of the original document as HTML
 * This preserves the formatting for the "Preserved View" in the split-screen UI
 */

/**
 * Reconstruct HTML from Azure Vision elements
 * Creates a faithful visual representation of the original document
 */
const reconstructHTML = (elements, sections, formattingContext) => {
    console.log('[HTML RECONSTRUCTION] Starting HTML reconstruction...');

    const html = [];

    // Add CSS styles
    html.push(generateStyleSheet(formattingContext));

    // Add document container
    html.push('<div class="resume-preserved-view">');

    // Reconstruct by page
    const pages = groupElementsByPage(elements);

    pages.forEach((pageElements, pageIndex) => {
        html.push(`<div class="page" data-page="${pageIndex + 1}">`);

        // Group elements into logical blocks (lines)
        const lines = groupElementsIntoLines(pageElements);

        lines.forEach(line => {
            html.push(reconstructLine(line, formattingContext));
        });

        html.push('</div>'); // Close page
    });

    html.push('</div>'); // Close container

    console.log('[HTML RECONSTRUCTION] HTML reconstruction complete');

    return html.join('\n');
};

/**
 * Generate CSS stylesheet for the preserved view
 */
const generateStyleSheet = (formattingContext) => {
    const css = [];

    css.push('<style>');
    css.push('.resume-preserved-view {');
    css.push('  font-family: Arial, Helvetica, sans-serif;');
    css.push('  color: #000000;');
    css.push('  background: white;');
    css.push('  max-width: 8.5in;');
    css.push('  margin: 0 auto;');
    css.push('  padding: 20px;');
    css.push('}');

    css.push('.page {');
    css.push('  min-height: 11in;');
    css.push('  padding: 1in;');
    css.push('  background: white;');
    css.push('  box-shadow: 0 0 10px rgba(0,0,0,0.1);');
    css.push('  margin-bottom: 20px;');
    css.push('  position: relative;');
    css.push('}');

    css.push('.line {');
    css.push('  margin: 0;');
    css.push('  padding: 0;');
    css.push('  line-height: 1.4;');
    css.push('  position: relative;');
    css.push('}');

    css.push('.title {');
    css.push('  font-size: 24pt;');
    css.push('  font-weight: bold;');
    css.push('  margin-bottom: 8pt;');
    css.push('}');

    css.push('.section-header {');
    css.push('  font-size: 14pt;');
    css.push('  font-weight: bold;');
    css.push('  margin-top: 12pt;');
    css.push('  margin-bottom: 6pt;');
    css.push('  border-bottom: 1px solid #333;');
    css.push('  text-transform: uppercase;');
    css.push('}');

    css.push('.job-title {');
    css.push('  font-weight: bold;');
    css.push('  font-size: 12pt;');
    css.push('  margin-top: 8pt;');
    css.push('}');

    css.push('.company {');
    css.push('  font-style: italic;');
    css.push('  font-size: 11pt;');
    css.push('}');

    css.push('.date {');
    css.push('  font-size: 10pt;');
    css.push('  color: #666;');
    css.push('}');

    css.push('.bullet-point {');
    css.push('  margin-left: 20pt;');
    css.push('  margin-top: 4pt;');
    css.push('  margin-bottom: 4pt;');
    css.push('}');

    css.push('.contact-info {');
    css.push('  font-size: 10pt;');
    css.push('  text-align: center;');
    css.push('  margin-bottom: 4pt;');
    css.push('}');

    css.push('.bold { font-weight: bold; }');
    css.push('.italic { font-style: italic; }');
    css.push('.underline { text-decoration: underline; }');

    // Add font size classes from formatting context
    if (formattingContext?.typography?.fontHierarchy?.sizes) {
        formattingContext.typography.fontHierarchy.sizes.forEach((size, index) => {
            css.push(`.font-size-${size} { font-size: ${size}pt; }`);
        });
    }

    css.push('</style>');

    return css.join('\n');
};

/**
 * Group elements by page
 */
const groupElementsByPage = (elements) => {
    const pages = {};

    elements.forEach(element => {
        const page = element.boundingBox.page;
        if (!pages[page]) {
            pages[page] = [];
        }
        pages[page].push(element);
    });

    // Sort elements within each page by position
    Object.values(pages).forEach(pageElements => {
        pageElements.sort((a, b) => {
            if (Math.abs(a.boundingBox.y - b.boundingBox.y) < 5) {
                return a.boundingBox.x - b.boundingBox.x;
            }
            return a.boundingBox.y - b.boundingBox.y;
        });
    });

    return Object.values(pages);
};

/**
 * Group elements into visual lines
 */
const groupElementsIntoLines = (elements) => {
    const lines = [];
    let currentLine = [];
    let currentY = -1;

    // Use paragraph elements first, fall back to word grouping
    const paragraphs = elements.filter(el => el.sourceType === 'paragraph');
    const words = elements.filter(el => el.sourceType === 'word');

    if (paragraphs.length > 0) {
        // Use paragraphs as lines
        return paragraphs.map(p => [p]);
    }

    // Group words into lines by Y position
    words.forEach(element => {
        const y = Math.round(element.boundingBox.y);

        if (currentY === -1 || Math.abs(y - currentY) < 5) {
            // Same line
            currentLine.push(element);
            currentY = y;
        } else {
            // New line
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
            currentLine = [element];
            currentY = y;
        }
    });

    // Add last line
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines;
};

/**
 * Reconstruct a single line of text
 */
const reconstructLine = (lineElements, formattingContext) => {
    if (lineElements.length === 0) return '';

    // Determine line type from first element
    const firstElement = lineElements[0];
    const lineType = firstElement.type;

    // Build line content
    const content = lineElements.map(el => el.text).join(' ');

    // Get formatting from first element
    const formatting = firstElement.formatting;

    // Build CSS classes
    const classes = ['line', lineType];
    if (formatting.isBold) classes.push('bold');
    if (formatting.isItalic) classes.push('italic');
    if (formatting.isUnderlined) classes.push('underline');
    classes.push(`font-size-${formatting.fontSize}`);

    // Calculate spacing
    const marginTop = calculateMarginTop(firstElement, lineElements);
    const marginLeft = calculateMarginLeft(firstElement);

    // Build inline styles
    const styles = [];
    if (marginTop > 0) styles.push(`margin-top: ${marginTop}pt`);
    if (marginLeft > 0) styles.push(`margin-left: ${marginLeft}pt`);
    if (formatting.alignment !== 'left') styles.push(`text-align: ${formatting.alignment}`);

    // Build HTML
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    const classAttr = ` class="${classes.join(' ')}"`;

    // Special handling for different element types
    if (lineType === 'bullet-point') {
        return `<div${classAttr}${styleAttr}>${escapeHtml(content)}</div>`;
    } else if (lineType === 'section-header') {
        return `<h2${classAttr}${styleAttr}>${escapeHtml(content)}</h2>`;
    } else if (lineType === 'title') {
        return `<h1${classAttr}${styleAttr}>${escapeHtml(content)}</h1>`;
    } else {
        return `<p${classAttr}${styleAttr}>${escapeHtml(content)}</p>`;
    }
};

/**
 * Calculate top margin for spacing
 */
const calculateMarginTop = (element, lineElements) => {
    // Section headers get more spacing
    if (element.type === 'section-header') {
        return 12;
    }

    // Job titles get medium spacing
    if (element.type === 'job-title') {
        return 8;
    }

    // Default spacing
    return 4;
};

/**
 * Calculate left margin for indentation
 */
const calculateMarginLeft = (element) => {
    const indentLevel = element.spatialRelations?.indentLevel || 0;

    // Convert indent level to points
    return indentLevel * 20;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Generate semantic HTML for editing
 * This creates clean, editable HTML with proper semantic tags
 */
const generateSemanticHTML = (elements, sections) => {
    console.log('[SEMANTIC HTML] Generating semantic HTML for editing...');

    const html = [];

    sections.forEach(section => {
        // Section header
        html.push(`<section data-section-type="${section.type}">`);
        html.push(`  <h2>${escapeHtml(section.title)}</h2>`);

        // Section content
        const sectionElements = section.elements || [];

        // Group by logical blocks
        const blocks = groupIntoBlocks(sectionElements);

        blocks.forEach(block => {
            if (block.type === 'experience-entry') {
                html.push('  <div class="experience-entry">');
                html.push(`    <h3>${escapeHtml(block.title)}</h3>`);
                if (block.company) {
                    html.push(`    <p class="company">${escapeHtml(block.company)}</p>`);
                }
                if (block.date) {
                    html.push(`    <p class="date">${escapeHtml(block.date)}</p>`);
                }
                if (block.bullets && block.bullets.length > 0) {
                    html.push('    <ul>');
                    block.bullets.forEach(bullet => {
                        html.push(`      <li>${escapeHtml(bullet)}</li>`);
                    });
                    html.push('    </ul>');
                }
                html.push('  </div>');
            } else if (block.type === 'education-entry') {
                html.push('  <div class="education-entry">');
                html.push(`    <h3>${escapeHtml(block.degree)}</h3>`);
                html.push(`    <p class="institution">${escapeHtml(block.institution)}</p>`);
                if (block.date) {
                    html.push(`    <p class="date">${escapeHtml(block.date)}</p>`);
                }
                html.push('  </div>');
            } else if (block.type === 'skills-list') {
                html.push('  <ul class="skills-list">');
                block.skills.forEach(skill => {
                    html.push(`    <li>${escapeHtml(skill)}</li>`);
                });
                html.push('  </ul>');
            } else if (block.type === 'paragraph') {
                html.push(`  <p>${escapeHtml(block.text)}</p>`);
            }
        });

        html.push('</section>');
    });

    console.log('[SEMANTIC HTML] Semantic HTML generation complete');

    return html.join('\n');
};

/**
 * Group elements into logical blocks
 */
const groupIntoBlocks = (elements) => {
    const blocks = [];
    let currentBlock = null;

    elements.forEach(element => {
        if (element.type === 'job-title') {
            // Start new experience block
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = {
                type: 'experience-entry',
                title: element.text,
                bullets: []
            };
        } else if (element.type === 'company' && currentBlock?.type === 'experience-entry') {
            currentBlock.company = element.text;
        } else if (element.type === 'date' && currentBlock) {
            currentBlock.date = element.text;
        } else if (element.type === 'bullet-point' && currentBlock?.type === 'experience-entry') {
            currentBlock.bullets.push(element.text);
        } else {
            // Generic paragraph
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = {
                type: 'paragraph',
                text: element.text
            };
        }
    });

    if (currentBlock) blocks.push(currentBlock);

    return blocks;
};

/**
 * Extract plain text content for AI analysis
 */
const extractPlainText = (elements, sections) => {
    const lines = [];

    sections.forEach(section => {
        lines.push(`\n${section.title.toUpperCase()}`);
        lines.push('---');

        const sectionElements = section.elements || [];
        sectionElements.forEach(element => {
            lines.push(element.text);
        });
    });

    return lines.join('\n');
};

module.exports = {
    reconstructHTML,
    generateSemanticHTML,
    extractPlainText
};
