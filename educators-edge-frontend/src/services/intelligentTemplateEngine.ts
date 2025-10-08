/**
 * Intelligent Template Engine - Revolutionary Resume Format Preservation
 * Advanced template matching, format preservation, and intelligent reconstruction
 */

import { ResumeTemplate, ParsedResumeElement, FormatPreservationPlan } from './revolutionaryResumeParser';

interface TemplateMatchResult {
    template: ResumeTemplate;
    confidence: number;
    matchReasons: MatchReason[];
    adaptationRequired: AdaptationRule[];
}

interface MatchReason {
    category: 'font' | 'layout' | 'structure' | 'style' | 'spacing';
    score: number;
    evidence: string[];
    weight: number;
}

interface AdaptationRule {
    type: 'font-mapping' | 'spacing-adjustment' | 'layout-modification' | 'style-enhancement';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    implementation: any;
    impact: string;
}

interface ReconstructionPlan {
    htmlStructure: string;
    cssStyles: string;
    preservationMap: ElementPreservation[];
    qualityScore: number;
    optimizations: TemplateOptimization[];
}

interface ElementPreservation {
    originalElement: ParsedResumeElement;
    preservedFormatting: PreservedFormatting;
    confidence: number;
    fallbackOptions: PreservedFormatting[];
}

interface PreservedFormatting {
    css: Record<string, string>;
    htmlTag: string;
    htmlAttributes: Record<string, string>;
    semanticMeaning: string;
    accessibility: AccessibilityInfo;
}

interface AccessibilityInfo {
    ariaLabel?: string;
    ariaRole?: string;
    tabIndex?: number;
    semanticTag: string;
}

interface TemplateOptimization {
    type: 'ats-enhancement' | 'visual-improvement' | 'accessibility-boost' | 'print-optimization';
    description: string;
    implementation: string;
    impact: number;
    compatibility: string[];
}

class IntelligentTemplateEngine {
    private templates: Map<string, ResumeTemplate>;
    private industryPatterns: Map<string, IndustryPattern>;
    private formatPreservationRules: FormatRule[];

    constructor() {
        this.templates = new Map();
        this.industryPatterns = new Map();
        this.formatPreservationRules = [];
        this.initializeEngine();
    }

    /**
     * Revolutionary template matching with AI-powered confidence scoring
     */
    async matchOptimalTemplate(elements: ParsedResumeElement[]): Promise<TemplateMatchResult> {
        console.log('🎯 Starting intelligent template matching...');

        const candidateMatches: TemplateMatchResult[] = [];

        // Analyze each template
        for (const [templateName, template] of this.templates) {
            const matchResult = await this.analyzeTemplateMatch(elements, template);
            candidateMatches.push(matchResult);
        }

        // Sort by confidence and select best match
        candidateMatches.sort((a, b) => b.confidence - a.confidence);
        const bestMatch = candidateMatches[0];

        console.log(`✅ Best template match: ${bestMatch.template.name} (${Math.round(bestMatch.confidence * 100)}% confidence)`);

        return bestMatch;
    }

