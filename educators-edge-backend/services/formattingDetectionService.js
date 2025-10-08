/**
 * Formatting Detection Service - Post-Processing for Azure Document Intelligence
 * Implements robust formatting detection and reconstruction as described in the requirements:
 * 1. Bullet Point Detection using Layout model's List and Line analysis
 * 2. Visual Hierarchy analysis using styleFont and span data
 * 3. Formatted Content Reconstruction with HTML generation
 */

class FormattingDetectionService {
    constructor() {
        this.confidenceThreshold = 0.7;
        this.bulletPatterns = ['•', '◦', '▪', '▫', '■', '□', '★', '☆', '-', '▶', '→'];
        this.fontSizeThresholds = {
            title: 18,
            heading: 16,
            subheading: 14,
            body: 12
        };
    }

    /**
     * Main processing method - Clean up raw Azure output before passing to AI agent
     */
    async processAzureResults(azureResults) {
        console.log('🔧 Starting post-processing of Azure results...');

        const processedResults = {
            bulletPoints: [],
            visualHierarchy: [],
            formattedContent: '',
            confidence: 0,
            metadata: {
                processingSteps: [],
                detectionResults: {}
            }
        };

        try {
            // Step 1: Bullet Point Detection using Layout model's List and Line analysis
            const bulletDetectionResult = await this.detectBulletPoints(azureResults);
            processedResults.bulletPoints = bulletDetectionResult.bulletPoints;
            processedResults.metadata.detectionResults.bulletPoints = bulletDetectionResult.metadata;
            processedResults.metadata.processingSteps.push('bullet-point-detection');

            // Step 2: Visual Hierarchy analysis using styleFont and span data
            const hierarchyResult = await this.analyzeVisualHierarchy(azureResults);
            processedResults.visualHierarchy = hierarchyResult.hierarchy;
            processedResults.metadata.detectionResults.hierarchy = hierarchyResult.metadata;
            processedResults.metadata.processingSteps.push('visual-hierarchy-analysis');

            // Step 3: Formatted Content Reconstruction with HTML generation
            const contentResult = await this.reconstructFormattedContent(
                bulletDetectionResult.bulletPoints,
                hierarchyResult.hierarchy,
                azureResults
            );
            processedResults.formattedContent = contentResult.html;
            processedResults.metadata.detectionResults.contentReconstruction = contentResult.metadata;
            processedResults.metadata.processingSteps.push('content-reconstruction');

            // Calculate overall confidence
            processedResults.confidence = this.calculateOverallConfidence(
                bulletDetectionResult.metadata.confidence,
                hierarchyResult.metadata.confidence,
                contentResult.metadata.confidence
            );

            console.log('✅ Post-processing complete:', {
                bulletPoints: processedResults.bulletPoints.length,
                hierarchyLevels: processedResults.visualHierarchy.length,
                confidence: Math.round(processedResults.confidence * 100) + '%'
            });

            return processedResults;

        } catch (error) {
            console.error('❌ Post-processing failed:', error);
            throw new Error(`Formatting detection failed: ${error.message}`);
        }
    }

    /**
     * Step 1: Bullet Point Detection
     * Uses Layout model's List and Line analysis
     * Key: If a Line is part of a list structure and content is categorized as BulletPoint,
     * assign high-confidence <li> tag
     */
    async detectBulletPoints(azureResults) {
        console.log('🔍 Detecting bullet points using Layout model analysis...');

        const bulletPoints = [];
        const metadata = {
            totalLinesAnalyzed: 0,
            listsDetected: 0,
            bulletPointsFound: 0,
            confidence: 0,
            detectionMethods: []
        };

        try {
            // Method 1: Use Azure's List detection (primary method)
            if (azureResults.layout?.lists) {
                const listBasedBullets = await this.extractBulletsFromLists(azureResults.layout.lists, azureResults.layout.pages);
                bulletPoints.push(...listBasedBullets.bullets);
                metadata.listsDetected = azureResults.layout.lists.length;
                metadata.detectionMethods.push('azure-list-detection');
                console.log(`📋 Found ${listBasedBullets.bullets.length} bullets from ${metadata.listsDetected} detected lists`);
            }

            // Method 2: Line-by-line analysis for missed bullet points
            if (azureResults.layout?.pages) {
                const lineBasedBullets = await this.extractBulletsFromLines(azureResults.layout.pages);
                bulletPoints.push(...lineBasedBullets.bullets);
                metadata.totalLinesAnalyzed = lineBasedBullets.totalLines;
                metadata.detectionMethods.push('line-analysis');
                console.log(`📝 Found ${lineBasedBullets.bullets.length} additional bullets from line analysis`);
            }

            // Method 3: Custom model enhancement (if available)
            if (azureResults.custom?.entities) {
                const customBullets = await this.enhanceBulletsWithCustomModel(bulletPoints, azureResults.custom.entities);
                metadata.detectionMethods.push('custom-model-enhancement');
                console.log(`🧠 Enhanced ${customBullets.enhanced} bullets with custom model data`);
            }

            // Remove duplicates and validate
            const uniqueBullets = this.deduplicateBulletPoints(bulletPoints);
            metadata.bulletPointsFound = uniqueBullets.length;
            metadata.confidence = this.calculateBulletConfidence(uniqueBullets);

            console.log(`✅ Bullet point detection complete: ${uniqueBullets.length} unique bullets found`);

            return {
                bullets: uniqueBullets,
                metadata
            };

        } catch (error) {
            console.error('❌ Bullet point detection failed:', error);
            return {
                bullets: [],
                metadata: { ...metadata, error: error.message }
            };
        }
    }

