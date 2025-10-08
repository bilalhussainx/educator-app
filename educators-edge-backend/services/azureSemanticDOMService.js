/**
 * Azure Semantic DOM Service - Revolutionary Document Intelligence System
 * Generates rich, semantic JSON Document Object Model (DOM) using Azure's most advanced features
 * Multi-model approach with robust formatting detection and HTML reconstruction
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs').promises;

class AzureSemanticDOMService {
    constructor() {
        this.azureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
        this.azureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
        this.customModelId = process.env.AZURE_CUSTOM_RESUME_MODEL_ID || 'custom-resume-model';
        this.composedModelId = process.env.AZURE_COMPOSED_MODEL_ID || 'composed-resume-model';
    }

    /**
     * Main method: Generate Semantic JSON DOM with multi-model Azure approach
     */
    async generateSemanticDOM(filePath, mimeType) {
        console.log('🚀 Starting Semantic DOM generation with multi-model Azure approach...');
        const startTime = Date.now();

        try {
            // Step 1: Multi-Model Azure Analysis (Parallel Execution)
            const azureResults = await this.performMultiModelAnalysis(filePath, mimeType);

            // Step 2: Post-Processing Service - Clean up raw Azure output
            const processedData = await this.postProcessAzureResults(azureResults);

            // Step 3: Generate Semantic JSON DOM
            const semanticDOM = await this.buildSemanticDOM(processedData);

            // Step 4: Format Detection & HTML Reconstruction
            const htmlContent = await this.reconstructFormattedContent(semanticDOM);

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                semanticDOM,
                htmlContent,
                metadata: {
                    processingTime,
                    modelsUsed: azureResults.modelsUsed,
                    confidence: this.calculateOverallConfidence(semanticDOM),
                    formatPreservation: this.calculateFormatPreservation(semanticDOM)
                }
            };

        } catch (error) {
            console.error('❌ Semantic DOM generation failed:', error);
            throw error;
        }
    }

    /**
     * Step 1: Multi-Model Azure Document Intelligence Analysis
     * Uses Layout, Custom Neural, and Composed models for layered precision
     */
    async performMultiModelAnalysis(filePath, mimeType) {
        console.log('🔍 Performing multi-model Azure analysis...');

        const results = {
            modelsUsed: [],
            timestamp: new Date().toISOString()
        };

        // Model 1: Layout Model - Core OCR and Structure
        try {
            console.log('📄 Running Layout Model for core structure...');
            results.layout = await this.callAzureModel('prebuilt-layout', filePath, mimeType);
            results.modelsUsed.push('prebuilt-layout');
            console.log('✅ Layout Model completed successfully');
        } catch (error) {
            console.warn('⚠️ Layout Model failed:', error.message);
        }

        // Model 2: Custom Neural Model - Semantic Extraction
        try {
            console.log('🧠 Running Custom Neural Model for semantic extraction...');
            results.custom = await this.callAzureModel(this.customModelId, filePath, mimeType);
            results.modelsUsed.push('custom-neural');
            console.log('✅ Custom Neural Model completed successfully');
        } catch (error) {
            console.warn('⚠️ Custom Neural Model failed, using fallback:', error.message);
            // Fallback to prebuilt-document
            try {
                results.custom = await this.callAzureModel('prebuilt-document', filePath, mimeType);
                results.modelsUsed.push('prebuilt-document-fallback');
            } catch (fallbackError) {
                console.warn('⚠️ Fallback model also failed:', fallbackError.message);
            }
        }

        // Model 3: Composed Model - Intelligent Routing (if available)
        try {
            console.log('🔗 Running Composed Model for unified output...');
            results.composed = await this.callAzureModel(this.composedModelId, filePath, mimeType);
            results.modelsUsed.push('composed-model');
            console.log('✅ Composed Model completed successfully');
        } catch (error) {
            console.warn('⚠️ Composed Model not available, proceeding with individual models:', error.message);
        }

        console.log(`📊 Multi-model analysis complete. Models used: ${results.modelsUsed.join(', ')}`);
        return results;
    }

    /**
     * Call individual Azure Document Intelligence model
     */
    async callAzureModel(modelId, filePath, mimeType) {
        const analyzeUrl = `${this.azureEndpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2024-07-31-preview&features=styleFont,ocrHighResolution`;

        // Read file and create form data
        const fileBuffer = await fs.readFile(filePath);
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: 'document',
            contentType: mimeType
        });

        // Start analysis
        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.azureKey,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!analyzeResponse.ok) {
            const errorText = await analyzeResponse.text();
            throw new Error(`Azure ${modelId} analysis failed: ${analyzeResponse.status} ${errorText}`);
        }

        const operationLocation = analyzeResponse.headers.get('Operation-Location');
        if (!operationLocation) {
            throw new Error(`No operation location returned for ${modelId}`);
        }

        // Poll for results
        return await this.pollAzureResults(operationLocation);
    }

    /**
     * Poll Azure for analysis results
     */
    async pollAzureResults(operationLocation, maxAttempts = 30, delayMs = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.azureKey,
                }
            });

            const result = await response.json();

            if (result.status === 'succeeded') {
                return result.analyzeResult;
            } else if (result.status === 'failed') {
                throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('Analysis timed out after maximum attempts');
    }

    /**
     * Step 2: Post-Processing Service - Clean up raw Azure output
     */
    async postProcessAzureResults(azureResults) {
        console.log('🔧 Post-processing Azure results...');

        const processedData = {
            elements: [],
            pages: [],
            styles: [],
            lists: [],
            tables: [],
            keyValuePairs: []
        };

        // Process Layout Model results (primary for structure)
        if (azureResults.layout) {
            processedData.pages = azureResults.layout.pages || [];
            processedData.styles = azureResults.layout.styles || [];
            processedData.lists = azureResults.layout.lists || [];
            processedData.tables = azureResults.layout.tables || [];

            // Extract elements with enhanced formatting
            for (const page of processedData.pages) {
                await this.extractPageElements(page, processedData);
            }
        }

        // Enhance with Custom Model semantic labels
        if (azureResults.custom) {
            await this.enhanceWithSemanticLabels(processedData, azureResults.custom);
        }

        // Apply Composed Model unified results (if available)
        if (azureResults.composed) {
            await this.applyComposedModelEnhancements(processedData, azureResults.composed);
        }

        console.log(`✅ Post-processing complete. Extracted ${processedData.elements.length} elements`);
        return processedData;
    }

    /**
     * Extract elements from Azure Layout pages with enhanced formatting
     */
    async extractPageElements(page, processedData) {
        let elementId = 0;

        // Process words with detailed styling
        if (page.words) {
            for (const word of page.words) {
                const element = await this.createSemanticElement(word, page, 'word', elementId++);
                processedData.elements.push(element);
            }
        }

        // Process lines for better grouping
        if (page.lines) {
            for (const line of page.lines) {
                const element = await this.createSemanticElement(line, page, 'line', elementId++);

                // Detect if line is part of a list
                const listInfo = this.detectListMembership(line, processedData.lists);
                if (listInfo) {
                    element.listContext = listInfo;
                    element.semanticType = 'list-item';
                }

                processedData.elements.push(element);
            }
        }

        // Process paragraphs for semantic understanding
        if (page.paragraphs) {
            for (const paragraph of page.paragraphs) {
                const element = await this.createSemanticElement(paragraph, page, 'paragraph', elementId++);
                processedData.elements.push(element);
            }
        }
    }

    /**
     * Create semantic element with rich formatting information
     */
    async createSemanticElement(azureElement, page, sourceType, id) {
        const boundingBox = this.extractBoundingBox(azureElement, page.pageNumber || 1);
        const formatting = await this.extractRichFormatting(azureElement, page);
        const semanticType = await this.classifySemanticType(azureElement, formatting);

        return {
            id: `element_${id}`,
            text: azureElement.content || '',
            sourceType, // 'word', 'line', 'paragraph'
            semanticType, // 'title', 'section-header', 'bullet-point', etc.
            boundingBox,
            formatting,
            styleReference: this.getStyleReference(azureElement, page),
            hierarchy: {
                level: this.calculateHierarchyLevel(semanticType, formatting),
                children: [],
                parent: null
            },
            confidence: azureElement.confidence || 0.8,
            spatialRelations: {
                alignedWith: [],
                indentLevel: this.calculateIndentLevel(boundingBox),
                positionType: this.classifyPosition(boundingBox, page)
            },
            listContext: null // Will be populated if element is part of a list
        };
    }

    /**
     * Extract rich formatting information using Azure's advanced features
     */
    async extractRichFormatting(element, page) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon || [];
        const height = polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

        // Initialize formatting with defaults
        let formatting = {
            fontSize: Math.round(height * 0.75) || 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            backgroundColor: 'transparent',
            alignment: 'left',
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: 0,
            lineHeight: height,
            isBold: false,
            isItalic: false,
            isUnderlined: false,
            textDecoration: 'none'
        };

        // Extract Azure style information
        if (element.style) {
            formatting.fontWeight = element.style.fontWeight || 'normal';
            formatting.fontStyle = element.style.fontStyle || 'normal';
            formatting.isBold = element.style.fontWeight === 'bold';
            formatting.isItalic = element.style.fontStyle === 'italic';

            // Extract additional style properties if available
            if (element.style.fontSize) {
                formatting.fontSize = element.style.fontSize;
            }
            if (element.style.color) {
                formatting.color = element.style.color;
            }
        }

        // Check page-level styles with span matching
        if (page.styles && element.span) {
            const matchingStyle = page.styles.find(style =>
                style.spans?.some(span =>
                    span.offset <= element.span.offset &&
                    span.offset + span.length >= element.span.offset + element.span.length
                )
            );

            if (matchingStyle) {
                formatting.fontWeight = matchingStyle.fontWeight || formatting.fontWeight;
                formatting.fontStyle = matchingStyle.fontStyle || formatting.fontStyle;
                formatting.isBold = matchingStyle.fontWeight === 'bold';
                formatting.isItalic = matchingStyle.fontStyle === 'italic';

                // Apply background color if specified
                if (matchingStyle.backgroundColor) {
                    formatting.backgroundColor = matchingStyle.backgroundColor;
                }
            }
        }

        return formatting;
    }

    /**
     * Detect if a line is part of a list structure
     */
    detectListMembership(line, lists) {
        for (const list of lists) {
            for (const item of list.items || []) {
                // Check if line spans overlap with list item spans
                if (this.spansOverlap(line.span, item.span)) {
                    return {
                        listId: list.listId || 'unknown',
                        itemIndex: list.items.indexOf(item),
                        level: item.level || 0,
                        bulletFormat: item.bulletFormat || '•'
                    };
                }
            }
        }
        return null;
    }

    /**
     * Check if two spans overlap
     */
    spansOverlap(span1, span2) {
        if (!span1 || !span2) return false;

        const start1 = span1.offset;
        const end1 = span1.offset + span1.length;
        const start2 = span2.offset;
        const end2 = span2.offset + span2.length;

        return start1 < end2 && start2 < end1;
    }

    /**
     * Enhance elements with semantic labels from Custom Model
     */
    async enhanceWithSemanticLabels(processedData, customResults) {
        console.log('🏷️ Enhancing with semantic labels from custom model...');

        if (customResults.entities) {
            for (const entity of customResults.entities) {
                // Find matching elements based on span or content
                const matchingElements = processedData.elements.filter(element => {
                    return this.elementMatchesEntity(element, entity);
                });

                // Apply semantic labels
                for (const element of matchingElements) {
                    element.semanticLabel = entity.category;
                    element.confidence = Math.max(element.confidence, entity.confidence || 0.8);

                    // Update semantic type based on entity category
                    if (entity.category === 'JobTitle') {
                        element.semanticType = 'job-title';
                    } else if (entity.category === 'CompanyName') {
                        element.semanticType = 'company';
                    } else if (entity.category === 'BulletPoint') {
                        element.semanticType = 'bullet-point';
                    } else if (entity.category === 'Skill') {
                        element.semanticType = 'skill';
                    }
                }
            }
        }

        // Extract key-value pairs for structured data
        if (customResults.keyValuePairs) {
            processedData.keyValuePairs = customResults.keyValuePairs;
        }
    }

    /**
     * Check if element matches entity based on content or span
     */
    elementMatchesEntity(element, entity) {
        // Match by content similarity
        if (entity.content && element.text) {
            const normalizedEntityContent = entity.content.toLowerCase().trim();
            const normalizedElementText = element.text.toLowerCase().trim();

            if (normalizedElementText.includes(normalizedEntityContent) ||
                normalizedEntityContent.includes(normalizedElementText)) {
                return true;
            }
        }

        // Match by span overlap (if available)
        if (element.span && entity.span) {
            return this.spansOverlap(element.span, entity.span);
        }

        return false;
    }

    /**
     * Apply Composed Model unified enhancements
     */
    async applyComposedModelEnhancements(processedData, composedResults) {
        console.log('🔗 Applying composed model enhancements...');

        // The composed model provides unified results that combine
        // layout structure with semantic understanding
        if (composedResults.documents && composedResults.documents.length > 0) {
            const document = composedResults.documents[0];

            // Apply document-level fields
            if (document.fields) {
                processedData.documentFields = document.fields;

                // Map document fields to enhance existing elements
                for (const [fieldName, field] of Object.entries(document.fields)) {
                    if (field.valueString || field.valueArray) {
                        await this.mapDocumentFieldToElements(processedData.elements, fieldName, field);
                    }
                }
            }
        }
    }

    /**
     * Map document fields from composed model to existing elements
     */
    async mapDocumentFieldToElements(elements, fieldName, field) {
        const fieldContent = field.valueString || (field.valueArray ? field.valueArray.join(' ') : '');

        if (!fieldContent) return;

        // Find elements that match this field content
        const matchingElements = elements.filter(element => {
            return element.text && element.text.toLowerCase().includes(fieldContent.toLowerCase());
        });

        // Enhance matching elements with document field information
        for (const element of matchingElements) {
            element.documentField = {
                name: fieldName,
                confidence: field.confidence || 0.8,
                type: field.type || 'string'
            };
        }
    }

    /**
     * Step 3: Build Semantic JSON DOM
     */
    async buildSemanticDOM(processedData) {
        console.log('🏗️ Building Semantic JSON DOM...');

        // Sort elements by position
        const sortedElements = processedData.elements.sort((a, b) => {
            if (a.boundingBox.page !== b.boundingBox.page) {
                return a.boundingBox.page - b.boundingBox.page;
            }
            if (Math.abs(a.boundingBox.y - b.boundingBox.y) < 5) {
                return a.boundingBox.x - b.boundingBox.x;
            }
            return a.boundingBox.y - b.boundingBox.y;
        });

        // Build hierarchy relationships
        await this.buildElementHierarchy(sortedElements);

        // Detect and structure sections
        const sections = await this.detectDocumentSections(sortedElements);

        // Structure bullet points and lists
        const bulletStructures = await this.structureBulletPoints(sortedElements, processedData.lists);

        // Extract metadata
        const documentMetadata = await this.extractDocumentMetadata(sortedElements, processedData);

        return {
            version: '1.0',
            documentType: 'resume',
            metadata: documentMetadata,
            elements: sortedElements,
            sections,
            bulletStructures,
            lists: processedData.lists,
            tables: processedData.tables,
            keyValuePairs: processedData.keyValuePairs,
            documentFields: processedData.documentFields || {}
        };
    }

    /**
     * Build element hierarchy relationships
     */
    async buildElementHierarchy(elements) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const level = element.hierarchy.level;

            // Find parent (previous element with lower level)
            for (let j = i - 1; j >= 0; j--) {
                const potential_parent = elements[j];
                if (potential_parent.hierarchy.level < level) {
                    element.hierarchy.parent = potential_parent.id;
                    potential_parent.hierarchy.children.push(element.id);
                    break;
                }
            }

            // Build spatial relationships
            if (i > 0) {
                element.spatialRelations.above = elements[i - 1].id;
            }
            if (i < elements.length - 1) {
                element.spatialRelations.below = elements[i + 1].id;
            }

            // Find aligned elements
            const aligned = elements.filter(other =>
                other.id !== element.id &&
                other.boundingBox.page === element.boundingBox.page &&
                Math.abs(other.boundingBox.y - element.boundingBox.y) < 5
            );
            element.spatialRelations.alignedWith = aligned.map(el => el.id);
        }
    }

    /**
     * Step 4: Formatted Content Reconstruction
     * Generate clean HTML preserving original formatting
     */
    async reconstructFormattedContent(semanticDOM) {
        console.log('🎨 Reconstructing formatted HTML content...');

        let html = this.generateDocumentCSS(semanticDOM);
        html += '<div class="resume-document">\n';

        // Process sections in order
        for (const section of semanticDOM.sections) {
            html += await this.generateSectionHTML(section, semanticDOM);
        }

        html += '</div>';

        return {
            html,
            css: this.generateInlineCSS(semanticDOM),
            preservationMetadata: {
                originalFontHierarchy: this.extractFontHierarchy(semanticDOM.elements),
                spacingPreservation: this.extractSpacingRules(semanticDOM.elements),
                bulletFormats: this.extractBulletFormats(semanticDOM.bulletStructures)
            }
        };
    }

    /**
     * Generate section HTML with proper formatting
     */
    async generateSectionHTML(section, semanticDOM) {
        let html = `<section class="resume-section section-${section.type}" data-section-id="${section.id}">\n`;

        // Section title
        if (section.titleElement) {
            const titleTag = this.getSemanticTag(section.titleElement);
            html += `  <${titleTag} class="section-title">${this.escapeHtml(section.titleElement.text)}</${titleTag}>\n`;
        }

        // Section content
        html += '  <div class="section-content">\n';

        // Group elements by type and position
        const groupedElements = this.groupSectionElements(section.elements);

        for (const group of groupedElements) {
            html += await this.generateElementGroupHTML(group, semanticDOM);
        }

        html += '  </div>\n';
        html += '</section>\n\n';

        return html;
    }

    /**
     * Generate HTML for element groups (paragraphs, lists, etc.)
     */
    async generateElementGroupHTML(group, semanticDOM) {
        if (group.type === 'list') {
            return await this.generateListHTML(group.elements, semanticDOM);
        } else if (group.type === 'paragraph') {
            return await this.generateParagraphHTML(group.elements);
        } else {
            return await this.generateGenericElementsHTML(group.elements);
        }
    }

    /**
     * Generate clean, structured <ul>/<li> HTML elements
     */
    async generateListHTML(elements, semanticDOM) {
        const listItems = elements.filter(el => el.semanticType === 'bullet-point' || el.listContext);

        if (listItems.length === 0) return '';

        let html = '    <ul class="resume-list">\n';

        for (const item of listItems) {
            const bulletClass = item.listContext ? `bullet-${item.listContext.bulletFormat}` : 'bullet-default';
            const indentClass = `indent-level-${item.spatialRelations.indentLevel}`;

            html += `      <li class="list-item ${bulletClass} ${indentClass}">`;
            html += this.escapeHtml(item.text);
            html += '</li>\n';
        }

        html += '    </ul>\n';
        return html;
    }

    /**
     * Generate paragraph HTML with inline formatting
     */
    async generateParagraphHTML(elements) {
        let html = '    <p class="resume-paragraph">';

        for (const element of elements) {
            const tag = this.getInlineFormattingTag(element);
            const classes = this.getElementClasses(element);

            if (tag !== 'span' || classes) {
                const classAttr = classes ? ` class="${classes}"` : '';
                html += `<${tag}${classAttr}>${this.escapeHtml(element.text)}</${tag}>`;
            } else {
                html += this.escapeHtml(element.text);
            }

            if (elements.indexOf(element) < elements.length - 1) {
                html += ' ';
            }
        }

        html += '</p>\n';
        return html;
    }

    /**
     * Get semantic HTML tag based on element type and hierarchy
     */
    getSemanticTag(element) {
        switch (element.semanticType) {
            case 'title':
                return element.hierarchy.level === 1 ? 'h1' : 'h2';
            case 'section-header':
                return `h${Math.min(element.hierarchy.level + 1, 6)}`;
            case 'job-title':
                return 'h4';
            case 'company':
                return 'h5';
            default:
                return 'div';
        }
    }

    /**
     * Get inline formatting tag for elements
     */
    getInlineFormattingTag(element) {
        if (element.formatting.isBold && element.formatting.isItalic) {
            return 'strong'; // Priority to bold
        } else if (element.formatting.isBold) {
            return 'strong';
        } else if (element.formatting.isItalic) {
            return 'em';
        }
        return 'span';
    }

    /**
     * Generate document CSS with preserved formatting
     */
    generateDocumentCSS(semanticDOM) {
        return `<style>
.resume-document {
    font-family: 'Arial', sans-serif;
    line-height: 1.4;
    color: #000000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 1in;
}

.resume-section {
    margin-bottom: 1.5em;
}

.section-title {
    font-weight: bold;
    margin-bottom: 0.5em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.2em;
}

.resume-list {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.list-item {
    margin-bottom: 0.3em;
}

.indent-level-1 { margin-left: 1em; }
.indent-level-2 { margin-left: 2em; }
.indent-level-3 { margin-left: 3em; }

.resume-paragraph {
    margin-bottom: 0.5em;
}
</style>

`;
    }

    // Utility methods
    extractBoundingBox(element, pageNumber) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;
        if (!polygon || polygon.length < 6) {
            return { x: 0, y: 0, width: 0, height: 0, page: pageNumber };
        }
        return {
            x: polygon[0],
            y: polygon[1],
            width: polygon[4] - polygon[0],
            height: polygon[5] - polygon[1],
            page: pageNumber
        };
    }

    getStyleReference(element, page) {
        if (element.span && page.styles) {
            const matchingStyle = page.styles.find(style =>
                style.spans?.some(span => this.spansOverlap(element.span, span))
            );
            return matchingStyle ? matchingStyle.id || 'unknown' : null;
        }
        return null;
    }

    calculateHierarchyLevel(semanticType, formatting) {
        const baseLevels = {
            'title': 1,
            'section-header': 2,
            'job-title': 3,
            'company': 3,
            'date': 4,
            'bullet-point': 4,
            'skill': 4,
            'paragraph': 5,
            'contact-info': 6
        };

        let level = baseLevels[semanticType] || 5;
        if (formatting.isBold) level -= 0.5;
        if (formatting.fontSize > 14) level -= 0.5;
        if (formatting.fontSize > 18) level -= 1;
        return Math.max(1, Math.round(level));
    }

    calculateIndentLevel(boundingBox) {
        return Math.round(boundingBox.x / 36);
    }

    classifyPosition(boundingBox, page) {
        const pageWidth = page.width || 612;
        const x = boundingBox.x;

        if (x < pageWidth * 0.33) return 'left';
        if (x > pageWidth * 0.67) return 'right';
        return 'center';
    }

    classifySemanticType(element, formatting) {
        const text = (element.content || '').toLowerCase().trim();

        if (formatting.fontSize > 16 && formatting.isBold) return 'title';
        if (this.isSectionHeader(text) || (formatting.isBold && formatting.fontSize > 12)) return 'section-header';
        if (this.isContactInfo(text)) return 'contact-info';
        if (this.isDate(text)) return 'date';
        if (this.isJobTitle(text)) return 'job-title';
        if (this.isCompany(text)) return 'company';
        if (this.isBulletPoint(text)) return 'bullet-point';

        return 'paragraph';
    }

    // Text classification helpers
    isSectionHeader(text) {
        const headers = ['experience', 'education', 'skills', 'summary', 'objective', 'certifications', 'projects', 'awards'];
        return headers.some(header => text.includes(header));
    }

    isContactInfo(text) {
        return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text) ||
               /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text) ||
               /\b(?:https?:\/\/|www\.)\S+\b/.test(text);
    }

    isDate(text) {
        return /\b\d{4}\b/.test(text) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(text);
    }

    isJobTitle(text) {
        return /\b(manager|director|analyst|engineer|developer|designer|specialist|coordinator|assistant|supervisor|executive|officer|representative|associate|technician|lead|senior|junior|principal|chief)\b/i.test(text);
    }

    isCompany(text) {
        return /(inc\.|llc|corp\.|ltd\.|company|corporation|industries|solutions|systems|technologies|group|associates)$/i.test(text);
    }

    isBulletPoint(text) {
        return /^[\s]*[•◦▪▫■□★☆\-]\s+/.test(text) || /^\d+\./.test(text);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    calculateOverallConfidence(semanticDOM) {
        if (!semanticDOM.elements || semanticDOM.elements.length === 0) return 0;
        const total = semanticDOM.elements.reduce((sum, el) => sum + el.confidence, 0);
        return total / semanticDOM.elements.length;
    }

    calculateFormatPreservation(semanticDOM) {
        // Calculate how well the original formatting was preserved
        const elementsWithFormatting = semanticDOM.elements.filter(el =>
            el.formatting && (el.formatting.isBold || el.formatting.isItalic || el.formatting.fontSize > 12)
        );
        return elementsWithFormatting.length / Math.max(semanticDOM.elements.length, 1);
    }

    // Placeholder methods for additional functionality
    async detectDocumentSections(elements) {
        // Implementation for section detection
        return [];
    }

    async structureBulletPoints(elements, lists) {
        // Implementation for bullet point structuring
        return [];
    }

    async extractDocumentMetadata(elements, processedData) {
        // Implementation for metadata extraction
        return {
            totalElements: elements.length,
            confidence: this.calculateOverallConfidence({ elements }),
            processingDate: new Date().toISOString()
        };
    }

    groupSectionElements(elements) {
        // Implementation for grouping section elements
        return [];
    }

    async generateGenericElementsHTML(elements) {
        // Implementation for generic element HTML generation
        return '';
    }

    getElementClasses(element) {
        // Implementation for element CSS classes
        return '';
    }

    generateInlineCSS(semanticDOM) {
        // Implementation for inline CSS generation
        return '';
    }

    extractFontHierarchy(elements) {
        // Implementation for font hierarchy extraction
        return [];
    }

    extractSpacingRules(elements) {
        // Implementation for spacing rules extraction
        return {};
    }

    extractBulletFormats(bulletStructures) {
        // Implementation for bullet format extraction
        return [];
    }
}

module.exports = { AzureSemanticDOMService };