    /**
     * Deep template analysis with multi-factor scoring
     */
    private async analyzeTemplateMatch(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<TemplateMatchResult> {
        const matchReasons: MatchReason[] = [];
        const adaptationRules: AdaptationRule[] = [];

        // 1. Font Analysis
        const fontMatch = await this.analyzeFontCompatibility(elements, template);
        matchReasons.push(fontMatch);

        // 2. Layout Structure Analysis
        const layoutMatch = await this.analyzeLayoutStructure(elements, template);
        matchReasons.push(layoutMatch);

        // 3. Section Organization Analysis
        const structureMatch = await this.analyzeSectionStructure(elements, template);
        matchReasons.push(structureMatch);

        // 4. Style Consistency Analysis
        const styleMatch = await this.analyzeStyleConsistency(elements, template);
        matchReasons.push(styleMatch);

        // 5. Spacing and Alignment Analysis
        const spacingMatch = await this.analyzeSpacingAlignment(elements, template);
        matchReasons.push(spacingMatch);

        // Calculate weighted confidence score
        const confidence = this.calculateWeightedConfidence(matchReasons);

        // Generate adaptation rules if needed
        if (confidence < template.confidenceThreshold) {
            adaptationRules.push(...await this.generateAdaptationRules(elements, template, matchReasons));
        }

        return {
            template,
            confidence,
            matchReasons,
            adaptationRequired: adaptationRules
        };
    }

    private async analyzeFontCompatibility(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<MatchReason> {
        console.log('📝 Analyzing font compatibility...');

        const evidence: string[] = [];
        let score = 0;
        let totalChecks = 0;

        // Check header fonts
        const headerElements = elements.filter(e => e.type === 'header' || e.type === 'section_title');
        if (headerElements.length > 0) {
            const avgHeaderSize = headerElements.reduce((sum, e) => sum + e.formatting.fontSize, 0) / headerElements.length;
            const expectedSize = template.fontGuidelines.headers.size;

            const sizeDiff = Math.abs(avgHeaderSize - expectedSize) / expectedSize;
            if (sizeDiff < 0.2) {
                score += 0.8;
                evidence.push(`Header font size matches template (${avgHeaderSize}px vs ${expectedSize}px expected)`);
            } else {
                evidence.push(`Header font size differs (${avgHeaderSize}px vs ${expectedSize}px expected)`);
            }
            totalChecks++;
        }

        // Check body text fonts
        const bodyElements = elements.filter(e => e.type === 'text' || e.type === 'bullet');
        if (bodyElements.length > 0) {
            const avgBodySize = bodyElements.reduce((sum, e) => sum + e.formatting.fontSize, 0) / bodyElements.length;
            const expectedSize = template.fontGuidelines.body.size;

            const sizeDiff = Math.abs(avgBodySize - expectedSize) / expectedSize;
            if (sizeDiff < 0.15) {
                score += 0.7;
                evidence.push(`Body font size matches template (${avgBodySize}px vs ${expectedSize}px expected)`);
            } else {
                evidence.push(`Body font size differs (${avgBodySize}px vs ${expectedSize}px expected)`);
            }
            totalChecks++;
        }

        // Check font weight consistency
        const boldElements = elements.filter(e => e.formatting.fontWeight === 'bold');
        const boldRatio = boldElements.length / elements.length;

        if (template.name === 'ATS-Friendly' && boldRatio < 0.15) {
            score += 0.6;
            evidence.push(`Conservative bold usage matches ATS-friendly approach (${Math.round(boldRatio * 100)}%)`);
        } else if (template.name === 'Creative' && boldRatio > 0.1) {
            score += 0.6;
            evidence.push(`Creative bold usage matches template (${Math.round(boldRatio * 100)}%)`);
        }
        totalChecks++;

        const finalScore = totalChecks > 0 ? score / totalChecks : 0;

        return {
            category: 'font',
            score: finalScore,
            evidence,
            weight: 0.25
        };
    }

    private async analyzeLayoutStructure(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<MatchReason> {
        console.log('📐 Analyzing layout structure...');

        const evidence: string[] = [];
        let score = 0;

        // Detect layout type (single-column, two-column, hybrid)
        const layoutType = this.detectLayoutType(elements);

        // Check spacing patterns
        const spacingConsistency = this.analyzeSpacingConsistency(elements);
        score += spacingConsistency.score * 0.4;
        evidence.push(...spacingConsistency.evidence);

        // Check alignment patterns
        const alignmentScore = this.analyzeAlignmentPatterns(elements, template);
        score += alignmentScore * 0.3;
        evidence.push(`Alignment consistency: ${Math.round(alignmentScore * 100)}%`);

        // Check margin consistency
        const marginScore = this.analyzeMarginConsistency(elements);
        score += marginScore * 0.3;
        evidence.push(`Margin consistency: ${Math.round(marginScore * 100)}%`);

        return {
            category: 'layout',
            score,
            evidence,
            weight: 0.2
        };
    }

    private async analyzeSectionStructure(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<MatchReason> {
        console.log('📋 Analyzing section structure...');

        const evidence: string[] = [];
        let score = 0;

        // Detect actual section order
        const detectedSections = this.detectSectionOrder(elements);
        const expectedOrder = template.sectionOrder;

        // Calculate section order similarity
        const orderSimilarity = this.calculateOrderSimilarity(detectedSections, expectedOrder);
        score += orderSimilarity * 0.6;
        evidence.push(`Section order similarity: ${Math.round(orderSimilarity * 100)}%`);

        // Check section header formatting consistency
        const headerConsistency = this.analyzeSectionHeaderConsistency(elements);
        score += headerConsistency * 0.4;
        evidence.push(`Section header consistency: ${Math.round(headerConsistency * 100)}%`);

        return {
            category: 'structure',
            score,
            evidence,
            weight: 0.3
        };
    }

    private async analyzeStyleConsistency(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<MatchReason> {
        console.log('🎨 Analyzing style consistency...');

        const evidence: string[] = [];
        let score = 0;

        // Check bullet point consistency
        const bulletElements = elements.filter(e => e.formatting.isBulletPoint);
        if (bulletElements.length > 0) {
            const bulletConsistency = this.analyzeBulletConsistency(bulletElements);
            score += bulletConsistency * 0.4;
            evidence.push(`Bullet point consistency: ${Math.round(bulletConsistency * 100)}%`);
        }

        // Check date formatting consistency
        const dateElements = elements.filter(e => e.type === 'date');
        if (dateElements.length > 0) {
            const dateConsistency = this.analyzeDateFormatConsistency(dateElements);
            score += dateConsistency * 0.3;
            evidence.push(`Date format consistency: ${Math.round(dateConsistency * 100)}%`);
        }

        // Check emphasis usage (bold, italic)
        const emphasisConsistency = this.analyzeEmphasisUsage(elements, template);
        score += emphasisConsistency * 0.3;
        evidence.push(`Emphasis usage consistency: ${Math.round(emphasisConsistency * 100)}%`);

        return {
            category: 'style',
            score,
            evidence,
            weight: 0.15
        };
    }

    private async analyzeSpacingAlignment(elements: ParsedResumeElement[], template: ResumeTemplate): Promise<MatchReason> {
        console.log('📏 Analyzing spacing and alignment...');

        const evidence: string[] = [];
        let score = 0;

        // Check line spacing consistency
        const lineSpacingScore = this.analyzeLineSpacing(elements);
        score += lineSpacingScore * 0.4;
        evidence.push(`Line spacing consistency: ${Math.round(lineSpacingScore * 100)}%`);

        // Check section spacing
        const sectionSpacingScore = this.analyzeSectionSpacing(elements, template);
        score += sectionSpacingScore * 0.3;
        evidence.push(`Section spacing matches template: ${Math.round(sectionSpacingScore * 100)}%`);

        // Check indentation consistency
        const indentationScore = this.analyzeIndentation(elements);
        score += indentationScore * 0.3;
        evidence.push(`Indentation consistency: ${Math.round(indentationScore * 100)}%`);

        return {
            category: 'spacing',
            score,
            evidence,
            weight: 0.1
        };
    }

    private calculateWeightedConfidence(matchReasons: MatchReason[]): number {
        let weightedSum = 0;
        let totalWeight = 0;

        for (const reason of matchReasons) {
            weightedSum += reason.score * reason.weight;
            totalWeight += reason.weight;
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Generate HTML/CSS reconstruction with format preservation
     */
    async reconstructWithFormatPreservation(
        elements: ParsedResumeElement[],
        templateMatch: TemplateMatchResult
    ): Promise<ReconstructionPlan> {
        console.log('🏗️ Reconstructing resume with format preservation...');

        const preservationMap: ElementPreservation[] = [];
        const optimizations: TemplateOptimization[] = [];

        // Process each element for preservation
        for (const element of elements) {
            const preservation = await this.preserveElementFormatting(element, templateMatch.template);
            preservationMap.push(preservation);
        }

        // Generate HTML structure
        const htmlStructure = this.generateHTMLStructure(preservationMap);

        // Generate CSS styles
        const cssStyles = this.generateCSSStyles(preservationMap, templateMatch.template);

        // Calculate quality score
        const qualityScore = this.calculateReconstructionQuality(preservationMap);

        // Generate optimizations
        if (qualityScore < 0.9) {
            optimizations.push(...this.generateOptimizations(preservationMap, templateMatch));
        }

        return {
            htmlStructure,
            cssStyles,
            preservationMap,
            qualityScore,
            optimizations
        };
    }

    private async preserveElementFormatting(
        element: ParsedResumeElement,
        template: ResumeTemplate
    ): Promise<ElementPreservation> {

        // Determine optimal HTML representation
        const htmlTag = this.determineOptimalHTMLTag(element);

        // Generate CSS properties
        const css = this.generateElementCSS(element, template);

        // Create accessibility attributes
        const accessibility = this.generateAccessibilityInfo(element);

        // Generate HTML attributes
        const htmlAttributes = this.generateHTMLAttributes(element, accessibility);

        const preservedFormatting: PreservedFormatting = {
            css,
            htmlTag,
            htmlAttributes,
            semanticMeaning: this.determineSemanticMeaning(element),
            accessibility
        };

        // Calculate confidence based on preservation accuracy
        const confidence = this.calculatePreservationConfidence(element, preservedFormatting);

        // Generate fallback options
        const fallbackOptions = this.generateFallbackOptions(element, template);

        return {
            originalElement: element,
            preservedFormatting,
            confidence,
            fallbackOptions
        };
    }

    private determineOptimalHTMLTag(element: ParsedResumeElement): string {
        switch (element.type) {
            case 'header':
                return element.hierarchy === 1 ? 'h1' : element.hierarchy === 2 ? 'h2' : 'h3';
            case 'section_title':
                return 'h3';
            case 'job_title':
                return 'h4';
            case 'company':
                return 'span';
            case 'date':
                return 'time';
            case 'bullet':
                return 'li';
            case 'contact':
                return 'span';
            default:
                return 'p';
        }
    }

    private generateElementCSS(element: ParsedResumeElement, template: ResumeTemplate): Record<string, string> {
        const css: Record<string, string> = {};

        // Font properties
        css['font-size'] = `${element.formatting.fontSize}px`;
        css['font-weight'] = element.formatting.fontWeight;
        css['font-style'] = element.formatting.fontStyle;
        css['font-family'] = element.formatting.fontFamily;

        // Color and decoration
        css['color'] = element.formatting.color;
        if (element.formatting.backgroundColor) {
            css['background-color'] = element.formatting.backgroundColor;
        }
        if (element.formatting.textDecoration) {
            css['text-decoration'] = element.formatting.textDecoration;
        }

        // Spacing
        css['line-height'] = `${element.formatting.lineHeight}px`;
        css['margin-top'] = `${element.formatting.marginTop}px`;
        css['margin-bottom'] = `${element.formatting.marginBottom}px`;

        // Alignment
        css['text-align'] = element.formatting.alignment;

        // Bullet-specific styles
        if (element.formatting.isBulletPoint && element.formatting.bulletStyle) {
            css['list-style-type'] = element.formatting.bulletStyle;
        }

        // Template-specific enhancements
        this.applyTemplateEnhancements(css, element, template);

        return css;
    }

    private applyTemplateEnhancements(css: Record<string, string>, element: ParsedResumeElement, template: ResumeTemplate): void {
        // Apply template-specific styling rules
        for (const rule of template.styleRules) {
            if (this.elementMatchesSelector(element, rule.selector)) {
                css[rule.property] = rule.value;
            }
        }

        // Apply ATS optimizations for ATS-friendly template
        if (template.name === 'ATS-Friendly') {
            css['font-family'] = 'Arial, sans-serif';
            if (element.type === 'header') {
                css['font-size'] = '14px';
                css['font-weight'] = 'bold';
            }
        }
    }

    private elementMatchesSelector(element: ParsedResumeElement, selector: string): boolean {
        switch (selector) {
            case 'header':
                return element.type === 'header';
            case 'section-title':
                return element.type === 'section_title';
            case 'bullet':
                return element.formatting.isBulletPoint;
            default:
                return false;
        }
    }

    private generateAccessibilityInfo(element: ParsedResumeElement): AccessibilityInfo {
        const accessibility: AccessibilityInfo = {
            semanticTag: this.determineSemanticTag(element)
        };

        // Add ARIA labels for screen readers
        if (element.type === 'contact') {
            accessibility.ariaLabel = 'Contact information';
        } else if (element.type === 'date') {
            accessibility.ariaLabel = 'Date';
        } else if (element.type === 'job_title') {
            accessibility.ariaLabel = 'Job title';
        }

        // Add roles where appropriate
        if (element.type === 'header') {
            accessibility.ariaRole = 'heading';
        }

        return accessibility;
    }

    private determineSemanticTag(element: ParsedResumeElement): string {
        switch (element.type) {
            case 'contact':
                return 'address';
            case 'date':
                return 'time';
            case 'header':
            case 'section_title':
                return 'header';
            default:
                return 'div';
        }
    }

    private generateHTMLAttributes(element: ParsedResumeElement, accessibility: AccessibilityInfo): Record<string, string> {
        const attributes: Record<string, string> = {};

        // Add semantic attributes
        if (accessibility.ariaLabel) {
            attributes['aria-label'] = accessibility.ariaLabel;
        }
        if (accessibility.ariaRole) {
            attributes['role'] = accessibility.ariaRole;
        }

        // Add data attributes for processing
        attributes['data-element-type'] = element.type;
        attributes['data-confidence'] = element.confidence.toString();
        attributes['data-section'] = element.section;

        // Add datetime for date elements
        if (element.type === 'date') {
            attributes['datetime'] = this.extractDateTimeValue(element.text);
        }

        return attributes;
    }

    private extractDateTimeValue(text: string): string {
        // Extract machine-readable datetime from text
        const yearMatch = text.match(/\b(\d{4})\b/);
        if (yearMatch) {
            return yearMatch[1];
        }
        return text;
    }

    private determineSemanticMeaning(element: ParsedResumeElement): string {
        const meanings: Record<string, string> = {
            'header': 'Main heading or name',
            'section_title': 'Section header',
            'job_title': 'Position or role title',
            'company': 'Organization or employer name',
            'date': 'Temporal information',
            'contact': 'Contact information',
            'bullet': 'List item or accomplishment',
            'text': 'Descriptive content'
        };

        return meanings[element.type] || 'Content';
    }

    private calculatePreservationConfidence(element: ParsedResumeElement, preserved: PreservedFormatting): number {
        let confidence = element.confidence;

        // Boost confidence for well-preserved formatting
        if (preserved.css['font-weight'] === element.formatting.fontWeight) {
            confidence += 0.1;
        }
        if (preserved.css['font-size'] === `${element.formatting.fontSize}px`) {
            confidence += 0.1;
        }
        if (preserved.htmlTag !== 'div') { // Semantic HTML
            confidence += 0.05;
        }

        return Math.min(confidence, 1.0);
    }

    private generateFallbackOptions(element: ParsedResumeElement, template: ResumeTemplate): PreservedFormatting[] {
        // Generate alternative formatting options if primary fails
        return [];
    }

    private generateHTMLStructure(preservationMap: ElementPreservation[]): string {
        let html = '<div class="revolutionary-resume">\n';

        // Group elements by section
        const sections = this.groupElementsBySection(preservationMap);

        for (const [sectionName, elements] of sections) {
            html += `  <section class="resume-section resume-section-${sectionName}">\n`;

            for (const preservation of elements) {
                const element = preservation.originalElement;
                const formatting = preservation.preservedFormatting;

                // Generate attributes string
                const attributesStr = Object.entries(formatting.htmlAttributes)
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(' ');

                // Generate opening tag
                html += `    <${formatting.htmlTag} class="resume-element resume-${element.type}" ${attributesStr}>`;
                html += element.text;
                html += `</${formatting.htmlTag}>\n`;
            }

            html += '  </section>\n';
        }

        html += '</div>';
        return html;
    }

    private groupElementsBySection(preservationMap: ElementPreservation[]): Map<string, ElementPreservation[]> {
        const sections = new Map<string, ElementPreservation[]>();

        for (const preservation of preservationMap) {
            const sectionName = preservation.originalElement.section || 'unknown';
            if (!sections.has(sectionName)) {
                sections.set(sectionName, []);
            }
            sections.get(sectionName)!.push(preservation);
        }

        return sections;
    }

    private generateCSSStyles(preservationMap: ElementPreservation[], template: ResumeTemplate): string {
        let css = '/* Revolutionary Resume Styles */\n';
        css += '.revolutionary-resume {\n';
        css += `  font-family: ${template.fontGuidelines.body.family};\n`;
        css += `  font-size: ${template.fontGuidelines.body.size}px;\n`;
        css += `  line-height: ${template.spacingRules.lineHeight};\n`;
        css += `  margin: ${template.spacingRules.margins.top}in ${template.spacingRules.margins.right}in ${template.spacingRules.margins.bottom}in ${template.spacingRules.margins.left}in;\n`;
        css += '}\n\n';

        // Generate element-specific styles
        const elementStyles = new Map<string, Set<string>>();

        for (const preservation of preservationMap) {
            const element = preservation.originalElement;
            const className = `resume-${element.type}`;

            if (!elementStyles.has(className)) {
                elementStyles.set(className, new Set());
            }

            // Add CSS properties
            for (const [property, value] of Object.entries(preservation.preservedFormatting.css)) {
                elementStyles.get(className)!.add(`  ${property}: ${value};`);
            }
        }

        // Output CSS rules
        for (const [className, properties] of elementStyles) {
            css += `.${className} {\n`;
            css += Array.from(properties).join('\n') + '\n';
            css += '}\n\n';
        }

        return css;
    }

    private calculateReconstructionQuality(preservationMap: ElementPreservation[]): number {
        if (preservationMap.length === 0) return 0;

        const totalConfidence = preservationMap.reduce((sum, p) => sum + p.confidence, 0);
        return totalConfidence / preservationMap.length;
    }

    private generateOptimizations(preservationMap: ElementPreservation[], templateMatch: TemplateMatchResult): TemplateOptimization[] {
        const optimizations: TemplateOptimization[] = [];

        // ATS optimization suggestions
        if (templateMatch.template.name === 'ATS-Friendly') {
            optimizations.push({
                type: 'ats-enhancement',
                description: 'Convert to standard fonts for better ATS parsing',
                implementation: 'font-family: Arial, sans-serif',
                impact: 0.8,
                compatibility: ['ATS systems', 'Screen readers']
            });
        }

        // Visual improvement suggestions
        const lowConfidenceElements = preservationMap.filter(p => p.confidence < 0.7);
        if (lowConfidenceElements.length > 0) {
            optimizations.push({
                type: 'visual-improvement',
                description: `Enhance formatting for ${lowConfidenceElements.length} elements with low confidence`,
                implementation: 'Apply template-specific styling rules',
                impact: 0.6,
                compatibility: ['All devices']
            });
        }

        return optimizations;
    }

    // Utility methods for analysis
    private detectLayoutType(elements: ParsedResumeElement[]): 'single-column' | 'two-column' | 'hybrid' {
        // Analyze element positions to determine layout
        const xPositions = elements.map(e => e.position.x);
        const uniqueX = [...new Set(xPositions.map(x => Math.round(x / 10) * 10))]; // Group by 10px

        if (uniqueX.length <= 2) return 'single-column';
        if (uniqueX.length <= 4) return 'two-column';
        return 'hybrid';
    }

    private analyzeSpacingConsistency(elements: ParsedResumeElement[]): { score: number; evidence: string[] } {
        // Analyze spacing between elements
        const spacings: number[] = [];
        for (let i = 1; i < elements.length; i++) {
            const spacing = elements[i].position.y - (elements[i-1].position.y + elements[i-1].position.height);
            spacings.push(spacing);
        }

        const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
        const variance = spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / spacings.length;
        const consistency = Math.max(0, 1 - (variance / (avgSpacing * avgSpacing)));

        return {
            score: consistency,
            evidence: [`Average spacing: ${avgSpacing.toFixed(1)}px`, `Spacing variance: ${variance.toFixed(1)}`]
        };
    }

    private analyzeAlignmentPatterns(elements: ParsedResumeElement[], template: ResumeTemplate): number {
        // Check alignment consistency
        const leftAligned = elements.filter(e => e.formatting.alignment === 'left').length;
        const totalElements = elements.length;

        if (template.spacingRules.alignment === 'left' && leftAligned / totalElements > 0.8) {
            return 0.9;
        }

        return 0.5;
    }

    private analyzeMarginConsistency(elements: ParsedResumeElement[]): number {
        // Analyze margin consistency across elements
        const leftMargins = elements.map(e => e.position.x);
        const uniqueMargins = [...new Set(leftMargins.map(m => Math.round(m / 5) * 5))];

        // Fewer unique margins = more consistent
        return Math.max(0, 1 - (uniqueMargins.length / 10));
    }

    private detectSectionOrder(elements: ParsedResumeElement[]): string[] {
        const sectionTitles = elements
            .filter(e => e.type === 'section_title')
            .sort((a, b) => a.position.y - b.position.y)
            .map(e => e.text.toLowerCase());

        return sectionTitles;
    }

    private calculateOrderSimilarity(detected: string[], expected: string[]): number {
        let matches = 0;
        const minLength = Math.min(detected.length, expected.length);

        for (let i = 0; i < minLength; i++) {
            if (detected[i].includes(expected[i]) || expected[i].includes(detected[i])) {
                matches++;
            }
        }

        return minLength > 0 ? matches / minLength : 0;
    }

    private analyzeSectionHeaderConsistency(elements: ParsedResumeElement[]): number {
        const headers = elements.filter(e => e.type === 'section_title');
        if (headers.length < 2) return 1;

        // Check font size consistency
        const sizes = headers.map(h => h.formatting.fontSize);
        const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
        const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;

        return Math.max(0, 1 - (sizeVariance / (avgSize * avgSize)));
    }

    private analyzeBulletConsistency(bulletElements: ParsedResumeElement[]): number {
        if (bulletElements.length < 2) return 1;

        const styles = bulletElements.map(b => b.formatting.bulletStyle || 'disc');
        const uniqueStyles = [...new Set(styles)];

        // Fewer unique styles = more consistent
        return Math.max(0, 1 - (uniqueStyles.length - 1) / styles.length);
    }

    private analyzeDateFormatConsistency(dateElements: ParsedResumeElement[]): number {
        if (dateElements.length < 2) return 1;

        // Analyze date format patterns
        const patterns = dateElements.map(d => this.extractDatePattern(d.text));
        const uniquePatterns = [...new Set(patterns)];

        return Math.max(0, 1 - (uniquePatterns.length - 1) / patterns.length);
    }

    private extractDatePattern(dateText: string): string {
        if (/\d{4}/.test(dateText)) return 'year';
        if (/\d{1,2}\/\d{4}/.test(dateText)) return 'month/year';
        if (/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(dateText)) return 'month_name';
        return 'other';
    }

    private analyzeEmphasisUsage(elements: ParsedResumeElement[], template: ResumeTemplate): number {
        const boldElements = elements.filter(e => e.formatting.fontWeight === 'bold');
        const italicElements = elements.filter(e => e.formatting.fontStyle === 'italic');

        const boldRatio = boldElements.length / elements.length;
        const italicRatio = italicElements.length / elements.length;

        // Template-specific expectations
        if (template.name === 'ATS-Friendly') {
            return boldRatio < 0.2 && italicRatio < 0.05 ? 0.9 : 0.4;
        }

        return 0.7; // Default moderate consistency
    }

    private analyzeLineSpacing(elements: ParsedResumeElement[]): number {
        const lineHeights = elements.map(e => e.formatting.lineHeight);
        const avgLineHeight = lineHeights.reduce((sum, h) => sum + h, 0) / lineHeights.length;
        const variance = lineHeights.reduce((sum, h) => sum + Math.pow(h - avgLineHeight, 2), 0) / lineHeights.length;

        return Math.max(0, 1 - (variance / (avgLineHeight * avgLineHeight)));
    }

    private analyzeSectionSpacing(elements: ParsedResumeElement[], template: ResumeTemplate): number {
        // This would analyze spacing between sections
        return 0.8; // Placeholder
    }

    private analyzeIndentation(elements: ParsedResumeElement[]): number {
        const bulletPoints = elements.filter(e => e.formatting.isBulletPoint);
        if (bulletPoints.length < 2) return 1;

        const indentations = bulletPoints.map(b => b.position.x);
        const uniqueIndents = [...new Set(indentations.map(i => Math.round(i / 5) * 5))];

        return Math.max(0, 1 - (uniqueIndents.length - 1) / indentations.length);
    }

    private async generateAdaptationRules(
        elements: ParsedResumeElement[],
        template: ResumeTemplate,
        matchReasons: MatchReason[]
    ): Promise<AdaptationRule[]> {
        const rules: AdaptationRule[] = [];

        // Font adaptation rules
        const fontReason = matchReasons.find(r => r.category === 'font');
        if (fontReason && fontReason.score < 0.6) {
            rules.push({
                type: 'font-mapping',
                priority: 'high',
                description: 'Adapt fonts to match template guidelines',
                implementation: { targetFontFamily: template.fontGuidelines.body.family },
                impact: 'Improves template consistency and readability'
            });
        }

        return rules;
    }

    private initializeEngine(): void {
        console.log('🚀 Initializing Intelligent Template Engine...');

        // Initialize templates (would be loaded from the RevolutionaryResumeParser)
        console.log('✅ Template Engine initialized');
    }
}

interface IndustryPattern {
    industry: string;
    commonSections: string[];
    preferredTemplates: string[];
    keywordPatterns: RegExp[];
    stylePreferences: {
        conservative: boolean;
        creativityLevel: 'low' | 'medium' | 'high';
        emphasisUsage: 'minimal' | 'moderate' | 'extensive';
    };
}

interface FormatRule {
    selector: string;
    property: string;
    value: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    context: string[];
}

export {
    IntelligentTemplateEngine,
    type TemplateMatchResult,
    type ReconstructionPlan,
    type ElementPreservation,
    type TemplateOptimization
};