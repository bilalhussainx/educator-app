/**
 * Visual Hierarchy Analysis Service
 * Analyzes styleFont and span data from Azure Layout model
 * Groups text elements based on proximity and consistently applied font-weight/size
 * Assigns semantic HTML tags (H1, H2, H3, etc.) and inline formatting
 */

class VisualHierarchyAnalysisService {
    constructor() {
        this.fontSizeThresholds = {
            title: 18,       // Main document title
            heading: 16,     // Major section headers
            subheading: 14,  // Subsection headers
            emphasis: 12,    // Emphasized text
            body: 11         // Regular body text
        };

        this.hierarchyLevels = {
            1: { tag: 'h1', class: 'document-title', minFontSize: 18 },
            2: { tag: 'h2', class: 'section-header', minFontSize: 16 },
            3: { tag: 'h3', class: 'subsection-header', minFontSize: 14 },
            4: { tag: 'h4', class: 'minor-header', minFontSize: 13 },
            5: { tag: 'h5', class: 'subminor-header', minFontSize: 12 },
            6: { tag: 'h6', class: 'smallest-header', minFontSize: 11 }
        };

        this.inlineFormatting = {
            bold: { tag: 'strong', class: 'bold-text' },
            italic: { tag: 'em', class: 'italic-text' },
            underline: { tag: 'u', class: 'underlined-text' },
            boldItalic: { tag: 'strong', class: 'bold-italic-text', wrapper: 'em' }
        };

        this.proximityThreshold = 10; // Points for grouping elements
        this.confidenceThreshold = 0.7;
    }

    /**
     * Main analysis method - analyzes visual hierarchy from Azure results
     */
    async analyzeVisualHierarchy(azureResults) {
        console.log('📊 Starting visual hierarchy analysis using styleFont and span data...');

        const analysisResult = {
            hierarchyElements: [],
            fontAnalysis: {},
            groupingResults: {},
            inlineElements: [],
            metadata: {
                totalElements: 0,
                hierarchyLevels: 0,
                confidence: 0,
                processingSteps: []
            }
        };

        try {
            // Step 1: Extract all formatted elements with style information
            const formattedElements = await this.extractFormattedElements(azureResults);
            analysisResult.metadata.totalElements = formattedElements.length;
            analysisResult.metadata.processingSteps.push('element-extraction');

            // Step 2: Analyze font patterns across the document
            const fontAnalysis = await this.analyzeFontPatterns(formattedElements);
            analysisResult.fontAnalysis = fontAnalysis;
            analysisResult.metadata.processingSteps.push('font-pattern-analysis');

            // Step 3: Group elements by proximity and consistent formatting
            const groupingResults = await this.groupElementsByProximityAndFormatting(formattedElements, fontAnalysis);
            analysisResult.groupingResults = groupingResults;
            analysisResult.metadata.processingSteps.push('proximity-grouping');

            // Step 4: Assign hierarchy levels based on font size, weight, and position
            const hierarchyElements = await this.assignHierarchyLevels(groupingResults.groups, fontAnalysis);
            analysisResult.hierarchyElements = hierarchyElements;
            analysisResult.metadata.processingSteps.push('hierarchy-assignment');

            // Step 5: Identify inline formatting elements
            const inlineElements = await this.identifyInlineFormatting(formattedElements, hierarchyElements);
            analysisResult.inlineElements = inlineElements;
            analysisResult.metadata.processingSteps.push('inline-formatting');

            // Step 6: Calculate confidence and quality metrics
            analysisResult.metadata.hierarchyLevels = new Set(hierarchyElements.map(h => h.level)).size;
            analysisResult.metadata.confidence = this.calculateHierarchyConfidence(hierarchyElements, fontAnalysis);

            console.log(`✅ Visual hierarchy analysis complete: ${hierarchyElements.length} hierarchy elements across ${analysisResult.metadata.hierarchyLevels} levels`);

            return analysisResult;

        } catch (error) {
            console.error('❌ Visual hierarchy analysis failed:', error);
            return {
                hierarchyElements: [],
                fontAnalysis: {},
                groupingResults: {},
                inlineElements: [],
                metadata: {
                    error: error.message,
                    totalElements: 0,
                    hierarchyLevels: 0,
                    confidence: 0,
                    processingSteps: []
                }
            };
        }
    }

