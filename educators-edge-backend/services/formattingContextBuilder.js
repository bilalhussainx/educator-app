/**
 * Formatting Context Builder Service
 * Analyzes Azure Vision data to build rich formatting context for AI analysis
 */

/**
 * Build comprehensive formatting context from Azure Vision results
 * This context enhances Claude's analysis with visual structure information
 */
const buildFormattingContext = (elements, sections, azureResults) => {
    console.log('[FORMATTING CONTEXT] Building formatting context...');

    const context = {
        // Document-level formatting analysis
        documentStructure: analyzeDocumentStructure(elements, sections),

        // Typography and style analysis
        typography: analyzeTypography(elements),

        // Visual consistency analysis
        consistency: analyzeVisualConsistency(elements, sections),

        // Layout and spacing analysis
        layout: analyzeLayoutStructure(elements),

        // Section-specific formatting
        sectionFormatting: analyzeSectionFormatting(sections),

        // Bullet point analysis
        bulletPointAnalysis: analyzeBulletPoints(elements),

        // Visual hierarchy analysis
        visualHierarchy: analyzeVisualHierarchy(elements),

        // ATS compatibility insights
        atsCompatibility: analyzeATSCompatibility(elements, sections),

        // Summary for AI prompt
        summary: null // Will be filled at the end
    };

    // Generate human-readable summary for AI
    context.summary = generateContextSummary(context);

    console.log('[FORMATTING CONTEXT] Context built successfully');
    return context;
};

/**
 * Analyze document structure
 */
const analyzeDocumentStructure = (elements, sections) => {
    const pages = [...new Set(elements.map(el => el.boundingBox.page))];

    return {
        pageCount: pages.length,
        totalElements: elements.length,
        sectionsCount: sections.length,
        sectionTitles: sections.map(s => s.title),
        layoutType: detectLayoutType(elements),
        overallStyle: detectOverallStyle(elements),
        density: calculateContentDensity(elements, pages.length)
    };
};

/**
 * Analyze typography patterns
 */
const analyzeTypography = (elements) => {
    const fontSizes = elements.map(el => el.formatting.fontSize);
    const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);

    const boldElements = elements.filter(el => el.formatting.isBold);
    const italicElements = elements.filter(el => el.formatting.isItalic);

    return {
        fontSizeRange: {
            min: Math.min(...fontSizes),
            max: Math.max(...fontSizes),
            unique: uniqueSizes
        },
        fontHierarchy: {
            levels: uniqueSizes.length,
            sizes: uniqueSizes,
            distribution: uniqueSizes.map(size => ({
                size,
                count: fontSizes.filter(s => s === size).length,
                percentage: Math.round((fontSizes.filter(s => s === size).length / elements.length) * 100)
            }))
        },
        boldUsage: {
            count: boldElements.length,
            percentage: Math.round((boldElements.length / elements.length) * 100),
            elements: boldElements.map(el => ({ type: el.type, text: el.text.substring(0, 50) }))
        },
        italicUsage: {
            count: italicElements.length,
            percentage: Math.round((italicElements.length / elements.length) * 100)
        }
    };
};

/**
 * Analyze visual consistency
 */
