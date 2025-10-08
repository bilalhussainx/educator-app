/**
 * Formatted Content Reconstruction Service
 * Line Grouping & HTML Generation: Stitches raw text and formatting metadata
 * from Azure JSON into a single, clean HTML string representing preserved resume structure
 */

class ContentReconstructionService {
    constructor() {
        this.htmlTemplate = {
            doctype: '<!DOCTYPE html>',
            htmlOpen: '<html lang="en">',
            headSection: `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reconstructed Resume</title>
</head>`,
            bodyOpen: '<body class="resume-document">',
            bodyClose: '</body>',
            htmlClose: '</html>'
        };

        this.preservationSettings = {
            maintainOriginalSpacing: true,
            preserveFontSizes: true,
            preserveColors: true,
            preserveAlignment: true,
            generateCSS: true,
            includeMetadata: true
        };

        this.qualityThresholds = {
            minimumConfidence: 0.6,
            minimumTextLength: 3,
            maximumNestingLevel: 6
        };
    }

    /**
     * Main reconstruction method - generates complete HTML document
     */
    async reconstructFormattedContent(bulletPoints, hierarchyElements, azureResults, options = {}) {
        console.log('🎨 Starting formatted content reconstruction...');

        const settings = { ...this.preservationSettings, ...options };

        const reconstructionResult = {
            html: '',
            css: '',
            metadata: {
                totalElements: 0,
                preservationScore: 0,
                qualityScore: 0,
                processingSteps: []
            }
        };

        try {
            // Step 1: Prepare and sort all content elements
            const contentElements = await this.prepareContentElements(bulletPoints, hierarchyElements, azureResults);
            reconstructionResult.metadata.totalElements = contentElements.length;
            reconstructionResult.metadata.processingSteps.push('content-preparation');

            // Step 2: Generate CSS stylesheet for formatting preservation
            const cssStyles = await this.generatePreservationCSS(contentElements, azureResults, settings);
            reconstructionResult.css = cssStyles;
            reconstructionResult.metadata.processingSteps.push('css-generation');

            // Step 3: Build document structure with proper grouping
            const documentStructure = await this.buildDocumentStructure(contentElements, settings);
            reconstructionResult.metadata.processingSteps.push('structure-building');

            // Step 4: Generate final HTML with preserved formatting
            const htmlContent = await this.generateFinalHTML(documentStructure, cssStyles, settings);
            reconstructionResult.html = htmlContent;
            reconstructionResult.metadata.processingSteps.push('html-generation');

            // Step 5: Calculate quality metrics
            reconstructionResult.metadata.preservationScore = this.calculatePreservationScore(contentElements, documentStructure);
            reconstructionResult.metadata.qualityScore = this.calculateQualityScore(reconstructionResult);

            console.log(`✅ Content reconstruction complete: ${contentElements.length} elements processed`);

            return reconstructionResult;

        } catch (error) {
            console.error('❌ Content reconstruction failed:', error);
            return {
                html: this.generateErrorHTML(error),
                css: '',
                metadata: {
                    error: error.message,
                    totalElements: 0,
                    preservationScore: 0,
                    qualityScore: 0,
                    processingSteps: []
                }
            };
        }
    }

    /**
     * Step 1: Prepare and sort all content elements
     */
    async prepareContentElements(bulletPoints, hierarchyElements, azureResults) {
        console.log('📋 Preparing content elements for reconstruction...');

        const contentElements = [];

        // Add hierarchy elements (titles, headers)
        for (const hierarchy of hierarchyElements) {
            contentElements.push({
                id: hierarchy.id,
                type: 'hierarchy',
                subtype: hierarchy.semanticTag,
                level: hierarchy.level,
                content: hierarchy.content.text,
                html: hierarchy.html,
                style: hierarchy.style,
                position: hierarchy.position,
                boundingBox: hierarchy.boundingBox,
                confidence: hierarchy.confidence,
                cssClass: hierarchy.cssClass,
                sortKey: this.generateSortKey(hierarchy.position, hierarchy.level)
            });
        }

        // Add bullet points with list structure
        for (const bullet of bulletPoints) {
            contentElements.push({
                id: bullet.id,
                type: 'bullet',
                subtype: bullet.formatting.bulletType,
                level: bullet.formatting.level + 10, // Offset to place after headers
                content: bullet.cleanText,
                html: bullet.html,
                style: this.extractStyleFromBullet(bullet),
                position: bullet.position,
                boundingBox: bullet.position.boundingBox,
                confidence: bullet.confidence,
                cssClass: this.getBulletCssClass(bullet),
                listContext: bullet.listContext,
                sortKey: this.generateSortKey(bullet.position, bullet.formatting.level + 10)
            });
        }

        // Add remaining content from Azure results
        const remainingElements = await this.extractRemainingContent(azureResults, contentElements);
        contentElements.push(...remainingElements);

        // Sort all elements by position and hierarchy
        contentElements.sort((a, b) => {
            // Primary sort: page number
            if (a.position.page !== b.position.page) {
                return a.position.page - b.position.page;
            }

            // Secondary sort: vertical position
            if (Math.abs(a.position.y - b.position.y) > 5) {
                return a.position.y - b.position.y;
            }

            // Tertiary sort: hierarchy level
            if (a.level !== b.level) {
                return a.level - b.level;
            }

            // Final sort: horizontal position
            return a.position.x - b.position.x;
        });

        console.log(`📋 Prepared ${contentElements.length} content elements`);
        return contentElements;
    }