    /**
     * Extract bullets from Azure's List detection
     */
    async extractBulletsFromLists(lists, pages) {
        const bullets = [];

        for (const list of lists) {
            for (const item of list.items || []) {
                const bullet = {
                    id: `list_${list.listId || 'unknown'}_item_${item.level || 0}_${bullets.length}`,
                    text: item.content || '',
                    type: 'bullet-point',
                    listContext: {
                        listId: list.listId,
                        level: item.level || 0,
                        bulletFormat: this.detectBulletFormat(item.content),
                        isNumbered: /^\d+\./.test(item.content?.trim() || '')
                    },
                    boundingBox: this.extractBoundingBox(item),
                    confidence: item.confidence || 0.9, // High confidence from Azure list detection
                    detectionMethod: 'azure-list',
                    html: this.generateBulletHTML(item.content, item.level || 0, this.detectBulletFormat(item.content)),
                    spans: item.span ? [item.span] : []
                };

                bullets.push(bullet);
            }
        }

        return { bullets };
    }

    /**
     * Extract bullets from line analysis (fallback method)
     */
    async extractBulletsFromLines(pages) {
        const bullets = [];
        let totalLines = 0;

        for (const page of pages) {
            if (page.lines) {
                for (const line of page.lines) {
                    totalLines++;

                    if (this.isBulletPointLine(line.content)) {
                        const bullet = {
                            id: `line_bullet_${page.pageNumber || 1}_${bullets.length}`,
                            text: line.content || '',
                            type: 'bullet-point',
                            listContext: {
                                level: this.calculateIndentLevel(line),
                                bulletFormat: this.detectBulletFormat(line.content),
                                isNumbered: /^\d+\./.test(line.content?.trim() || '')
                            },
                            boundingBox: this.extractBoundingBox(line),
                            confidence: line.confidence || 0.75, // Medium confidence from line analysis
                            detectionMethod: 'line-analysis',
                            html: this.generateBulletHTML(
                                line.content,
                                this.calculateIndentLevel(line),
                                this.detectBulletFormat(line.content)
                            ),
                            spans: line.span ? [line.span] : []
                        };

                        bullets.push(bullet);
                    }
                }
            }
        }

        return { bullets, totalLines };
    }

    /**
     * Enhance bullets with custom model semantic understanding
     */
    async enhanceBulletsWithCustomModel(bullets, entities) {
        let enhanced = 0;

        for (const entity of entities) {
            if (entity.category === 'BulletPoint' && entity.content) {
                // Find matching bullet by content similarity
                const matchingBullet = bullets.find(bullet =>
                    bullet.text.toLowerCase().includes(entity.content.toLowerCase()) ||
                    entity.content.toLowerCase().includes(bullet.text.toLowerCase())
                );

                if (matchingBullet) {
                    matchingBullet.semanticLabel = entity.category;
                    matchingBullet.confidence = Math.max(matchingBullet.confidence, entity.confidence || 0.8);
                    matchingBullet.detectionMethod = 'custom-model-enhanced';
                    enhanced++;
                }
            }
        }

        return { enhanced };
    }