    /**
     * Step 1: Extract formatted elements with detailed style information
     */
    async extractFormattedElements(azureResults) {
        console.log('📄 Extracting formatted elements with style information...');

        const elements = [];

        if (!azureResults.layout?.pages) {
            return elements;
        }

        for (const page of azureResults.layout.pages) {
            // Extract from words (highest granularity)
            if (page.words) {
                for (const word of page.words) {
                    const element = await this.createFormattedElement(word, page, 'word');
                    elements.push(element);
                }
            }

            // Extract from lines (medium granularity)
            if (page.lines) {
                for (const line of page.lines) {
                    const element = await this.createFormattedElement(line, page, 'line');
                    elements.push(element);
                }
            }

            // Extract from paragraphs (low granularity, high semantic value)
            if (page.paragraphs) {
                for (const paragraph of page.paragraphs) {
                    const element = await this.createFormattedElement(paragraph, page, 'paragraph');
                    elements.push(element);
                }
            }
        }

        console.log(`📝 Extracted ${elements.length} formatted elements`);
        return elements;
    }

    /**
     * Create formatted element with rich style information from Azure
     */
    async createFormattedElement(azureElement, page, sourceType) {
        const styleInfo = await this.extractStyleInformation(azureElement, page);
        const boundingBox = this.extractBoundingBox(azureElement);

        return {
            id: `${sourceType}_${Math.random().toString(36).substr(2, 9)}`,
            text: azureElement.content || '',
            sourceType,
            boundingBox,

            style: styleInfo,

            position: {
                page: page.pageNumber || 1,
                x: boundingBox.x,
                y: boundingBox.y,
                alignment: this.detectAlignment(boundingBox, page)
            },

            metadata: {
                confidence: azureElement.confidence || 0.8,
                span: azureElement.span,
                azurePolygon: azureElement.polygon
            }
        };
    }

    /**
     * Extract comprehensive style information using Azure's styleFont feature
     */
    async extractStyleInformation(element, page) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon || [];
        const height = polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

        // Initialize style with defaults
        let style = {
            fontSize: Math.round(height * 0.75) || 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            backgroundColor: 'transparent',
            textDecoration: 'none',

            // Boolean flags for quick checks
            isBold: false,
            isItalic: false,
            isUnderlined: false,

            // Azure-specific style information
            azureStyle: null,
            styleConfidence: 0.8
        };

        // Extract element-level style (highest priority)
        if (element.style) {
            style.fontWeight = element.style.fontWeight || style.fontWeight;
            style.fontStyle = element.style.fontStyle || style.fontStyle;
            style.fontSize = element.style.fontSize || style.fontSize;
            style.fontFamily = element.style.fontFamily || style.fontFamily;
            style.color = element.style.color || style.color;
            style.backgroundColor = element.style.backgroundColor || style.backgroundColor;

            style.isBold = element.style.fontWeight === 'bold';
            style.isItalic = element.style.fontStyle === 'italic';
            style.isUnderlined = element.style.textDecoration?.includes('underline') || false;

            style.azureStyle = element.style;
            style.styleConfidence = 0.95; // High confidence for element-level styles
        }

        // Enhance with page-level styles using span matching
        if (page.styles && element.span) {
            const matchingStyle = await this.findMatchingPageStyle(element.span, page.styles);

            if (matchingStyle) {
                // Override with page-level style information
                style.fontWeight = matchingStyle.fontWeight || style.fontWeight;
                style.fontStyle = matchingStyle.fontStyle || style.fontStyle;
                style.color = matchingStyle.color || style.color;
                style.backgroundColor = matchingStyle.backgroundColor || style.backgroundColor;

                style.isBold = matchingStyle.fontWeight === 'bold';
                style.isItalic = matchingStyle.fontStyle === 'italic';

                if (matchingStyle.textDecoration) {
                    style.textDecoration = matchingStyle.textDecoration;
                    style.isUnderlined = matchingStyle.textDecoration.includes('underline');
                }

                style.styleConfidence = Math.max(style.styleConfidence, matchingStyle.confidence || 0.85);
            }
        }

        // Infer style from visual characteristics (fallback)
        if (!style.azureStyle) {
            style = await this.inferStyleFromVisualCharacteristics(style, polygon, height);
        }