    /**
     * Step 2: Generate CSS stylesheet for formatting preservation
     */
    async generatePreservationCSS(contentElements, azureResults, settings) {
        console.log('🎨 Generating preservation CSS...');

        let css = `/* Auto-generated CSS for document formatting preservation */\n\n`;

        // Document-level styles
        css += this.generateDocumentCSS(azureResults);

        // Typography styles based on Azure font analysis
        css += this.generateTypographyCSS(contentElements);

        // Hierarchy styles
        css += this.generateHierarchyCSS(contentElements);

        // List and bullet styles
        css += this.generateListCSS(contentElements);

        // Layout and positioning styles
        css += this.generateLayoutCSS(azureResults);

        // Responsive styles
        css += this.generateResponsiveCSS();

        return css;
    }

    /**
     * Generate document-level CSS
     */
    generateDocumentCSS(azureResults) {
        const pageInfo = azureResults.layout?.pages?.[0] || {};
        const pageWidth = pageInfo.width || 612; // 8.5 inches * 72 pts
        const pageHeight = pageInfo.height || 792; // 11 inches * 72 pts

        return `.resume-document {
    max-width: ${Math.round(pageWidth)}pt;
    min-height: ${Math.round(pageHeight)}pt;
    margin: 0 auto;
    padding: 72pt; /* 1 inch margins */
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 12pt;
    line-height: 1.4;
    color: #000000;
    background: #ffffff;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

@media print {
    .resume-document {
        box-shadow: none;
        margin: 0;
        padding: 0.5in;
    }
}

`;
    }

    /**
     * Generate typography CSS based on detected fonts
     */
    generateTypographyCSS(contentElements) {
        const fontSizes = [...new Set(contentElements.map(el => el.style?.fontSize).filter(Boolean))];
        const fontFamilies = [...new Set(contentElements.map(el => el.style?.fontFamily).filter(Boolean))];

        let css = '/* Typography Styles */\n';

        // Font size classes
        fontSizes.sort((a, b) => b - a).forEach((size, index) => {
            css += `.font-size-${size} { font-size: ${size}pt; }\n`;
        });

        // Font family classes
        fontFamilies.forEach((family, index) => {
            const className = family.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            css += `.font-family-${className} { font-family: ${family}; }\n`;
        });

        css += '\n';
        return css;
    }

    /**
     * Generate hierarchy CSS for semantic elements
     */
    generateHierarchyCSS(contentElements) {
        const hierarchyElements = contentElements.filter(el => el.type === 'hierarchy');

        let css = '/* Hierarchy Styles */\n';

        // Level-specific styles
        for (let level = 1; level <= 6; level++) {
            const elementsAtLevel = hierarchyElements.filter(el => el.level === level);
            if (elementsAtLevel.length === 0) continue;

            const avgFontSize = this.calculateAverageFontSize(elementsAtLevel);
            const commonWeight = this.getMostCommonFontWeight(elementsAtLevel);

            css += `h${level}, .hierarchy-level-${level} {
    font-size: ${avgFontSize}pt;
    font-weight: ${commonWeight};
    margin-top: ${this.calculateMarginTop(level)}pt;
    margin-bottom: ${this.calculateMarginBottom(level)}pt;
    line-height: 1.2;
}

`;
        }

        return css;
    }