    /**
     * Step 2: Visual Hierarchy Analysis
     * Analyzes styleFont and span data from Layout model
     * Groups text elements based on proximity and consistently applied font-weight/size
     * Assigns levels H1, H2, etc.
     */
    async analyzeVisualHierarchy(azureResults) {
        console.log('📊 Analyzing visual hierarchy using styleFont and span data...');

        const hierarchy = [];
        const metadata = {
            totalElements: 0,
            fontSizes: new Set(),
            fontWeights: new Set(),
            hierarchyLevels: 0,
            confidence: 0,
            groupingResults: {}
        };

        try {
            // Extract all text elements with formatting information
            const elements = await this.extractFormattedElements(azureResults);
            metadata.totalElements = elements.length;

            // Analyze font patterns
            const fontAnalysis = await this.analyzeFontPatterns(elements);
            metadata.fontSizes = new Set(elements.map(el => el.formatting.fontSize));
            metadata.fontWeights = new Set(elements.map(el => el.formatting.fontWeight));

            // Group elements by proximity and consistent formatting
            const groups = await this.groupElementsByProximityAndFormatting(elements);
            metadata.groupingResults = {
                totalGroups: groups.length,
                averageGroupSize: groups.reduce((sum, group) => sum + group.elements.length, 0) / groups.length
            };

            // Assign hierarchy levels based on font size, weight, and position
            for (const group of groups) {
                const hierarchyLevel = await this.calculateHierarchyLevel(group, fontAnalysis);

                const hierarchyElement = {
                    id: `hierarchy_${hierarchy.length}`,
                    level: hierarchyLevel.level,
                    semanticTag: hierarchyLevel.semanticTag, // h1, h2, h3, etc.
                    elements: group.elements,
                    formatting: group.dominantFormatting,
                    confidence: hierarchyLevel.confidence,
                    html: await this.generateHierarchyHTML(group, hierarchyLevel),
                    boundingBox: this.calculateGroupBoundingBox(group.elements),
                    textContent: group.elements.map(el => el.text).join(' ').trim()
                };

                hierarchy.push(hierarchyElement);
            }

            // Sort hierarchy by level and position
            hierarchy.sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level;
                return a.boundingBox.y - b.boundingBox.y;
            });

            metadata.hierarchyLevels = new Set(hierarchy.map(h => h.level)).size;
            metadata.confidence = this.calculateHierarchyConfidence(hierarchy, fontAnalysis);

            console.log(`✅ Hierarchy analysis complete: ${hierarchy.length} elements across ${metadata.hierarchyLevels} levels`);