        return style;
    }

    /**
     * Find matching page-level style using span overlap
     */
    async findMatchingPageStyle(elementSpan, pageStyles) {
        for (const style of pageStyles) {
            if (style.spans) {
                for (const span of style.spans) {
                    if (this.spansOverlap(elementSpan, span)) {
                        return {
                            ...style,
                            confidence: style.confidence || 0.85
                        };
                    }
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
     * Step 2: Analyze font patterns across the document
     */
    async analyzeFontPatterns(elements) {
        console.log('🔍 Analyzing font patterns across the document...');

        const fontAnalysis = {
            fontSizes: new Map(),
            fontFamilies: new Map(),
            fontWeights: new Map(),
            colors: new Map(),

            // Statistical analysis
            statistics: {
                mostCommonFontSize: null,
                mostCommonFontFamily: null,
                fontSizeRange: { min: Infinity, max: 0 },
                boldPercentage: 0,
                italicPercentage: 0
            },

            // Hierarchy indicators
            hierarchyIndicators: {
                titleCandidates: [],
                headerCandidates: [],
                bodyTextCandidates: []
            }
        };

        // Collect font usage statistics
        for (const element of elements) {
            const style = element.style;

            // Font size distribution
            const fontSize = style.fontSize;
            fontAnalysis.fontSizes.set(fontSize, (fontAnalysis.fontSizes.get(fontSize) || 0) + 1);

            // Font family distribution
            const fontFamily = style.fontFamily;
            fontAnalysis.fontFamilies.set(fontFamily, (fontAnalysis.fontFamilies.get(fontFamily) || 0) + 1);

            // Font weight distribution
            const fontWeight = style.fontWeight;
            fontAnalysis.fontWeights.set(fontWeight, (fontAnalysis.fontWeights.get(fontWeight) || 0) + 1);

            // Color distribution
            const color = style.color;
            fontAnalysis.colors.set(color, (fontAnalysis.colors.get(color) || 0) + 1);

            // Update statistics
            fontAnalysis.statistics.fontSizeRange.min = Math.min(fontAnalysis.statistics.fontSizeRange.min, fontSize);
            fontAnalysis.statistics.fontSizeRange.max = Math.max(fontAnalysis.statistics.fontSizeRange.max, fontSize);
        }

        // Calculate most common values
        fontAnalysis.statistics.mostCommonFontSize = this.getMostCommon(fontAnalysis.fontSizes);
        fontAnalysis.statistics.mostCommonFontFamily = this.getMostCommon(fontAnalysis.fontFamilies);

        // Calculate formatting percentages
        const totalElements = elements.length;
        const boldElements = elements.filter(e => e.style.isBold).length;
        const italicElements = elements.filter(e => e.style.isItalic).length;

        fontAnalysis.statistics.boldPercentage = (boldElements / totalElements) * 100;
        fontAnalysis.statistics.italicPercentage = (italicElements / totalElements) * 100;

        // Identify hierarchy indicators
        fontAnalysis.hierarchyIndicators = await this.identifyHierarchyIndicators(elements, fontAnalysis);

        console.log(`📊 Font analysis complete: ${fontAnalysis.fontSizes.size} font sizes, ${fontAnalysis.fontFamilies.size} font families`);

        return fontAnalysis;
    }

    /**
     * Step 3: Group elements by proximity and consistent formatting
     */
    async groupElementsByProximityAndFormatting(elements, fontAnalysis) {
        console.log('🔗 Grouping elements by proximity and formatting...');

        const groups = [];
        const processed = new Set();

        // Sort elements by position (top to bottom, left to right)
        const sortedElements = elements.sort((a, b) => {
            if (a.position.page !== b.position.page) {
                return a.position.page - b.position.page;
            }
            if (Math.abs(a.position.y - b.position.y) < this.proximityThreshold) {
                return a.position.x - b.position.x;
            }
            return a.position.y - b.position.y;
        });

        for (const element of sortedElements) {
            if (processed.has(element.id)) continue;

            const group = {
                id: `group_${groups.length}`,
                elements: [element],
                dominantStyle: { ...element.style },
                boundingBox: { ...element.boundingBox },
                position: { ...element.position },
                confidence: element.metadata.confidence
            };

            processed.add(element.id);

            // Find nearby elements with similar formatting
            for (const other of sortedElements) {
                if (processed.has(other.id)) continue;

                if (this.shouldElementsBeGrouped(element, other, fontAnalysis)) {
                    group.elements.push(other);
                    processed.add(other.id);

                    // Update group properties
                    group.boundingBox = this.expandBoundingBox(group.boundingBox, other.boundingBox);
                    group.confidence = Math.min(group.confidence, other.metadata.confidence);
                }
            }

            // Update dominant style based on all elements in group
            group.dominantStyle = await this.calculateDominantStyle(group.elements);

            groups.push(group);
        }

        console.log(`🔗 Created ${groups.length} element groups`);

        return {
            groups,
            totalGroups: groups.length,
            averageGroupSize: groups.reduce((sum, g) => sum + g.elements.length, 0) / groups.length,
            singletonGroups: groups.filter(g => g.elements.length === 1).length
        };
    }

    /**
     * Determine if two elements should be grouped together
     */
    shouldElementsBeGrouped(element1, element2, fontAnalysis) {
        // Check proximity (within threshold)
        const distance = this.calculateDistance(element1.position, element2.position);
        if (distance > this.proximityThreshold) return false;

        // Check formatting similarity
        const style1 = element1.style;
        const style2 = element2.style;

        // Font size must match or be very close
        if (Math.abs(style1.fontSize - style2.fontSize) > 1) return false;

        // Font weight must match
        if (style1.fontWeight !== style2.fontWeight) return false;

        // Font style should match for grouping
        if (style1.fontStyle !== style2.fontStyle) return false;

        // Same page
        if (element1.position.page !== element2.position.page) return false;

        return true;
    }

    /**
     * Step 4: Assign hierarchy levels based on font analysis
     */
    async assignHierarchyLevels(groups, fontAnalysis) {
        console.log('🏗️ Assigning hierarchy levels to element groups...');

        const hierarchyElements = [];

        for (const group of groups) {
            const hierarchyLevel = await this.calculateHierarchyLevel(group, fontAnalysis);

            if (hierarchyLevel.level > 0) { // Only include elements that qualify for hierarchy
                const hierarchyElement = {
                    id: `hierarchy_${hierarchyElements.length}`,
                    level: hierarchyLevel.level,
                    semanticTag: hierarchyLevel.semanticTag,
                    cssClass: hierarchyLevel.cssClass,

                    content: {
                        text: group.elements.map(e => e.text).join(' ').trim(),
                        elements: group.elements.map(e => e.id)
                    },

                    style: group.dominantStyle,
                    position: group.position,
                    boundingBox: group.boundingBox,

                    confidence: hierarchyLevel.confidence,

                    html: await this.generateHierarchyHTML(group, hierarchyLevel),

                    metadata: {
                        groupId: group.id,
                        elementCount: group.elements.length,
                        detectionReason: hierarchyLevel.reason
                    }
                };

                hierarchyElements.push(hierarchyElement);
            }
        }

        // Sort by hierarchy level and position
        hierarchyElements.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            if (a.position.page !== b.position.page) return a.position.page - b.position.page;
            return a.position.y - b.position.y;
        });

        console.log(`🏗️ Assigned ${hierarchyElements.length} hierarchy levels`);

        return hierarchyElements;
    }

    /**
     * Calculate hierarchy level for a group of elements
     */
    async calculateHierarchyLevel(group, fontAnalysis) {
        const style = group.dominantStyle;
        const fontSize = style.fontSize;
        const isBold = style.isBold;
        const isItalic = style.isItalic;

        const mostCommonSize = fontAnalysis.statistics.mostCommonFontSize;
        const maxSize = fontAnalysis.statistics.fontSizeRange.max;

        let level = 0;
        let semanticTag = 'div';
        let cssClass = 'text-element';
        let confidence = 0.5;
        let reason = 'default';

        // Title detection (largest font, usually bold)
        if (fontSize >= maxSize - 2 && isBold && fontSize >= this.fontSizeThresholds.title) {
            level = 1;
            semanticTag = 'h1';
            cssClass = 'document-title';
            confidence = 0.95;
            reason = 'largest-bold-font';
        }
        // Major headings (large font, bold)
        else if (fontSize >= this.fontSizeThresholds.heading && isBold) {
            level = 2;
            semanticTag = 'h2';
            cssClass = 'section-header';
            confidence = 0.90;
            reason = 'large-bold-font';
        }
        // Subheadings (medium-large font, bold)
        else if (fontSize >= this.fontSizeThresholds.subheading && isBold) {
            level = 3;
            semanticTag = 'h3';
            cssClass = 'subsection-header';
            confidence = 0.85;
            reason = 'medium-bold-font';
        }
        // Minor headings (slightly larger than body, bold)
        else if (fontSize > mostCommonSize && isBold) {
            level = 4;
            semanticTag = 'h4';
            cssClass = 'minor-header';
            confidence = 0.80;
            reason = 'above-average-bold';
        }
        // Emphasized text (bold but not much larger)
        else if (isBold && fontSize >= mostCommonSize) {
            level = 5;
            semanticTag = 'h5';
            cssClass = 'emphasized-text';
            confidence = 0.70;
            reason = 'bold-emphasis';
        }
        // Small headers or captions
        else if (fontSize < mostCommonSize && isBold) {
            level = 6;
            semanticTag = 'h6';
            cssClass = 'small-header';
            confidence = 0.65;
            reason = 'small-bold';
        }

        // Adjust confidence based on position and context
        if (group.position.y < 100) { // Near top of page
            confidence += 0.05;
        }

        if (group.elements.length === 1) { // Single element (likely header)
            confidence += 0.05;
        }

        return {
            level,
            semanticTag,
            cssClass,
            confidence: Math.min(confidence, 1.0),
            reason
        };
    }

    /**
     * Step 5: Identify inline formatting elements
     */
    async identifyInlineFormatting(elements, hierarchyElements) {
        console.log('🎨 Identifying inline formatting elements...');

        const inlineElements = [];
        const hierarchyElementIds = new Set(
            hierarchyElements.flatMap(h => h.content.elements)
        );

        for (const element of elements) {
            // Skip elements already part of hierarchy
            if (hierarchyElementIds.has(element.id)) continue;

            const inlineFormatting = await this.determineInlineFormatting(element);

            if (inlineFormatting.hasFormatting) {
                const inlineElement = {
                    id: `inline_${inlineElements.length}`,
                    elementId: element.id,
                    text: element.text,

                    formatting: inlineFormatting,

                    html: await this.generateInlineHTML(element, inlineFormatting),

                    position: element.position,
                    confidence: inlineFormatting.confidence
                };

                inlineElements.push(inlineElement);
            }
        }

        console.log(`🎨 Identified ${inlineElements.length} inline formatting elements`);

        return inlineElements;
    }

    /**
     * Determine inline formatting for an element
     */
    async determineInlineFormatting(element) {
        const style = element.style;
        const formatting = {
            hasFormatting: false,
            type: 'none',
            tag: 'span',
            cssClass: '',
            attributes: {},
            confidence: 0.5
        };

        // Bold and italic combination
        if (style.isBold && style.isItalic) {
            formatting.hasFormatting = true;
            formatting.type = 'bold-italic';
            formatting.tag = 'strong';
            formatting.cssClass = 'bold-italic-text';
            formatting.wrapper = 'em';
            formatting.confidence = 0.95;
        }
        // Bold only
        else if (style.isBold) {
            formatting.hasFormatting = true;
            formatting.type = 'bold';
            formatting.tag = 'strong';
            formatting.cssClass = 'bold-text';
            formatting.confidence = 0.90;
        }
        // Italic only
        else if (style.isItalic) {
            formatting.hasFormatting = true;
            formatting.type = 'italic';
            formatting.tag = 'em';
            formatting.cssClass = 'italic-text';
            formatting.confidence = 0.90;
        }
        // Underlined
        else if (style.isUnderlined) {
            formatting.hasFormatting = true;
            formatting.type = 'underline';
            formatting.tag = 'u';
            formatting.cssClass = 'underlined-text';
            formatting.confidence = 0.85;
        }
        // Colored text (non-black)
        else if (style.color !== '#000000' && style.color !== 'black') {
            formatting.hasFormatting = true;
            formatting.type = 'colored';
            formatting.tag = 'span';
            formatting.cssClass = 'colored-text';
            formatting.attributes.style = `color: ${style.color}`;
            formatting.confidence = 0.80;
        }

        return formatting;
    }

    /**
     * Generate semantic HTML for hierarchy elements
     */
    async generateHierarchyHTML(group, hierarchyLevel) {
        const content = this.escapeHtml(group.elements.map(e => e.text).join(' ').trim());
        const tag = hierarchyLevel.semanticTag;
        const cssClass = hierarchyLevel.cssClass;

        return `<${tag} class="${cssClass}">${content}</${tag}>`;
    }

    /**
     * Generate HTML for inline formatting elements
     */
    async generateInlineHTML(element, inlineFormatting) {
        const content = this.escapeHtml(element.text);
        const tag = inlineFormatting.tag;
        const cssClass = inlineFormatting.cssClass;

        let attributes = '';
        if (inlineFormatting.attributes) {
            attributes = Object.entries(inlineFormatting.attributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
        }

        let html = `<${tag} class="${cssClass}"${attributes ? ' ' + attributes : ''}>${content}</${tag}>`;

        // Handle wrapper tags (e.g., bold-italic)
        if (inlineFormatting.wrapper) {
            html = `<${inlineFormatting.wrapper}>${html}</${inlineFormatting.wrapper}>`;
        }

        return html;
    }

    // Utility methods

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

    detectAlignment(boundingBox, page) {
        const pageWidth = page.width || 612; // Standard letter width
        const elementCenter = boundingBox.x + (boundingBox.width / 2);

        if (elementCenter < pageWidth * 0.33) return 'left';
        if (elementCenter > pageWidth * 0.67) return 'right';
        return 'center';
    }

    async inferStyleFromVisualCharacteristics(style, polygon, height) {
        // Infer bold from height (taller text might be bold)
        if (height > 14) {
            style.isBold = true;
            style.fontWeight = 'bold';
        }

        // Infer size from height
        style.fontSize = Math.round(height * 0.75);

        return style;
    }

    getMostCommon(map) {
        let maxCount = 0;
        let mostCommon = null;

        for (const [key, count] of map.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = key;
            }
        }

        return mostCommon;
    }

    async identifyHierarchyIndicators(elements, fontAnalysis) {
        const indicators = {
            titleCandidates: [],
            headerCandidates: [],
            bodyTextCandidates: []
        };

        const maxFontSize = fontAnalysis.statistics.fontSizeRange.max;
        const minFontSize = fontAnalysis.statistics.fontSizeRange.min;
        const avgFontSize = (maxFontSize + minFontSize) / 2;

        for (const element of elements) {
            const fontSize = element.style.fontSize;
            const isBold = element.style.isBold;

            if (fontSize >= maxFontSize - 2 && isBold) {
                indicators.titleCandidates.push(element);
            } else if (fontSize > avgFontSize && isBold) {
                indicators.headerCandidates.push(element);
            } else if (!isBold && fontSize <= avgFontSize) {
                indicators.bodyTextCandidates.push(element);
            }
        }

        return indicators;
    }

    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    expandBoundingBox(bbox1, bbox2) {
        return {
            x: Math.min(bbox1.x, bbox2.x),
            y: Math.min(bbox1.y, bbox2.y),
            width: Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - Math.min(bbox1.x, bbox2.x),
            height: Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - Math.min(bbox1.y, bbox2.y)
        };
    }

    async calculateDominantStyle(elements) {
        // Calculate the most common style properties in the group
        const fontSizes = elements.map(e => e.style.fontSize);
        const fontWeights = elements.map(e => e.style.fontWeight);
        const fontStyles = elements.map(e => e.style.fontStyle);

        return {
            fontSize: this.getMostCommonFromArray(fontSizes),
            fontWeight: this.getMostCommonFromArray(fontWeights),
            fontStyle: this.getMostCommonFromArray(fontStyles),
            isBold: elements.some(e => e.style.isBold),
            isItalic: elements.some(e => e.style.isItalic),
            isUnderlined: elements.some(e => e.style.isUnderlined)
        };
    }

    getMostCommonFromArray(arr) {
        const counts = {};
        for (const item of arr) {
            counts[item] = (counts[item] || 0) + 1;
        }

        let maxCount = 0;
        let mostCommon = arr[0];

        for (const [item, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = item;
            }
        }

        return mostCommon;
    }

    calculateHierarchyConfidence(hierarchyElements, fontAnalysis) {
        if (hierarchyElements.length === 0) return 0;

        const totalConfidence = hierarchyElements.reduce((sum, h) => sum + h.confidence, 0);
        const avgConfidence = totalConfidence / hierarchyElements.length;

        // Bonus for having multiple hierarchy levels
        const uniqueLevels = new Set(hierarchyElements.map(h => h.level)).size;
        const levelBonus = Math.min(uniqueLevels * 0.05, 0.2);

        return Math.min(avgConfidence + levelBonus, 1.0);
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
}

module.exports = { VisualHierarchyAnalysisService };