    /**
     * Generate list and bullet CSS
     */
    generateListCSS(contentElements) {
        const bulletElements = contentElements.filter(el => el.type === 'bullet');

        let css = '/* List and Bullet Styles */\n';

        css += `ul.structured-list {
    margin: 8pt 0;
    padding-left: 24pt;
    list-style: none;
}

li.bullet-item {
    margin-bottom: 4pt;
    position: relative;
}

li.bullet-item::before {
    position: absolute;
    left: -16pt;
    top: 0;
}

`;

        // Bullet type specific styles
        const bulletTypes = [...new Set(bulletElements.map(el => el.subtype))];

        bulletTypes.forEach(type => {
            const bulletChar = this.getBulletCharacter(type);
            css += `li.bullet-${type}::before {
    content: "${bulletChar}";
}

`;
        });

        // Level-specific indentation
        for (let level = 0; level <= 5; level++) {
            css += `li.level-${level} {
    margin-left: ${level * 18}pt;
}

`;
        }

        return css;
    }

    /**
     * Generate layout CSS
     */
    generateLayoutCSS(azureResults) {
        return `/* Layout Styles */
.content-section {
    margin-bottom: 18pt;
}

.inline-element {
    display: inline;
}

.block-element {
    display: block;
    margin-bottom: 6pt;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.bold { font-weight: bold; }
.italic { font-style: italic; }
.underline { text-decoration: underline; }

`;
    }

    /**
     * Generate responsive CSS
     */
    generateResponsiveCSS() {
        return `/* Responsive Styles */
@media screen and (max-width: 768px) {
    .resume-document {
        padding: 36pt 18pt;
        font-size: 11pt;
    }

    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    h4 { font-size: 13pt; }
    h5 { font-size: 12pt; }
    h6 { font-size: 11pt; }
}

@media screen and (max-width: 480px) {
    .resume-document {
        padding: 18pt 12pt;
        font-size: 10pt;
    }

    ul.structured-list {
        padding-left: 18pt;
    }
}

`;
    }

    /**
     * Step 3: Build document structure with proper grouping
     */
    async buildDocumentStructure(contentElements, settings) {
        console.log('🏗️ Building document structure...');

        const structure = {
            sections: [],
            metadata: {
                totalSections: 0,
                averageSectionLength: 0
            }
        };

        // Group elements into logical sections
        const sections = await this.groupElementsIntoSections(contentElements);

        for (const section of sections) {
            const structuredSection = {
                id: `section_${structure.sections.length}`,
                title: section.title,
                elements: section.elements,
                html: await this.generateSectionHTML(section, settings),
                metadata: {
                    elementCount: section.elements.length,
                    hasHierarchy: section.elements.some(el => el.type === 'hierarchy'),
                    hasBullets: section.elements.some(el => el.type === 'bullet'),
                    confidence: this.calculateSectionConfidence(section.elements)
                }
            };

            structure.sections.push(structuredSection);
        }

        structure.metadata.totalSections = structure.sections.length;
        structure.metadata.averageSectionLength = structure.sections.reduce(
            (sum, section) => sum + section.elements.length, 0
        ) / structure.sections.length;

        console.log(`🏗️ Built ${structure.sections.length} document sections`);
        return structure;
    }