            return {
                hierarchy,
                metadata
            };

        } catch (error) {
            console.error('❌ Visual hierarchy analysis failed:', error);
            return {
                hierarchy: [],
                metadata: { ...metadata, error: error.message }
            };
        }
    }

    /**
     * Extract elements with detailed formatting from Azure results
     */
    async extractFormattedElements(azureResults) {
        const elements = [];

        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                // Process words with style information
                if (page.words) {
                    for (const word of page.words) {
                        const element = await this.createFormattedElement(word, page, 'word');
                        elements.push(element);
                    }
                }

                // Process lines for better grouping
                if (page.lines) {
                    for (const line of page.lines) {
                        const element = await this.createFormattedElement(line, page, 'line');
                        elements.push(element);
                    }
                }

                // Process paragraphs for semantic understanding
                if (page.paragraphs) {
                    for (const paragraph of page.paragraphs) {
                        const element = await this.createFormattedElement(paragraph, page, 'paragraph');
                        elements.push(element);
                    }
                }
            }
        }

        return elements;
    }

    /**
     * Create formatted element with rich style information
     */
    async createFormattedElement(azureElement, page, sourceType) {
        const formatting = await this.extractDetailedFormatting(azureElement, page);

        return {
            id: `${sourceType}_${Math.random().toString(36).substr(2, 9)}`,
            text: azureElement.content || '',
            sourceType,
            formatting,
            boundingBox: this.extractBoundingBox(azureElement),
            confidence: azureElement.confidence || 0.8,
            span: azureElement.span,
            styleReference: this.getStyleReference(azureElement, page)
        };
    }

    /**
     * Extract detailed formatting using Azure's styleFont feature
     */
    async extractDetailedFormatting(element, page) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon || [];
        const height = polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

        let formatting = {
            fontSize: Math.round(height * 0.75) || 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            isBold: false,
            isItalic: false,
            isUnderlined: false
        };

        // Extract style from element-level style property
        if (element.style) {
            formatting.fontWeight = element.style.fontWeight || 'normal';
            formatting.fontStyle = element.style.fontStyle || 'normal';
            formatting.isBold = element.style.fontWeight === 'bold';
            formatting.isItalic = element.style.fontStyle === 'italic';

            // Extract font family if available
            if (element.style.fontFamily) {
                formatting.fontFamily = element.style.fontFamily;
            }

            // Extract color if available
            if (element.style.color) {
                formatting.color = element.style.color;
            }
        }

        // Check page-level styles with span matching
        if (page.styles && element.span) {
            const matchingStyle = page.styles.find(style =>
                style.spans?.some(span =>
                    this.spansOverlap(element.span, span)
                )
            );

            if (matchingStyle) {
                formatting.fontWeight = matchingStyle.fontWeight || formatting.fontWeight;
                formatting.fontStyle = matchingStyle.fontStyle || formatting.fontStyle;
                formatting.isBold = matchingStyle.fontWeight === 'bold';
                formatting.isItalic = matchingStyle.fontStyle === 'italic';

                // Override font family if specified in style
                if (matchingStyle.fontFamily) {
                    formatting.fontFamily = matchingStyle.fontFamily;
                }

                // Override color if specified in style
                if (matchingStyle.color) {
                    formatting.color = matchingStyle.color;
                }
            }
        }

        return formatting;
    }

    /**
     * Group elements by proximity and consistent formatting
     */
    async groupElementsByProximityAndFormatting(elements) {
        const groups = [];
        const processed = new Set();

        // Sort elements by position
        const sortedElements = elements.sort((a, b) => {
            if (Math.abs(a.boundingBox.y - b.boundingBox.y) < 5) {
                return a.boundingBox.x - b.boundingBox.x;
            }
            return a.boundingBox.y - b.boundingBox.y;
        });

        for (const element of sortedElements) {
            if (processed.has(element.id)) continue;

            const group = {
                elements: [element],
                dominantFormatting: { ...element.formatting },
                boundingBox: { ...element.boundingBox }
            };

            processed.add(element.id);

            // Find nearby elements with similar formatting
            for (const otherElement of sortedElements) {
                if (processed.has(otherElement.id)) continue;

                if (this.areElementsGroupable(element, otherElement)) {
                    group.elements.push(otherElement);
                    processed.add(otherElement.id);

                    // Update group bounding box
                    group.boundingBox = this.expandBoundingBox(group.boundingBox, otherElement.boundingBox);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Step 3: Formatted Content Reconstruction
     * Line Grouping & HTML Generation
     * Stitches raw text and formatting metadata into clean HTML
     */
    async reconstructFormattedContent(bulletPoints, visualHierarchy, azureResults) {
        console.log('🎨 Reconstructing formatted content with HTML generation...');

        const metadata = {
            totalElements: bulletPoints.length + visualHierarchy.length,
            htmlGenerated: false,
            confidence: 0,
            preservationScore: 0
        };

        try {
            // Generate document structure
            let html = this.generateDocumentCSS();
            html += '<div class="formatted-document">\n';

            // Process hierarchy elements first (titles, headers)
            for (const hierarchyElement of visualHierarchy) {
                html += hierarchyElement.html + '\n';
            }

            // Process bullet points with proper list structure
            if (bulletPoints.length > 0) {
                html += await this.generateStructuredListHTML(bulletPoints);
            }

            // Add remaining content elements
            if (azureResults.layout?.pages) {
                const remainingContent = await this.generateRemainingContentHTML(
                    azureResults.layout.pages,
                    bulletPoints,
                    visualHierarchy
                );
                html += remainingContent;
            }

            html += '</div>';

            metadata.htmlGenerated = true;
            metadata.confidence = this.calculateContentReconstructionConfidence(bulletPoints, visualHierarchy);
            metadata.preservationScore = this.calculateFormatPreservationScore(bulletPoints, visualHierarchy);

            console.log('✅ Content reconstruction complete:', {
                htmlLength: html.length,
                preservationScore: Math.round(metadata.preservationScore * 100) + '%'
            });

            return {
                html,
                metadata
            };

        } catch (error) {
            console.error('❌ Content reconstruction failed:', error);
            return {
                html: '<div class="error">Content reconstruction failed</div>',
                metadata: { ...metadata, error: error.message }
            };
        }
    }

    /**
     * Generate structured <ul>/<li> HTML for bullet points
     */
    async generateStructuredListHTML(bulletPoints) {
        let html = '';
        const listLevels = new Map();

        // Group bullets by level
        for (const bullet of bulletPoints) {
            const level = bullet.listContext?.level || 0;
            if (!listLevels.has(level)) {
                listLevels.set(level, []);
            }
            listLevels.get(level).push(bullet);
        }

        // Generate nested lists
        const sortedLevels = Array.from(listLevels.keys()).sort((a, b) => a - b);

        for (const level of sortedLevels) {
            const bullets = listLevels.get(level);
            const indent = '  '.repeat(level + 1);

            html += `${indent}<ul class="bullet-list level-${level}">\n`;

            for (const bullet of bullets) {
                const cleanText = this.cleanBulletText(bullet.text);
                const bulletClass = this.getBulletClass(bullet);

                html += `${indent}  <li class="${bulletClass}">${this.escapeHtml(cleanText)}</li>\n`;
            }

            html += `${indent}</ul>\n`;
        }

        return html;
    }

    /**
     * Generate HTML for hierarchy elements with semantic tags
     */
    async generateHierarchyHTML(group, hierarchyLevel) {
        const tag = hierarchyLevel.semanticTag;
        const classes = this.getHierarchyClasses(hierarchyLevel);
        const content = group.elements.map(el => el.text).join(' ').trim();

        return `<${tag} class="${classes}">${this.escapeHtml(content)}</${tag}>`;
    }

    // Utility methods

    isBulletPointLine(text) {
        if (!text) return false;
        const trimmed = text.trim();

        // Check for bullet characters
        for (const bullet of this.bulletPatterns) {
            if (trimmed.startsWith(bullet + ' ') || trimmed.startsWith(bullet + '\t')) {
                return true;
            }
        }

        // Check for numbered lists
        return /^\d+[\.\)]\s/.test(trimmed);
    }

    detectBulletFormat(text) {
        if (!text) return '•';
        const trimmed = text.trim();

        for (const bullet of this.bulletPatterns) {
            if (trimmed.startsWith(bullet)) {
                return bullet;
            }
        }

        if (/^\d+[\.\)]/.test(trimmed)) {
            return 'numbered';
        }

        return '•';
    }

    calculateIndentLevel(element) {
        const bbox = this.extractBoundingBox(element);
        return Math.round(bbox.x / 36); // 36 points = 0.5 inch
    }

    generateBulletHTML(content, level, bulletFormat) {
        const cleanText = this.cleanBulletText(content);
        const indent = '  '.repeat(level);
        return `${indent}<li class="bullet-${bulletFormat} level-${level}">${this.escapeHtml(cleanText)}</li>`;
    }

    cleanBulletText(text) {
        if (!text) return '';

        // Remove bullet characters from the beginning
        let cleaned = text.trim();
        for (const bullet of this.bulletPatterns) {
            if (cleaned.startsWith(bullet)) {
                cleaned = cleaned.substring(bullet.length).trim();
                break;
            }
        }

        // Remove numbered list markers
        cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '');

        return cleaned;
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

    spansOverlap(span1, span2) {
        if (!span1 || !span2) return false;
        const start1 = span1.offset;
        const end1 = span1.offset + span1.length;
        const start2 = span2.offset;
        const end2 = span2.offset + span2.length;
        return start1 < end2 && start2 < end1;
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

    generateDocumentCSS() {
        return `<style>
.formatted-document {
    font-family: 'Arial', sans-serif;
    line-height: 1.4;
    color: #000000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 1in;
}

.bullet-list {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.bullet-list.level-0 { margin-left: 0; }
.bullet-list.level-1 { margin-left: 1em; }
.bullet-list.level-2 { margin-left: 2em; }
.bullet-list.level-3 { margin-left: 3em; }

.bullet-list li {
    margin-bottom: 0.3em;
}

h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5em;
    font-weight: bold;
}

h1 { font-size: 1.5em; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.1em; }
h4 { font-size: 1em; }

.hierarchy-title { font-size: 1.5em; font-weight: bold; }
.hierarchy-heading { font-size: 1.3em; font-weight: bold; }
.hierarchy-subheading { font-size: 1.1em; font-weight: bold; }
</style>

`;
    }

    // Confidence calculation methods
    calculateBulletConfidence(bullets) {
        if (bullets.length === 0) return 0;
        const totalConfidence = bullets.reduce((sum, bullet) => sum + bullet.confidence, 0);
        return totalConfidence / bullets.length;
    }

    calculateOverallConfidence(bulletConfidence, hierarchyConfidence, contentConfidence) {
        return (bulletConfidence + hierarchyConfidence + contentConfidence) / 3;
    }

    // Placeholder methods for complete implementation
    deduplicateBulletPoints(bullets) {
        const seen = new Set();
        return bullets.filter(bullet => {
            const key = `${bullet.text.trim().toLowerCase()}_${bullet.boundingBox.x}_${bullet.boundingBox.y}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    analyzeFontPatterns(elements) {
        // Implementation for font pattern analysis
        return {
            fontSizes: [...new Set(elements.map(el => el.formatting.fontSize))].sort((a, b) => b - a),
            commonFontFamily: 'Arial',
            boldElements: elements.filter(el => el.formatting.isBold).length
        };
    }

    calculateHierarchyLevel(group, fontAnalysis) {
        const dominantFontSize = group.dominantFormatting.fontSize;
        const isBold = group.dominantFormatting.isBold;

        let level = 1;
        let semanticTag = 'h1';

        if (dominantFontSize >= this.fontSizeThresholds.title && isBold) {
            level = 1;
            semanticTag = 'h1';
        } else if (dominantFontSize >= this.fontSizeThresholds.heading) {
            level = 2;
            semanticTag = 'h2';
        } else if (dominantFontSize >= this.fontSizeThresholds.subheading || isBold) {
            level = 3;
            semanticTag = 'h3';
        } else {
            level = 4;
            semanticTag = 'h4';
        }

        return {
            level,
            semanticTag,
            confidence: isBold ? 0.9 : 0.7
        };
    }

    calculateHierarchyConfidence(hierarchy, fontAnalysis) {
        if (hierarchy.length === 0) return 0;
        const totalConfidence = hierarchy.reduce((sum, h) => sum + h.confidence, 0);
        return totalConfidence / hierarchy.length;
    }

    areElementsGroupable(element1, element2) {
        // Check proximity (within 10 points vertically)
        const verticalDistance = Math.abs(element1.boundingBox.y - element2.boundingBox.y);
        if (verticalDistance > 10) return false;

        // Check formatting similarity
        const format1 = element1.formatting;
        const format2 = element2.formatting;

        return format1.fontSize === format2.fontSize &&
               format1.fontWeight === format2.fontWeight &&
               format1.fontStyle === format2.fontStyle;
    }

    expandBoundingBox(bbox1, bbox2) {
        return {
            x: Math.min(bbox1.x, bbox2.x),
            y: Math.min(bbox1.y, bbox2.y),
            width: Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - Math.min(bbox1.x, bbox2.x),
            height: Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - Math.min(bbox1.y, bbox2.y)
        };
    }

    calculateGroupBoundingBox(elements) {
        if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        const first = elements[0].boundingBox;
        let result = { ...first };

        for (let i = 1; i < elements.length; i++) {
            result = this.expandBoundingBox(result, elements[i].boundingBox);
        }

        return result;
    }

    getStyleReference(element, page) {
        if (element.span && page.styles) {
            const matchingStyle = page.styles.find(style =>
                style.spans?.some(span => this.spansOverlap(element.span, span))
            );
            return matchingStyle?.id || null;
        }
        return null;
    }

    calculateContentReconstructionConfidence(bulletPoints, hierarchy) {
        const bulletConfidence = this.calculateBulletConfidence(bulletPoints);
        const hierarchyConfidence = this.calculateHierarchyConfidence(hierarchy, {});
        return (bulletConfidence + hierarchyConfidence) / 2;
    }

    calculateFormatPreservationScore(bulletPoints, hierarchy) {
        const totalElements = bulletPoints.length + hierarchy.length;
        if (totalElements === 0) return 0;

        const formattedElements = [...bulletPoints, ...hierarchy].filter(el =>
            el.confidence > 0.7
        );

        return formattedElements.length / totalElements;
    }

    getBulletClass(bullet) {
        const format = bullet.listContext?.bulletFormat || '•';
        const level = bullet.listContext?.level || 0;
        return `bullet-item bullet-${format} level-${level}`;
    }

    getHierarchyClasses(hierarchyLevel) {
        return `hierarchy-element hierarchy-level-${hierarchyLevel.level}`;
    }

    async generateRemainingContentHTML(pages, bulletPoints, hierarchy) {
        // Implementation for generating remaining content HTML
        return '';
    }
}

module.exports = { FormattingDetectionService };