const analyzeVisualConsistency = (elements, sections) => {
    const issues = [];
    let score = 100;

    // Check section header consistency
    const sectionHeaders = elements.filter(el => el.type === 'section-header');
    if (sectionHeaders.length > 1) {
        const headerSizes = sectionHeaders.map(h => h.formatting.fontSize);
        const headerWeights = sectionHeaders.map(h => h.formatting.fontWeight);

        const sizeConsistent = new Set(headerSizes).size === 1;
        const weightConsistent = new Set(headerWeights).size === 1;

        if (!sizeConsistent) {
            issues.push({
                category: 'Section Headers',
                issue: 'Inconsistent font sizes',
                impact: 'medium',
                details: `Section headers use ${new Set(headerSizes).size} different font sizes: ${[...new Set(headerSizes)].join(', ')}pt`
            });
            score -= 10;
        }

        if (!weightConsistent) {
            issues.push({
                category: 'Section Headers',
                issue: 'Inconsistent font weights',
                impact: 'medium',
                details: `Some section headers are bold while others are not`
            });
            score -= 10;
        }
    }

    // Check job title consistency
    const jobTitles = elements.filter(el => el.type === 'job-title');
    if (jobTitles.length > 1) {
        const titleWeights = jobTitles.map(t => t.formatting.fontWeight);
        const weightConsistent = new Set(titleWeights).size === 1;

        if (!weightConsistent) {
            const inconsistentTitles = jobTitles.filter((t, i) =>
                titleWeights[i] !== titleWeights[0]
            );

            issues.push({
                category: 'Job Titles',
                issue: 'Inconsistent bolding',
                impact: 'high',
                details: `${inconsistentTitles.length} job title(s) have different formatting than others`,
                examples: inconsistentTitles.map(t => t.text)
            });
            score -= 15;
        }
    }

    // Check bullet point consistency
    const bullets = elements.filter(el => el.type === 'bullet-point');
    if (bullets.length > 0) {
        const bulletChars = bullets.map(b => b.text.charAt(0));
        const uniqueChars = new Set(bulletChars);

        if (uniqueChars.size > 2) {
            issues.push({
                category: 'Bullet Points',
                issue: 'Multiple bullet point styles',
                impact: 'low',
                details: `Using ${uniqueChars.size} different bullet styles: ${[...uniqueChars].join(', ')}`
            });
            score -= 5;
        }
    }

    return {
        score: Math.max(0, score),
        issues,
        isConsistent: issues.length === 0
    };
};

/**
 * Analyze layout structure
 */
const analyzeLayoutStructure = (elements) => {
    // Analyze horizontal alignment
    const xPositions = elements.map(el => Math.round(el.boundingBox.x / 5) * 5);
    const uniqueXPositions = [...new Set(xPositions)].sort((a, b) => a - b);

    // Analyze vertical spacing
    const sortedElements = [...elements].sort((a, b) => {
        if (a.boundingBox.page !== b.boundingBox.page) {
            return a.boundingBox.page - b.boundingBox.page;
        }
        return a.boundingBox.y - b.boundingBox.y;
    });

    const spacings = [];
    for (let i = 1; i < sortedElements.length; i++) {
        const spacing = sortedElements[i].boundingBox.y -
                       (sortedElements[i-1].boundingBox.y + sortedElements[i-1].boundingBox.height);
        if (spacing > 0 && spacing < 100) {
            spacings.push(Math.round(spacing));
        }
    }

    return {
        columns: uniqueXPositions.length <= 2 ? 1 : 2,
        alignmentPoints: uniqueXPositions,
        margins: {
            left: Math.min(...xPositions),
            estimatedRight: Math.max(...elements.map(el => el.boundingBox.x + el.boundingBox.width))
        },
        spacing: {
            unique: [...new Set(spacings)].sort((a, b) => a - b),
            average: spacings.length > 0 ? Math.round(spacings.reduce((a, b) => a + b, 0) / spacings.length) : 0,
            mostCommon: getMostCommon(spacings)
        }
    };
};

/**
 * Analyze section-specific formatting
 */
const analyzeSectionFormatting = (sections) => {
    return sections.map(section => {
        const elements = section.elements || [];

        return {
            title: section.title,
            type: section.type,
            elementCount: elements.length,
            bulletCount: elements.filter(el => el.type === 'bullet-point').length,
            avgFontSize: elements.length > 0
                ? Math.round(elements.reduce((sum, el) => sum + el.formatting.fontSize, 0) / elements.length)
                : 0,
            dominantStyle: {
                bold: elements.filter(el => el.formatting.isBold).length > elements.length / 2,
                italic: elements.filter(el => el.formatting.isItalic).length > elements.length / 2
            }
        };
    });
};

/**
 * Analyze bullet points in detail
 */