    /**
     * Group elements into logical sections
     */
    async groupElementsIntoSections(contentElements) {
        const sections = [];
        let currentSection = null;

        for (const element of contentElements) {
            // Start new section on hierarchy elements of level 1 or 2
            if (element.type === 'hierarchy' && element.level <= 2) {
                if (currentSection) {
                    sections.push(currentSection);
                }

                currentSection = {
                    title: element.content,
                    titleElement: element,
                    elements: [element]
                };
            } else if (currentSection) {
                currentSection.elements.push(element);
            } else {
                // Create initial section if we start with non-header content
                currentSection = {
                    title: 'Document Content',
                    titleElement: null,
                    elements: [element]
                };
            }
        }

        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Generate HTML for a section
     */
    async generateSectionHTML(section, settings) {
        let html = '';

        // Section wrapper
        html += `<section class="content-section">\n`;

        // Process elements in order
        let currentList = null;

        for (const element of section.elements) {
            if (element.type === 'bullet') {
                // Handle bullet points with proper list structure
                if (!currentList) {
                    currentList = {
                        level: element.level,
                        items: [element]
                    };
                } else if (element.level === currentList.level) {
                    currentList.items.push(element);
                } else {
                    // Close current list and start new one
                    html += await this.generateListHTML(currentList.items);
                    currentList = {
                        level: element.level,
                        items: [element]
                    };
                }
            } else {
                // Close any open list
                if (currentList) {
                    html += await this.generateListHTML(currentList.items);
                    currentList = null;
                }

                // Add non-bullet element
                html += this.generateElementHTML(element, settings);
            }
        }

        // Close final list if open
        if (currentList) {
            html += await this.generateListHTML(currentList.items);
        }

        html += `</section>\n\n`;

        return html;
    }

    /**
     * Generate HTML for a list of bullet items
     */
    async generateListHTML(bulletItems) {
        if (bulletItems.length === 0) return '';

        let html = '  <ul class="structured-list">\n';

        for (const bullet of bulletItems) {
            const cssClass = bullet.cssClass || this.getBulletCssClass(bullet);
            html += `    <li class="${cssClass}">${this.escapeHtml(bullet.content)}</li>\n`;
        }

        html += '  </ul>\n';

        return html;
    }

    /**
     * Generate HTML for individual elements
     */
    generateElementHTML(element, settings) {
        const tag = element.subtype || 'div';
        const cssClass = element.cssClass || this.getElementCssClass(element);
        const content = this.escapeHtml(element.content);

        const attributes = this.generateElementAttributes(element, settings);

        return `  <${tag} class="${cssClass}"${attributes}>${content}</${tag}>\n`;
    }

    /**
     * Step 4: Generate final HTML with preserved formatting
     */
    async generateFinalHTML(documentStructure, cssStyles, settings) {
        console.log('📄 Generating final HTML document...');

        let html = '';

        // Document structure
        if (settings.generateFullHTML) {
            html += this.htmlTemplate.doctype + '\n';
            html += this.htmlTemplate.htmlOpen + '\n';
            html += this.htmlTemplate.headSection + '\n';
            html += '<style>\n' + cssStyles + '</style>\n';
            html += this.htmlTemplate.bodyOpen + '\n';
        } else {
            html += '<div class="resume-document">\n';
        }

        // Add document content
        for (const section of documentStructure.sections) {
            html += section.html;
        }

        // Close document structure
        if (settings.generateFullHTML) {
            html += this.htmlTemplate.bodyClose + '\n';
            html += this.htmlTemplate.htmlClose + '\n';
        } else {
            html += '</div>\n';
        }

        // Add metadata comments if enabled
        if (settings.includeMetadata) {
            html += this.generateMetadataComments(documentStructure);
        }

        return html;
    }

    // Utility methods

    generateSortKey(position, level) {
        return `${position.page.toString().padStart(3, '0')}_${position.y.toString().padStart(6, '0')}_${level.toString().padStart(2, '0')}`;
    }

    extractStyleFromBullet(bullet) {
        return {
            fontSize: 12, // Default
            fontWeight: 'normal',
            fontFamily: 'Arial, sans-serif',
            color: '#000000'
        };
    }

    getBulletCssClass(bullet) {
        const classes = ['bullet-item'];

        if (bullet.subtype) {
            classes.push(`bullet-${bullet.subtype}`);
        }

        if (bullet.formatting?.level) {
            classes.push(`level-${bullet.formatting.level}`);
        }

        return classes.join(' ');
    }

    getElementCssClass(element) {
        const classes = [];

        if (element.type) {
            classes.push(`element-${element.type}`);
        }

        if (element.level) {
            classes.push(`level-${element.level}`);
        }

        if (element.style?.isBold) {
            classes.push('bold');
        }

        if (element.style?.isItalic) {
            classes.push('italic');
        }

        return classes.join(' ') || 'text-element';
    }

    generateElementAttributes(element, settings) {
        const attributes = [];

        if (element.id) {
            attributes.push(`data-element-id="${element.id}"`);
        }

        if (element.confidence) {
            attributes.push(`data-confidence="${element.confidence.toFixed(2)}"`);
        }

        if (settings.preserveColors && element.style?.color && element.style.color !== '#000000') {
            attributes.push(`style="color: ${element.style.color}"`);
        }

        return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    }

    calculateAverageFontSize(elements) {
        const fontSizes = elements.map(el => el.style?.fontSize || 12).filter(Boolean);
        return fontSizes.length > 0 ? Math.round(fontSizes.reduce((a, b) => a + b) / fontSizes.length) : 12;
    }

    getMostCommonFontWeight(elements) {
        const weights = elements.map(el => el.style?.fontWeight || 'normal');
        const counts = {};

        weights.forEach(weight => {
            counts[weight] = (counts[weight] || 0) + 1;
        });

        return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
    }

    calculateMarginTop(level) {
        const margins = { 1: 24, 2: 18, 3: 12, 4: 9, 5: 6, 6: 4 };
        return margins[level] || 6;
    }

    calculateMarginBottom(level) {
        const margins = { 1: 12, 2: 9, 3: 6, 4: 4, 5: 3, 6: 2 };
        return margins[level] || 3;
    }

    getBulletCharacter(type) {
        const chars = {
            solid: '•',
            hollow: '◦',
            square: '▪',
            triangle: '▶',
            star: '★',
            arrow: '→',
            dash: '–',
            numbered: '',
            other: '•'
        };
        return chars[type] || '•';
    }

    async extractRemainingContent(azureResults, existingElements) {
        // Extract content not already captured by hierarchy or bullets
        const existingTexts = new Set(existingElements.map(el => el.content.toLowerCase().trim()));
        const remainingElements = [];

        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                if (page.paragraphs) {
                    for (const paragraph of page.paragraphs) {
                        if (paragraph.content &&
                            !existingTexts.has(paragraph.content.toLowerCase().trim()) &&
                            paragraph.content.trim().length > this.qualityThresholds.minimumTextLength) {

                            remainingElements.push({
                                id: `remaining_${remainingElements.length}`,
                                type: 'paragraph',
                                subtype: 'p',
                                level: 10,
                                content: paragraph.content,
                                html: `<p>${this.escapeHtml(paragraph.content)}</p>`,
                                style: { fontSize: 12, fontWeight: 'normal' },
                                position: this.extractPosition(paragraph, page),
                                boundingBox: this.extractBoundingBox(paragraph),
                                confidence: paragraph.confidence || 0.7,
                                cssClass: 'paragraph-text',
                                sortKey: this.generateSortKey(this.extractPosition(paragraph, page), 10)
                            });
                        }
                    }
                }
            }
        }

