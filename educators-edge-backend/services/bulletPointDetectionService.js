/**
 * Enhanced Bullet Point Detection Service
 * Implements sophisticated bullet point detection using Azure Layout model's List and Line analysis
 * Generates clean, structured <ul>/<li> HTML elements with high confidence
 */

class BulletPointDetectionService {
    constructor() {
        this.bulletPatterns = {
            // Unicode bullet characters
            solid: ['•', '●', '◉', '⬤'],
            hollow: ['◦', '○', '◯', '⭕'],
            square: ['▪', '▫', '■', '□', '◾', '◽'],
            triangle: ['▶', '▷', '►', '▻'],
            star: ['★', '☆', '✦', '✧'],
            arrow: ['→', '➔', '➜', '➤'],
            dash: ['-', '–', '—', '~'],
            other: ['✓', '✗', '×', '+', '*', '◆', '◇', '♦']
        };

        this.numberPatterns = [
            /^\d+\./,           // 1. 2. 3.
            /^\d+\)/,           // 1) 2) 3)
            /^\(\d+\)/,         // (1) (2) (3)
            /^[a-z]\./,         // a. b. c.
            /^[a-z]\)/,         // a) b) c)
            /^[A-Z]\./,         // A. B. C.
            /^[A-Z]\)/,         // A) B) C)
            /^[ivx]+\./,        // i. ii. iii.
            /^[IVX]+\./         // I. II. III.
        ];

        this.confidenceThresholds = {
            azureList: 0.95,     // High confidence for Azure-detected lists
            lineAnalysis: 0.75,   // Medium confidence for line analysis
            patternMatch: 0.65,   // Lower confidence for pattern matching
            contextual: 0.80      // High confidence when context supports
        };

        this.indentUnit = 36; // Points per indent level (0.5 inch)
    }

    /**
     * Main detection method - analyzes Azure results for bullet points
     */
    async detectBulletPoints(azureResults) {
        console.log('🎯 Starting enhanced bullet point detection...');

        const detectionResult = {
            bulletPoints: [],
            listStructures: [],
            metadata: {
                detectionMethods: [],
                totalConfidence: 0,
                qualityScore: 0,
                statistics: {}
            }
        };

        try {
            // Method 1: Azure List Detection (Primary - highest confidence)
            const azureListResults = await this.detectFromAzureLists(azureResults);
            if (azureListResults.bulletPoints.length > 0) {
                detectionResult.bulletPoints.push(...azureListResults.bulletPoints);
                detectionResult.listStructures.push(...azureListResults.listStructures);
                detectionResult.metadata.detectionMethods.push('azure-list-detection');
                console.log(`📋 Azure Lists: Found ${azureListResults.bulletPoints.length} bullets`);
            }

            // Method 2: Line Analysis Detection (Secondary)
            const lineAnalysisResults = await this.detectFromLineAnalysis(azureResults);
            if (lineAnalysisResults.bulletPoints.length > 0) {
                detectionResult.bulletPoints.push(...lineAnalysisResults.bulletPoints);
                detectionResult.metadata.detectionMethods.push('line-analysis');
                console.log(`📝 Line Analysis: Found ${lineAnalysisResults.bulletPoints.length} additional bullets`);
            }

            // Method 3: Pattern-Based Detection (Fallback)
            const patternResults = await this.detectFromPatterns(azureResults);
            if (patternResults.bulletPoints.length > 0) {
                detectionResult.bulletPoints.push(...patternResults.bulletPoints);
                detectionResult.metadata.detectionMethods.push('pattern-detection');
                console.log(`🔍 Pattern Detection: Found ${patternResults.bulletPoints.length} additional bullets`);
            }

            // Method 4: Contextual Enhancement
            const enhancedResults = await this.enhanceWithContext(detectionResult.bulletPoints, azureResults);
            detectionResult.bulletPoints = enhancedResults.bulletPoints;
            detectionResult.metadata.detectionMethods.push('contextual-enhancement');

            // Remove duplicates and validate
            detectionResult.bulletPoints = this.deduplicateAndValidate(detectionResult.bulletPoints);

            // Build hierarchical list structures
            detectionResult.listStructures = await this.buildListHierarchy(detectionResult.bulletPoints);

            // Calculate metadata
            detectionResult.metadata.totalConfidence = this.calculateOverallConfidence(detectionResult.bulletPoints);
            detectionResult.metadata.qualityScore = this.calculateQualityScore(detectionResult.bulletPoints, detectionResult.listStructures);
            detectionResult.metadata.statistics = this.generateStatistics(detectionResult.bulletPoints);

            console.log(`✅ Bullet point detection complete: ${detectionResult.bulletPoints.length} bullets in ${detectionResult.listStructures.length} lists`);

            return detectionResult;

        } catch (error) {
            console.error('❌ Bullet point detection failed:', error);
            return {
                bulletPoints: [],
                listStructures: [],
                metadata: {
                    error: error.message,
                    detectionMethods: [],
                    totalConfidence: 0,
                    qualityScore: 0,
                    statistics: {}
                }
            };
        }
    }

    /**
     * Method 1: Detect bullets from Azure's List detection
     */
    async detectFromAzureLists(azureResults) {
        const bulletPoints = [];
        const listStructures = [];

        if (!azureResults.layout?.lists) {
            return { bulletPoints, listStructures };
        }

        for (const azureList of azureResults.layout.lists) {
            const listStructure = {
                id: `azure_list_${azureList.listId || Date.now()}`,
                type: 'structured-list',
                confidence: this.confidenceThresholds.azureList,
                source: 'azure-detection',
                items: [],
                metadata: {
                    azureListId: azureList.listId,
                    totalItems: azureList.items?.length || 0
                }
            };

            if (azureList.items) {
                for (let i = 0; i < azureList.items.length; i++) {
                    const item = azureList.items[i];
                    const bulletPoint = await this.createBulletPointFromAzureItem(item, azureList, i);

                    if (bulletPoint) {
                        bulletPoints.push(bulletPoint);
                        listStructure.items.push(bulletPoint.id);
                    }
                }
            }

            if (listStructure.items.length > 0) {
                listStructures.push(listStructure);
            }
        }

        return { bulletPoints, listStructures };
    }

    /**
     * Create bullet point from Azure list item
     */
    async createBulletPointFromAzureItem(item, azureList, index) {
        if (!item.content) return null;

        const bulletFormat = this.detectBulletFormat(item.content);
        const cleanText = this.extractCleanText(item.content, bulletFormat);

        return {
            id: `azure_bullet_${azureList.listId || 'unknown'}_${index}`,
            text: item.content,
            cleanText: cleanText,
            type: 'bullet-point',
            source: 'azure-list',
            confidence: this.confidenceThresholds.azureList,

            formatting: {
                bulletType: bulletFormat.type,
                bulletChar: bulletFormat.char,
                isNumbered: bulletFormat.isNumbered,
                level: item.level || 0
            },

            position: {
                boundingBox: this.extractBoundingBox(item),
                indentLevel: this.calculateIndentLevel(item),
                pageNumber: this.getPageNumber(item)
            },

            structure: {
                listId: azureList.listId,
                itemIndex: index,
                parentLevel: item.level > 0 ? item.level - 1 : null,
                hasChildren: false // Will be determined later
            },

            html: this.generateBulletHTML(cleanText, bulletFormat, item.level || 0),

            metadata: {
                azureConfidence: item.confidence,
                span: item.span,
                detectionMethod: 'azure-list-item'
            }
        };
    }

    /**
     * Method 2: Detect bullets from line analysis
     */
    async detectFromLineAnalysis(azureResults) {
        const bulletPoints = [];

        if (!azureResults.layout?.pages) {
            return { bulletPoints };
        }

        for (const page of azureResults.layout.pages) {
            if (!page.lines) continue;

            for (let i = 0; i < page.lines.length; i++) {
                const line = page.lines[i];

                if (this.isBulletLine(line.content)) {
                    const bulletPoint = await this.createBulletPointFromLine(line, page, i);
                    if (bulletPoint) {
                        bulletPoints.push(bulletPoint);
                    }
                }
            }
        }

        return { bulletPoints };
    }

    /**
     * Create bullet point from line analysis
     */
    async createBulletPointFromLine(line, page, index) {
        if (!line.content) return null;

        const bulletFormat = this.detectBulletFormat(line.content);
        const cleanText = this.extractCleanText(line.content, bulletFormat);
        const indentLevel = this.calculateIndentLevel(line);

        return {
            id: `line_bullet_${page.pageNumber || 1}_${index}`,
            text: line.content,
            cleanText: cleanText,
            type: 'bullet-point',
            source: 'line-analysis',
            confidence: this.confidenceThresholds.lineAnalysis,

            formatting: {
                bulletType: bulletFormat.type,
                bulletChar: bulletFormat.char,
                isNumbered: bulletFormat.isNumbered,
                level: indentLevel
            },

            position: {
                boundingBox: this.extractBoundingBox(line),
                indentLevel: indentLevel,
                pageNumber: page.pageNumber || 1
            },

            structure: {
                listId: null, // Will be assigned during hierarchy building
                itemIndex: null,
                parentLevel: indentLevel > 0 ? indentLevel - 1 : null,
                hasChildren: false
            },

            html: this.generateBulletHTML(cleanText, bulletFormat, indentLevel),

            metadata: {
                lineConfidence: line.confidence,
                span: line.span,
                detectionMethod: 'line-analysis'
            }
        };
    }

    /**
     * Method 3: Pattern-based detection (fallback)
     */
    async detectFromPatterns(azureResults) {
        const bulletPoints = [];

        if (!azureResults.layout?.pages) {
            return { bulletPoints };
        }

        // Analyze words and paragraphs for bullet patterns
        for (const page of azureResults.layout.pages) {
            // Check paragraphs first
            if (page.paragraphs) {
                for (let i = 0; i < page.paragraphs.length; i++) {
                    const paragraph = page.paragraphs[i];

                    if (this.containsBulletPattern(paragraph.content)) {
                        const bullets = await this.extractBulletsFromParagraph(paragraph, page, i);
                        bulletPoints.push(...bullets);
                    }
                }
            }

            // Check individual words for missed bullets
            if (page.words) {
                const wordBullets = await this.extractBulletsFromWords(page.words, page);
                bulletPoints.push(...wordBullets);
            }
        }

        return { bulletPoints };
    }

    /**
     * Method 4: Contextual enhancement
     */
    async enhanceWithContext(bulletPoints, azureResults) {
        console.log('🔗 Enhancing bullets with contextual information...');

        const enhancedBullets = [];

        for (const bullet of bulletPoints) {
            const enhanced = { ...bullet };

            // Enhance with surrounding context
            const context = await this.analyzeSurroundingContext(bullet, azureResults);
            enhanced.context = context;

            // Adjust confidence based on context
            enhanced.confidence = this.adjustConfidenceWithContext(bullet.confidence, context);

            // Detect semantic type based on content
            enhanced.semanticType = this.classifyBulletSemanticType(bullet.cleanText);

            // Analyze text quality and completeness
            enhanced.quality = this.analyzeBulletQuality(bullet);

            enhancedBullets.push(enhanced);
        }

        return { bulletPoints: enhancedBullets };
    }

    /**
     * Build hierarchical list structures from flat bullet points
     */
    async buildListHierarchy(bulletPoints) {
        const listStructures = [];
        const processed = new Set();

        // Group bullets by proximity and indent level
        const groups = this.groupBulletsByProximity(bulletPoints);

        for (const group of groups) {
            const listStructure = {
                id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: 'hierarchical-list',
                confidence: this.calculateGroupConfidence(group),
                source: 'hierarchy-builder',
                items: [],
                levels: this.getUniqueLevels(group),
                metadata: {
                    totalItems: group.length,
                    maxDepth: Math.max(...group.map(b => b.formatting.level)),
                    bulletTypes: [...new Set(group.map(b => b.formatting.bulletType))]
                }
            };

            // Build hierarchy within the group
            const hierarchy = this.buildGroupHierarchy(group);
            listStructure.hierarchy = hierarchy;
            listStructure.items = group.map(b => b.id);

            // Mark all bullets in this group as processed
            group.forEach(bullet => processed.add(bullet.id));

            listStructures.push(listStructure);
        }

        return listStructures;
    }

    /**
     * Generate clean, structured <ul>/<li> HTML elements
     */
    generateStructuredListHTML(bulletPoints, listStructures) {
        console.log('🎨 Generating structured HTML for bullet points...');

        let html = '';

        for (const listStructure of listStructures) {
            html += this.generateListHTML(listStructure, bulletPoints);
        }

        return html;
    }

    /**
     * Generate HTML for a single list structure
     */
    generateListHTML(listStructure, bulletPoints) {
        const listBullets = bulletPoints.filter(b => listStructure.items.includes(b.id));

        if (listBullets.length === 0) return '';

        // Sort bullets by position
        listBullets.sort((a, b) => {
            if (a.position.pageNumber !== b.position.pageNumber) {
                return a.position.pageNumber - b.position.pageNumber;
            }
            return a.position.boundingBox.y - b.position.boundingBox.y;
        });

        let html = `<ul class="structured-list" data-list-id="${listStructure.id}">\n`;

        // Group by level for proper nesting
        const levelGroups = this.groupByLevel(listBullets);
        html += this.generateNestedListHTML(levelGroups, 0);

        html += '</ul>\n';

        return html;
    }

    /**
     * Generate nested HTML for multi-level lists
     */
    generateNestedListHTML(levelGroups, currentLevel) {
        let html = '';
        const bullets = levelGroups[currentLevel] || [];

        for (const bullet of bullets) {
            const itemClass = this.getBulletItemClass(bullet);
            html += `  <li class="${itemClass}" data-bullet-id="${bullet.id}">`;
            html += this.escapeHtml(bullet.cleanText);

            // Check for sub-bullets
            const hasSubBullets = levelGroups[currentLevel + 1] && levelGroups[currentLevel + 1].length > 0;
            if (hasSubBullets) {
                html += '\n    <ul class="sub-list">\n';
                html += this.generateNestedListHTML(levelGroups, currentLevel + 1);
                html += '    </ul>\n  ';
            }

            html += '</li>\n';
        }

        return html;
    }

    // Utility methods for bullet detection

    isBulletLine(text) {
        if (!text) return false;
        const trimmed = text.trim();

        // Check for bullet characters
        for (const category of Object.values(this.bulletPatterns)) {
            for (const bullet of category) {
                if (trimmed.startsWith(bullet + ' ') || trimmed.startsWith(bullet + '\t')) {
                    return true;
                }
            }
        }

        // Check for numbered patterns
        return this.numberPatterns.some(pattern => pattern.test(trimmed));
    }

    containsBulletPattern(text) {
        if (!text) return false;

        // Check for bullet characters anywhere in text
        for (const category of Object.values(this.bulletPatterns)) {
            for (const bullet of category) {
                if (text.includes(bullet)) return true;
            }
        }

        // Check for numbered patterns
        return this.numberPatterns.some(pattern => pattern.test(text));
    }

    detectBulletFormat(text) {
        if (!text) return { type: 'none', char: '', isNumbered: false };

        const trimmed = text.trim();

        // Check numbered patterns first
        for (const pattern of this.numberPatterns) {
            if (pattern.test(trimmed)) {
                return {
                    type: 'numbered',
                    char: trimmed.match(pattern)[0],
                    isNumbered: true
                };
            }
        }

        // Check bullet character patterns
        for (const [category, bullets] of Object.entries(this.bulletPatterns)) {
            for (const bullet of bullets) {
                if (trimmed.startsWith(bullet)) {
                    return {
                        type: category,
                        char: bullet,
                        isNumbered: false
                    };
                }
            }
        }

        return { type: 'none', char: '', isNumbered: false };
    }

    extractCleanText(text, bulletFormat) {
        if (!text) return '';

        let cleaned = text.trim();

        // Remove bullet character
        if (bulletFormat.char && cleaned.startsWith(bulletFormat.char)) {
            cleaned = cleaned.substring(bulletFormat.char.length).trim();
        }

        return cleaned;
    }

    calculateIndentLevel(element) {
        const bbox = this.extractBoundingBox(element);
        return Math.round(bbox.x / this.indentUnit);
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

    getPageNumber(element) {
        return element.pageNumber || element.boundingRegions?.[0]?.pageNumber || 1;
    }

    generateBulletHTML(text, bulletFormat, level) {
        const indent = '  '.repeat(level);
        const bulletClass = `bullet-${bulletFormat.type}`;
        const levelClass = `level-${level}`;

        return `${indent}<li class="bullet-item ${bulletClass} ${levelClass}">${this.escapeHtml(text)}</li>`;
    }

    // Quality and confidence calculations

    calculateOverallConfidence(bulletPoints) {
        if (bulletPoints.length === 0) return 0;
        const total = bulletPoints.reduce((sum, bullet) => sum + bullet.confidence, 0);
        return total / bulletPoints.length;
    }

    calculateQualityScore(bulletPoints, listStructures) {
        let score = 0;

        // Base score for having bullets
        if (bulletPoints.length > 0) score += 30;

        // Score for structured lists
        if (listStructures.length > 0) score += 20;

        // Score for hierarchy depth
        const maxDepth = Math.max(...listStructures.map(ls => ls.metadata?.maxDepth || 0));
        if (maxDepth > 1) score += 20;

        // Score for confidence levels
        const avgConfidence = this.calculateOverallConfidence(bulletPoints);
        score += Math.round(avgConfidence * 30);

        return Math.min(100, score);
    }

    adjustConfidenceWithContext(originalConfidence, context) {
        let adjusted = originalConfidence;

        if (context.hasConsistentBullets) adjusted += 0.1;
        if (context.isInList) adjusted += 0.15;
        if (context.hasProperIndentation) adjusted += 0.1;
        if (context.followsPattern) adjusted += 0.05;

        return Math.min(1.0, adjusted);
    }

    classifyBulletSemanticType(text) {
        const lower = text.toLowerCase();

        if (lower.includes('responsibility') || lower.includes('responsible')) return 'responsibility';
        if (lower.includes('achievement') || lower.includes('accomplished')) return 'achievement';
        if (lower.includes('skill') || lower.includes('proficient')) return 'skill';
        if (lower.includes('experience') || lower.includes('worked')) return 'experience';

        return 'general';
    }

    analyzeBulletQuality(bullet) {
        return {
            textLength: bullet.cleanText.length,
            hasNumbers: /\d/.test(bullet.cleanText),
            hasAction: this.hasActionVerb(bullet.cleanText),
            completeness: bullet.cleanText.length > 20 ? 'complete' : 'brief'
        };
    }

    hasActionVerb(text) {
        const actionVerbs = ['developed', 'created', 'managed', 'led', 'implemented', 'designed', 'analyzed', 'improved'];
        return actionVerbs.some(verb => text.toLowerCase().includes(verb));
    }

    // Helper methods

    deduplicateAndValidate(bulletPoints) {
        const seen = new Map();
        const unique = [];

        for (const bullet of bulletPoints) {
            const key = this.getBulletKey(bullet);

            if (!seen.has(key)) {
                seen.set(key, bullet);
                unique.push(bullet);
            } else {
                // Keep the one with higher confidence
                const existing = seen.get(key);
                if (bullet.confidence > existing.confidence) {
                    const index = unique.indexOf(existing);
                    unique[index] = bullet;
                    seen.set(key, bullet);
                }
            }
        }

        return unique;
    }

    getBulletKey(bullet) {
        return `${bullet.cleanText.trim().toLowerCase()}_${Math.round(bullet.position.boundingBox.x)}_${Math.round(bullet.position.boundingBox.y)}`;
    }

    groupBulletsByProximity(bulletPoints) {
        const groups = [];
        const processed = new Set();

        const sorted = [...bulletPoints].sort((a, b) => {
            if (a.position.pageNumber !== b.position.pageNumber) {
                return a.position.pageNumber - b.position.pageNumber;
            }
            return a.position.boundingBox.y - b.position.boundingBox.y;
        });

        for (const bullet of sorted) {
            if (processed.has(bullet.id)) continue;

            const group = [bullet];
            processed.add(bullet.id);

            // Find nearby bullets
            for (const other of sorted) {
                if (processed.has(other.id)) continue;

                if (this.areBulletsInSameGroup(bullet, other)) {
                    group.push(other);
                    processed.add(other.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    areBulletsInSameGroup(bullet1, bullet2) {
        // Same page
        if (bullet1.position.pageNumber !== bullet2.position.pageNumber) return false;

        // Vertical proximity (within 100 points)
        const verticalDistance = Math.abs(bullet1.position.boundingBox.y - bullet2.position.boundingBox.y);
        return verticalDistance <= 100;
    }

    calculateGroupConfidence(group) {
        if (group.length === 0) return 0;
        return group.reduce((sum, bullet) => sum + bullet.confidence, 0) / group.length;
    }

    getUniqueLevels(group) {
        return [...new Set(group.map(bullet => bullet.formatting.level))].sort((a, b) => a - b);
    }

    buildGroupHierarchy(group) {
        // Implementation for building hierarchy within a group
        const hierarchy = {};

        for (const bullet of group) {
            const level = bullet.formatting.level;
            if (!hierarchy[level]) {
                hierarchy[level] = [];
            }
            hierarchy[level].push(bullet.id);
        }

        return hierarchy;
    }

    groupByLevel(bullets) {
        const groups = {};

        for (const bullet of bullets) {
            const level = bullet.formatting.level;
            if (!groups[level]) {
                groups[level] = [];
            }
            groups[level].push(bullet);
        }

        return groups;
    }

    getBulletItemClass(bullet) {
        const classes = ['bullet-item'];

        classes.push(`bullet-${bullet.formatting.bulletType}`);
        classes.push(`level-${bullet.formatting.level}`);

        if (bullet.formatting.isNumbered) {
            classes.push('numbered');
        }

        if (bullet.semanticType) {
            classes.push(`semantic-${bullet.semanticType}`);
        }

        return classes.join(' ');
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

    generateStatistics(bulletPoints) {
        return {
            totalBullets: bulletPoints.length,
            bySource: this.countByProperty(bulletPoints, 'source'),
            byType: this.countByProperty(bulletPoints, bullet => bullet.formatting.bulletType),
            byLevel: this.countByProperty(bulletPoints, bullet => bullet.formatting.level),
            averageConfidence: this.calculateOverallConfidence(bulletPoints),
            semanticTypes: this.countByProperty(bulletPoints, 'semanticType')
        };
    }

    countByProperty(items, propertyOrFunction) {
        const counts = {};

        for (const item of items) {
            const key = typeof propertyOrFunction === 'function'
                ? propertyOrFunction(item)
                : item[propertyOrFunction];

            counts[key] = (counts[key] || 0) + 1;
        }

        return counts;
    }

    // Placeholder methods for complete implementation
    async extractBulletsFromParagraph(paragraph, page, index) {
        // Implementation for extracting bullets from paragraph
        return [];
    }

    async extractBulletsFromWords(words, page) {
        // Implementation for extracting bullets from words
        return [];
    }

    async analyzeSurroundingContext(bullet, azureResults) {
        // Implementation for context analysis
        return {
            hasConsistentBullets: true,
            isInList: true,
            hasProperIndentation: true,
            followsPattern: true
        };
    }
}

module.exports = { BulletPointDetectionService };