const analyzeBulletPoints = (elements) => {
    const bullets = elements.filter(el => el.type === 'bullet-point');

    if (bullets.length === 0) {
        return {
            totalCount: 0,
            hasBullets: false,
            analysis: 'No bullet points detected'
        };
    }

    // Analyze bullet point lengths
    const lengths = bullets.map(b => b.text.length);

    // Analyze bullet point styles
    const styles = bullets.map(b => {
        const firstChar = b.text.charAt(0);
        if (/^\d/.test(firstChar)) return 'numbered';
        return firstChar;
    });

    // Group by indent level
    const indentGroups = {};
    bullets.forEach(b => {
        const indent = b.spatialRelations.indentLevel;
        if (!indentGroups[indent]) {
            indentGroups[indent] = [];
        }
        indentGroups[indent].push(b);
    });

    return {
        totalCount: bullets.length,
        hasBullets: true,
        lengthAnalysis: {
            min: Math.min(...lengths),
            max: Math.max(...lengths),
            average: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
            tooLong: bullets.filter(b => b.text.length > 200).length
        },
        styleAnalysis: {
            styles: [...new Set(styles)],
            consistentStyle: new Set(styles).size === 1
        },
        indentAnalysis: {
            levels: Object.keys(indentGroups).length,
            distribution: Object.entries(indentGroups).map(([level, items]) => ({
                level: parseInt(level),
                count: items.length
            }))
        },
        qualityMetrics: {
            startsWithActionVerb: bullets.filter(b => startsWithActionVerb(b.text)).length,
            containsNumbers: bullets.filter(b => /\d+/.test(b.text)).length,
            containsPercentages: bullets.filter(b => /%/.test(b.text)).length
        }
    };
};

/**
 * Analyze visual hierarchy
 */
const analyzeVisualHierarchy = (elements) => {
    const levels = {};

    elements.forEach(el => {
        const level = el.hierarchy.level;
        if (!levels[level]) {
            levels[level] = {
                level,
                count: 0,
                types: [],
                avgFontSize: 0,
                elements: []
            };
        }

        levels[level].count++;
        if (!levels[level].types.includes(el.type)) {
            levels[level].types.push(el.type);
        }
        levels[level].elements.push(el);
    });

    // Calculate average font size for each level
    Object.values(levels).forEach(level => {
        level.avgFontSize = Math.round(
            level.elements.reduce((sum, el) => sum + el.formatting.fontSize, 0) / level.elements.length
        );
        delete level.elements; // Remove elements to keep response lean
    });

    return {
        hierarchyLevels: Object.keys(levels).length,
        levels: Object.values(levels).sort((a, b) => a.level - b.level),
        isWellStructured: Object.keys(levels).length >= 3 && Object.keys(levels).length <= 6
    };
};

/**
 * Analyze ATS compatibility
 */
const analyzeATSCompatibility = (elements, sections) => {
    const issues = [];
    let score = 100;

    // Check for standard section headers
    const standardSections = ['experience', 'education', 'skills'];
    const foundSections = sections.map(s => s.type);
    const missingSections = standardSections.filter(s => !foundSections.includes(s));

    if (missingSections.length > 0) {
        issues.push({
            category: 'Missing Sections',
            issue: `Missing standard sections: ${missingSections.join(', ')}`,
            impact: 'high'
        });
        score -= 20;
    }

    // Check for complex formatting (multiple columns, text boxes)
    const layoutType = detectLayoutType(elements);
    if (layoutType === 'multi-column') {
        issues.push({
            category: 'Layout',
            issue: 'Multi-column layout detected',
            impact: 'medium',
            recommendation: 'Consider using a single-column layout for better ATS compatibility'
        });
        score -= 15;
    }

    // Check for contact information
    const contactInfo = elements.filter(el => el.type === 'contact-info');
    if (contactInfo.length === 0) {
        issues.push({
            category: 'Contact Information',
            issue: 'No contact information detected',
            impact: 'high'
        });
        score -= 20;
    }

    // Check for bullet points (good practice)
    const bullets = elements.filter(el => el.type === 'bullet-point');
    if (bullets.length === 0) {
        issues.push({
            category: 'Content Structure',
            issue: 'No bullet points detected',
            impact: 'low',
            recommendation: 'Use bullet points to highlight achievements and responsibilities'
        });
        score -= 10;
    }

    return {
        score: Math.max(0, score),
        issues,
        isATSFriendly: score >= 70,
        recommendations: issues.map(i => i.recommendation).filter(Boolean)
    };
};

/**
 * Generate human-readable summary for AI prompt
 */