        return remainingElements;
    }

    extractPosition(element, page) {
        const bbox = this.extractBoundingBox(element);
        return {
            page: page.pageNumber || 1,
            x: bbox.x,
            y: bbox.y
        };
    }

    extractBoundingBox(element) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;
        if (!polygon || polygon.length < 6) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        return {
            x: polygon[0],
            y: polygon[1],
            width: polygon[4] - polygon[0],
            height: polygon[5] - polygon[1]
        };
    }

    calculateSectionConfidence(elements) {
        if (elements.length === 0) return 0;
        const total = elements.reduce((sum, el) => sum + el.confidence, 0);
        return total / elements.length;
    }

    calculatePreservationScore(contentElements, documentStructure) {
        let score = 0;

        // Base score for having content
        if (contentElements.length > 0) score += 30;

        // Score for structured sections
        if (documentStructure.sections.length > 0) score += 25;

        // Score for hierarchy preservation
        const hierarchyElements = contentElements.filter(el => el.type === 'hierarchy').length;
        score += Math.min(hierarchyElements * 5, 20);

        // Score for formatting preservation
        const formattedElements = contentElements.filter(el =>
            el.style && (el.style.isBold || el.style.isItalic || el.style.fontSize > 12)
        ).length;
        score += Math.min(formattedElements * 2, 15);

        // Score for confidence levels
        const avgConfidence = contentElements.reduce((sum, el) => sum + el.confidence, 0) / contentElements.length;
        score += Math.round(avgConfidence * 10);

        return Math.min(100, score);
    }

    calculateQualityScore(reconstructionResult) {
        let score = 0;

        // Score for successful generation
        if (reconstructionResult.html && reconstructionResult.html.length > 100) score += 40;

        // Score for CSS generation
        if (reconstructionResult.css && reconstructionResult.css.length > 100) score += 20;

        // Score for preservation
        score += Math.round(reconstructionResult.metadata.preservationScore * 0.4);

        return Math.min(100, score);
    }

    generateMetadataComments(documentStructure) {
        return `\n<!-- Document Metadata
Total Sections: ${documentStructure.metadata.totalSections}
Average Section Length: ${Math.round(documentStructure.metadata.averageSectionLength)}
Generation Time: ${new Date().toISOString()}
-->`;
    }

    generateErrorHTML(error) {
        return `<div class="error-message">
    <h2>Content Reconstruction Error</h2>
    <p>An error occurred while reconstructing the document content:</p>
    <p><code>${this.escapeHtml(error.message)}</code></p>
</div>`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
}

module.exports = { ContentReconstructionService };