const generateContextSummary = (context) => {
    const lines = [];

    // Document structure
    lines.push(`Document Structure: ${context.documentStructure.pageCount} page(s), ${context.documentStructure.sectionsCount} sections (${context.documentStructure.sectionTitles.join(', ')})`);
    lines.push(`Layout Type: ${context.documentStructure.layoutType}, Style: ${context.documentStructure.overallStyle}`);

    // Typography
    const typo = context.typography;
    lines.push(`Font Hierarchy: ${typo.fontHierarchy.levels} levels (${typo.fontHierarchy.sizes.join(', ')}pt)`);
    lines.push(`Bold Usage: ${typo.boldUsage.percentage}% of elements`);

    // Consistency
    if (context.consistency.issues.length > 0) {
        lines.push(`Consistency Issues: ${context.consistency.issues.length} found (score: ${context.consistency.score}/100)`);
        context.consistency.issues.forEach(issue => {
            lines.push(`  - ${issue.category}: ${issue.issue}`);
        });
    } else {
        lines.push(`Consistency: Excellent (${context.consistency.score}/100)`);
    }

    // Bullet points
    if (context.bulletPointAnalysis.hasBullets) {
        const bp = context.bulletPointAnalysis;
        lines.push(`Bullet Points: ${bp.totalCount} total, avg length: ${bp.lengthAnalysis.average} chars`);
        lines.push(`  - ${bp.qualityMetrics.startsWithActionVerb} start with action verbs`);
        lines.push(`  - ${bp.qualityMetrics.containsNumbers} contain quantifiable metrics`);
        if (bp.lengthAnalysis.tooLong > 0) {
            lines.push(`  - ${bp.lengthAnalysis.tooLong} are too long (>200 chars)`);
        }
    } else {
        lines.push(`Bullet Points: None detected`);
    }

    // ATS compatibility
    lines.push(`ATS Compatibility: ${context.atsCompatibility.score}/100`);
    if (context.atsCompatibility.issues.length > 0) {
        lines.push(`ATS Issues: ${context.atsCompatibility.issues.map(i => i.category).join(', ')}`);
    }

    return lines.join('\n');
};

/**
 * Helper functions
 */
const detectLayoutType = (elements) => {
    const xPositions = elements.map(el => el.boundingBox.x);
    const uniquePositions = [...new Set(xPositions.map(x => Math.round(x / 10) * 10))];

    if (uniquePositions.length <= 2) return 'single-column';
    if (uniquePositions.length <= 4) return 'two-column';
    return 'multi-column';
};

const detectOverallStyle = (elements) => {
    const boldCount = elements.filter(el => el.formatting.isBold).length;
    const largeFontCount = elements.filter(el => el.formatting.fontSize > 14).length;

    const boldRatio = boldCount / elements.length;
    const largeFontRatio = largeFontCount / elements.length;

    if (boldRatio > 0.3 && largeFontRatio > 0.2) return 'creative';
    if (boldRatio < 0.1 && largeFontRatio < 0.1) return 'traditional';
    return 'modern';
};

const calculateContentDensity = (elements, pageCount) => {
    const elementsPerPage = elements.length / pageCount;
    if (elementsPerPage > 100) return 'high';
    if (elementsPerPage > 50) return 'medium';
    return 'low';
};

const getMostCommon = (array) => {
    if (array.length === 0) return null;

    const counts = {};
    array.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
    });

    let maxCount = 0;
    let mostCommon = null;
    Object.entries(counts).forEach(([val, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = parseInt(val);
        }
    });

    return mostCommon;
};

const startsWithActionVerb = (text) => {
    const actionVerbs = [
        'achieved', 'administered', 'analyzed', 'built', 'collaborated', 'created',
        'delivered', 'designed', 'developed', 'directed', 'established', 'executed',
        'implemented', 'improved', 'increased', 'initiated', 'launched', 'led',
        'managed', 'optimized', 'organized', 'planned', 'produced', 'reduced',
        'solved', 'streamlined', 'supervised', 'trained', 'transformed'
    ];

    const firstWord = text.toLowerCase().split(/\s+/)[0].replace(/[^\w]/g, '');
    return actionVerbs.includes(firstWord);
};

module.exports = {
    buildFormattingContext
};
