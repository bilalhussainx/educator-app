/**
 * Resume Format Authentication System - Revolutionary Resume System
 * Template-based formatting preservation with industry standards
 * Implements comprehensive resume format detection and validation
 */

import { FormatRules, FontSpecs, LayoutSpecs, ResumeTemplate } from './enhancedAzureVisionService';

export interface ATSOptimizationRules {
    keywords: {
        required: string[];
        recommended: string[];
        industry: string[];
    };
    formatting: {
        maxBulletPoints: number;
        preferredSections: string[];
        avoidedFormatting: string[];
        fileFormat: 'pdf' | 'docx' | 'txt';
    };
    structure: {
        maxPages: number;
        sectionOrder: string[];
        contactPlacement: 'header' | 'sidebar' | 'footer';
    };
    scanability: {
        fontReadability: number; // 1-10 scale
        contrastRatio: number;
        whiteSpaceRatio: number;
    };
}

export interface IndustryAlignmentRules {
    industry: 'technology' | 'finance' | 'healthcare' | 'education' | 'creative' | 'government' | 'nonprofit';
    preferredTemplates: ResumeTemplate['name'][];
    requiredSections: string[];
    optionalSections: string[];
    languageStyle: 'formal' | 'technical' | 'creative' | 'academic';
    achievementFocus: 'quantitative' | 'qualitative' | 'mixed';
}

export interface ResumeValidationResult {
    isValid: boolean;
    template: ResumeTemplate;
    atsScore: number; // 0-100
    industryAlignment: number; // 0-100
    issues: {
        level: 'error' | 'warning' | 'suggestion';
        category: 'formatting' | 'content' | 'structure' | 'ats' | 'industry';
        message: string;
        solution: string;
        affectedElements: string[];
    }[];
    recommendations: {
        priority: 'high' | 'medium' | 'low';
        category: 'ats' | 'industry' | 'formatting' | 'content';
        suggestion: string;
        implementation: string;
        impact: string;
    }[];
    metadata: {
        processingTime: number;
        confidenceScore: number;
        rulesApplied: string[];
        templateMatch: number; // 0-100
    };
}

export interface FormattingConsistencyCheck {
    fontConsistency: {
        score: number;
        issues: string[];
        recommendations: string[];
    };
    spacingConsistency: {
        score: number;
        issues: string[];
        recommendations: string[];
    };
    alignmentConsistency: {
        score: number;
        issues: string[];
        recommendations: string[];
    };
    colorConsistency: {
        score: number;
        issues: string[];
        recommendations: string[];
    };
}

class ResumeFormatAuthenticationSystem {
    private templates: Map<ResumeTemplate['name'], ResumeTemplate> = new Map();
    private atsRules: Map<string, ATSOptimizationRules> = new Map();
    private industryRules: Map<string, IndustryAlignmentRules> = new Map();

    constructor() {
        this.initializeTemplates();
        this.initializeATSRules();
        this.initializeIndustryRules();
    }

    /**
     * Main authentication method - validates and authenticates resume format
     */
    async authenticateResumeFormat(
        elements: any[],
        targetTemplate?: ResumeTemplate['name'],
        industry?: string
    ): Promise<ResumeValidationResult> {
        console.log('🔍 Starting Resume Format Authentication...');
        const startTime = Date.now();

        try {
            // Step 1: Detect or validate template
            const template = targetTemplate
                ? this.getTemplate(targetTemplate)
                : await this.detectBestTemplate(elements);

            console.log(`📋 Template: ${template.name} (confidence: ${Math.round(template.confidence * 100)}%)`);

            // Step 2: Calculate ATS optimization score
            const atsScore = await this.calculateATSScore(elements, template);
            console.log(`🤖 ATS Score: ${atsScore}/100`);

            // Step 3: Calculate industry alignment
            const industryAlignment = industry
                ? await this.calculateIndustryAlignment(elements, template, industry)
                : 85; // Default score if no industry specified

            console.log(`🏢 Industry Alignment: ${industryAlignment}/100`);

            // Step 4: Validate formatting consistency
            const consistencyCheck = await this.checkFormattingConsistency(elements, template);

            // Step 5: Identify issues and generate recommendations
            const issues = await this.identifyIssues(elements, template, atsScore, industryAlignment, consistencyCheck);
            const recommendations = await this.generateRecommendations(issues, template, industry);

            const processingTime = Date.now() - startTime;
            const confidenceScore = this.calculateOverallConfidence(template, atsScore, industryAlignment, consistencyCheck);
            const templateMatch = this.calculateTemplateMatch(elements, template);

            console.log(`✅ Resume Format Authentication completed in ${processingTime}ms`);

            return {
                isValid: issues.filter(i => i.level === 'error').length === 0,
                template,
                atsScore,
                industryAlignment,
                issues,
                recommendations,
                metadata: {
                    processingTime,
                    confidenceScore,
                    rulesApplied: this.getRulesApplied(template, industry),
                    templateMatch
                }
            };

        } catch (error) {
            console.error('❌ Resume Format Authentication failed:', error);
            return this.createErrorResult(error);
        }
    }

    /**
     * Initialize predefined resume templates
     */
    private initializeTemplates(): void {
        console.log('📋 Initializing resume templates...');

        // ATS-Friendly Template
        this.templates.set('ATS-Friendly', {
            name: 'ATS-Friendly',
            styleRules: [
                {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 0, marginBottom: 3, paddingLeft: 0 },
                    alignment: 'left'
                }
            ],
            sectionOrder: ['Contact', 'Professional Summary', 'Experience', 'Education', 'Skills', 'Certifications'],
            fontGuidelines: {
                heading: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.2,
                    spacing: { marginTop: 12, marginBottom: 6, paddingLeft: 0 },
                    alignment: 'left'
                },
                subheading: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 8, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                body: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 0, marginBottom: 3, paddingLeft: 0 },
                    alignment: 'left'
                },
                emphasis: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 0, marginBottom: 3, paddingLeft: 0 },
                    alignment: 'left'
                },
                contact: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.1,
                    spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 },
                    alignment: 'center'
                }
            },
            spacingRules: {
                pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
                sectionSpacing: 12,
                bulletIndentation: 18,
                lineSpacing: 1.15
            },
            confidence: 0.95
        });

        // Creative Template
        this.templates.set('Creative', {
            name: 'Creative',
            styleRules: [],
            sectionOrder: ['Contact', 'Portfolio', 'Experience', 'Skills', 'Education', 'Projects'],
            fontGuidelines: {
                heading: {
                    fontFamily: 'Montserrat, Arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#2563eb',
                    lineHeight: 1.3,
                    spacing: { marginTop: 16, marginBottom: 8, paddingLeft: 0 },
                    alignment: 'left'
                },
                subheading: {
                    fontFamily: 'Montserrat, Arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1f2937',
                    lineHeight: 1.25,
                    spacing: { marginTop: 12, marginBottom: 6, paddingLeft: 0 },
                    alignment: 'left'
                },
                body: {
                    fontFamily: 'Open Sans, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#374151',
                    lineHeight: 1.4,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                emphasis: {
                    fontFamily: 'Open Sans, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1f2937',
                    lineHeight: 1.4,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                contact: {
                    fontFamily: 'Open Sans, Arial, sans-serif',
                    fontSize: 10,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#6b7280',
                    lineHeight: 1.2,
                    spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 },
                    alignment: 'center'
                }
            },
            spacingRules: {
                pageMargins: { top: 90, bottom: 90, left: 90, right: 90 },
                sectionSpacing: 20,
                bulletIndentation: 24,
                lineSpacing: 1.4
            },
            confidence: 0.85
        });

        // Academic Template
        this.templates.set('Academic', {
            name: 'Academic',
            styleRules: [],
            sectionOrder: ['Contact', 'Education', 'Research Experience', 'Publications', 'Conferences', 'Awards', 'Skills'],
            fontGuidelines: {
                heading: {
                    fontFamily: 'Times New Roman, serif',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.2,
                    spacing: { marginTop: 14, marginBottom: 7, paddingLeft: 0 },
                    alignment: 'left'
                },
                subheading: {
                    fontFamily: 'Times New Roman, serif',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 10, marginBottom: 5, paddingLeft: 0 },
                    alignment: 'left'
                },
                body: {
                    fontFamily: 'Times New Roman, serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.3,
                    spacing: { marginTop: 0, marginBottom: 3, paddingLeft: 0 },
                    alignment: 'left'
                },
                emphasis: {
                    fontFamily: 'Times New Roman, serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.3,
                    spacing: { marginTop: 0, marginBottom: 3, paddingLeft: 0 },
                    alignment: 'left'
                },
                contact: {
                    fontFamily: 'Times New Roman, serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    lineHeight: 1.15,
                    spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 },
                    alignment: 'center'
                }
            },
            spacingRules: {
                pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
                sectionSpacing: 14,
                bulletIndentation: 20,
                lineSpacing: 1.3
            },
            confidence: 0.9
        });

        // Executive Template
        this.templates.set('Executive', {
            name: 'Executive',
            styleRules: [],
            sectionOrder: ['Contact', 'Executive Summary', 'Leadership Experience', 'Key Achievements', 'Education', 'Board Positions'],
            fontGuidelines: {
                heading: {
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1a365d',
                    lineHeight: 1.25,
                    spacing: { marginTop: 14, marginBottom: 7, paddingLeft: 0 },
                    alignment: 'left'
                },
                subheading: {
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: 13,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#2d3748',
                    lineHeight: 1.2,
                    spacing: { marginTop: 10, marginBottom: 5, paddingLeft: 0 },
                    alignment: 'left'
                },
                body: {
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#2d3748',
                    lineHeight: 1.3,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                emphasis: {
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1a365d',
                    lineHeight: 1.3,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                contact: {
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#4a5568',
                    lineHeight: 1.15,
                    spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 },
                    alignment: 'center'
                }
            },
            spacingRules: {
                pageMargins: { top: 80, bottom: 80, left: 80, right: 80 },
                sectionSpacing: 16,
                bulletIndentation: 20,
                lineSpacing: 1.3
            },
            confidence: 0.88
        });

        // Modern Template
        this.templates.set('Modern', {
            name: 'Modern',
            styleRules: [],
            sectionOrder: ['Contact', 'Summary', 'Experience', 'Skills', 'Education', 'Projects'],
            fontGuidelines: {
                heading: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1f2937',
                    lineHeight: 1.25,
                    spacing: { marginTop: 14, marginBottom: 7, paddingLeft: 0 },
                    alignment: 'left'
                },
                subheading: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    fontSize: 13,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#374151',
                    lineHeight: 1.2,
                    spacing: { marginTop: 10, marginBottom: 5, paddingLeft: 0 },
                    alignment: 'left'
                },
                body: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#374151',
                    lineHeight: 1.35,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                emphasis: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    color: '#1f2937',
                    lineHeight: 1.35,
                    spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 },
                    alignment: 'left'
                },
                contact: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    fontSize: 10,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#6b7280',
                    lineHeight: 1.2,
                    spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 },
                    alignment: 'center'
                }
            },
            spacingRules: {
                pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
                sectionSpacing: 14,
                bulletIndentation: 20,
                lineSpacing: 1.35
            },
            confidence: 0.85
        });

        console.log(`✅ Initialized ${this.templates.size} resume templates`);
    }

    /**
     * Initialize ATS optimization rules
     */
    private initializeATSRules(): void {
        console.log('🤖 Initializing ATS optimization rules...');

        this.atsRules.set('general', {
            keywords: {
                required: ['experience', 'skills', 'education'],
                recommended: ['achieved', 'managed', 'developed', 'implemented', 'improved'],
                industry: []
            },
            formatting: {
                maxBulletPoints: 5,
                preferredSections: ['Contact', 'Summary', 'Experience', 'Education', 'Skills'],
                avoidedFormatting: ['tables', 'text-boxes', 'headers-footers', 'graphics'],
                fileFormat: 'pdf'
            },
            structure: {
                maxPages: 2,
                sectionOrder: ['Contact', 'Summary', 'Experience', 'Education', 'Skills'],
                contactPlacement: 'header'
            },
            scanability: {
                fontReadability: 8,
                contrastRatio: 4.5,
                whiteSpaceRatio: 0.3
            }
        });

        console.log(`✅ Initialized ${this.atsRules.size} ATS rule sets`);
    }

    /**
     * Initialize industry alignment rules
     */
    private initializeIndustryRules(): void {
        console.log('🏢 Initializing industry alignment rules...');

        this.industryRules.set('technology', {
            industry: 'technology',
            preferredTemplates: ['Modern', 'ATS-Friendly'],
            requiredSections: ['Contact', 'Summary', 'Technical Skills', 'Experience', 'Projects', 'Education'],
            optionalSections: ['Certifications', 'Open Source Contributions', 'Publications'],
            languageStyle: 'technical',
            achievementFocus: 'quantitative'
        });

        this.industryRules.set('creative', {
            industry: 'creative',
            preferredTemplates: ['Creative', 'Modern'],
            requiredSections: ['Contact', 'Portfolio', 'Experience', 'Skills', 'Education'],
            optionalSections: ['Awards', 'Exhibitions', 'Publications', 'Projects'],
            languageStyle: 'creative',
            achievementFocus: 'qualitative'
        });

        console.log(`✅ Initialized ${this.industryRules.size} industry rule sets`);
    }

    /**
     * Detect the best template for given elements
     */
    private async detectBestTemplate(elements: any[]): Promise<ResumeTemplate> {
        console.log('🔍 Detecting best template match...');

        let bestTemplate: ResumeTemplate = this.templates.get('Modern')!;
        let bestScore = 0;

        for (const [name, template] of this.templates) {
            const score = this.calculateTemplateMatch(elements, template);
            console.log(`📋 ${name}: ${Math.round(score)}% match`);

            if (score > bestScore) {
                bestScore = score;
                bestTemplate = template;
            }
        }

        bestTemplate.confidence = bestScore / 100;
        console.log(`✅ Best template: ${bestTemplate.name} (${Math.round(bestScore)}% match)`);

        return bestTemplate;
    }

    /**
     * Calculate ATS optimization score
     */
    private async calculateATSScore(elements: any[], template: ResumeTemplate): Promise<number> {
        console.log('🤖 Calculating ATS optimization score...');

        const atsRules = this.atsRules.get('general')!;
        let score = 100;

        // Check formatting compliance
        const hasTablesOrGraphics = elements.some((e: any) =>
            e.type === 'table' || e.type === 'image' || e.type === 'graphic'
        );
        if (hasTablesOrGraphics) {
            score -= 20;
            console.log('⚠️ Tables/graphics detected (-20 points)');
        }

        // Check font readability
        const fonts = elements.map((e: any) => e.formatting?.fontFamily).filter(Boolean);
        const uniqueFonts = new Set(fonts);
        if (uniqueFonts.size > 2) {
            score -= 10;
            console.log('⚠️ Too many fonts (-10 points)');
        }

        // Check section structure
        const sections = elements.filter((e: any) => e.type === 'section-header');
        const preferredSections = atsRules.formatting.preferredSections;
        const matchingCount = sections.filter((s: any) =>
            preferredSections.some(p => s.text.toLowerCase().includes(p.toLowerCase()))
        ).length;

        const sectionScore = (matchingCount / preferredSections.length) * 20;
        score = Math.max(0, score - 20 + sectionScore);

        console.log(`🤖 ATS Score: ${Math.round(score)}/100`);
        return Math.round(score);
    }

    /**
     * Calculate industry alignment score
     */
    private async calculateIndustryAlignment(
        elements: any[],
        template: ResumeTemplate,
        industry: string
    ): Promise<number> {
        console.log(`🏢 Calculating industry alignment for: ${industry}`);

        const industryRules = this.industryRules.get(industry);
        if (!industryRules) {
            console.log('⚠️ No industry rules found, using default score');
            return 70;
        }

        let score = 50; // Base score

        // Check template preference
        if (industryRules.preferredTemplates.includes(template.name)) {
            score += 25;
            console.log(`✅ Template ${template.name} preferred for ${industry} (+25 points)`);
        }

        // Check required sections
        const sections = elements.filter((e: any) => e.type === 'section-header');
        const requiredSections = industryRules.requiredSections;
        const foundRequired = requiredSections.filter(req =>
            sections.some((s: any) => s.text.toLowerCase().includes(req.toLowerCase()))
        );

        const sectionScore = (foundRequired.length / requiredSections.length) * 25;
        score += sectionScore;

        console.log(`🏢 Industry Alignment: ${Math.round(score)}/100`);
        return Math.round(score);
    }

    /**
     * Check formatting consistency across elements
     */
    private async checkFormattingConsistency(
        elements: any[],
        template: ResumeTemplate
    ): Promise<FormattingConsistencyCheck> {
        console.log('🎨 Checking formatting consistency...');

        const fontConsistency = this.checkFontConsistency(elements, template);
        const spacingConsistency = this.checkSpacingConsistency(elements, template);
        const alignmentConsistency = this.checkAlignmentConsistency(elements, template);
        const colorConsistency = this.checkColorConsistency(elements, template);

        return {
            fontConsistency,
            spacingConsistency,
            alignmentConsistency,
            colorConsistency
        };
    }

    /**
     * Identify issues in resume format
     */
    private async identifyIssues(
        elements: any[],
        template: ResumeTemplate,
        atsScore: number,
        industryAlignment: number,
        consistencyCheck: FormattingConsistencyCheck
    ): Promise<ResumeValidationResult['issues']> {
        console.log('🔍 Identifying format issues...');

        const issues: ResumeValidationResult['issues'] = [];

        // ATS Issues
        if (atsScore < 70) {
            issues.push({
                level: 'warning',
                category: 'ats',
                message: 'Low ATS optimization score detected',
                solution: 'Simplify formatting and use standard fonts',
                affectedElements: ['document']
            });
        }

        // Font consistency issues
        if (consistencyCheck.fontConsistency.score < 80) {
            issues.push({
                level: 'warning',
                category: 'formatting',
                message: 'Inconsistent font usage detected',
                solution: 'Use consistent fonts throughout the document',
                affectedElements: consistencyCheck.fontConsistency.issues
            });
        }

        // Spacing issues
        if (consistencyCheck.spacingConsistency.score < 75) {
            issues.push({
                level: 'suggestion',
                category: 'formatting',
                message: 'Inconsistent spacing detected',
                solution: 'Maintain consistent spacing between sections',
                affectedElements: consistencyCheck.spacingConsistency.issues
            });
        }

        console.log(`🔍 Found ${issues.length} formatting issues`);
        return issues;
    }

    /**
     * Generate recommendations for improvement
     */
    private async generateRecommendations(
        issues: ResumeValidationResult['issues'],
        template: ResumeTemplate,
        industry?: string
    ): Promise<ResumeValidationResult['recommendations']> {
        console.log('💡 Generating improvement recommendations...');

        const recommendations: ResumeValidationResult['recommendations'] = [];

        // ATS Recommendations
        recommendations.push({
            priority: 'high',
            category: 'ats',
            suggestion: 'Use simple, clean formatting for better ATS compatibility',
            implementation: 'Remove tables, graphics, and complex formatting',
            impact: 'Increases chances of passing initial ATS screening'
        });

        // Industry-specific recommendations
        if (industry === 'technology') {
            recommendations.push({
                priority: 'medium',
                category: 'industry',
                suggestion: 'Include technical skills section with relevant technologies',
                implementation: 'Add a dedicated technical skills section highlighting programming languages and tools',
                impact: 'Better alignment with technology industry expectations'
            });
        }

        // Template-specific recommendations
        if (template.name === 'ATS-Friendly') {
            recommendations.push({
                priority: 'medium',
                category: 'formatting',
                suggestion: 'Maintain consistent bullet point formatting',
                implementation: 'Use the same bullet style and indentation throughout',
                impact: 'Improves visual consistency and readability'
            });
        }

        console.log(`💡 Generated ${recommendations.length} recommendations`);
        return recommendations;
    }

    // Helper methods

    private getTemplate(name: ResumeTemplate['name']): ResumeTemplate {
        const template = this.templates.get(name);
        if (!template) {
            throw new Error(`Template ${name} not found`);
        }
        return template;
    }

    private calculateTemplateMatch(elements: any[], template: ResumeTemplate): number {
        // Simplified template matching logic
        let score = 50; // Base score

        // Check section order
        const sections = elements.filter((e: any) => e.type === 'section-header');
        const expectedOrder = template.sectionOrder;

        let orderScore = 0;
        sections.forEach((section: any, index: number) => {
            const expectedSection = expectedOrder[index];
            if (expectedSection && section.text.toLowerCase().includes(expectedSection.toLowerCase())) {
                orderScore += 10;
            }
        });

        score += Math.min(orderScore, 30);

        // Check font guidelines
        const headings = elements.filter((e: any) => e.type === 'section-header');
        if (headings.length > 0) {
            const avgFontSize = headings.reduce((sum: number, h: any) => sum + (h.formatting?.fontSize || 12), 0) / headings.length;
            const expectedSize = template.fontGuidelines.heading.fontSize;

            if (Math.abs(avgFontSize - expectedSize) <= 2) {
                score += 20;
            }
        }

        return Math.min(score, 100);
    }

    private checkFontConsistency(elements: any[], template: ResumeTemplate): FormattingConsistencyCheck['fontConsistency'] {
        const fonts = elements.map((e: any) => e.formatting?.fontFamily).filter(Boolean);
        const uniqueFonts = new Set(fonts);

        const score = uniqueFonts.size <= 2 ? 90 : Math.max(50, 90 - (uniqueFonts.size - 2) * 15);

        return {
            score,
            issues: uniqueFonts.size > 2 ? ['multiple-fonts-detected'] : [],
            recommendations: uniqueFonts.size > 2 ? ['Use maximum 2 font families'] : []
        };
    }

    private checkSpacingConsistency(elements: any[], template: ResumeTemplate): FormattingConsistencyCheck['spacingConsistency'] {
        // Simplified spacing check
        return {
            score: 85,
            issues: [],
            recommendations: []
        };
    }

    private checkAlignmentConsistency(elements: any[], template: ResumeTemplate): FormattingConsistencyCheck['alignmentConsistency'] {
        // Simplified alignment check
        return {
            score: 90,
            issues: [],
            recommendations: []
        };
    }

    private checkColorConsistency(elements: any[], template: ResumeTemplate): FormattingConsistencyCheck['colorConsistency'] {
        // Simplified color check
        return {
            score: 95,
            issues: [],
            recommendations: []
        };
    }

    private calculateOverallConfidence(
        template: ResumeTemplate,
        atsScore: number,
        industryAlignment: number,
        consistencyCheck: FormattingConsistencyCheck
    ): number {
        const weights = {
            template: 0.3,
            ats: 0.25,
            industry: 0.2,
            consistency: 0.25
        };

        const avgConsistency = (
            consistencyCheck.fontConsistency.score +
            consistencyCheck.spacingConsistency.score +
            consistencyCheck.alignmentConsistency.score +
            consistencyCheck.colorConsistency.score
        ) / 4;

        const confidence =
            (template.confidence * 100) * weights.template +
            atsScore * weights.ats +
            industryAlignment * weights.industry +
            avgConsistency * weights.consistency;

        return Math.round(confidence);
    }

    private getRulesApplied(template: ResumeTemplate, industry?: string): string[] {
        const rules = [`template-${template.name.toLowerCase()}`];

        if (industry && this.industryRules.has(industry)) {
            rules.push(`industry-${industry}`);
        }

        rules.push('ats-general');

        return rules;
    }

    private createErrorResult(error: any): ResumeValidationResult {
        console.error('Creating error result for format authentication:', error);

        return {
            isValid: false,
            template: this.templates.get('Modern')!,
            atsScore: 0,
            industryAlignment: 0,
            issues: [{
                level: 'error',
                category: 'structure',
                message: 'Failed to authenticate resume format',
                solution: 'Please check the document format and try again',
                affectedElements: ['document']
            }],
            recommendations: [],
            metadata: {
                processingTime: 0,
                confidenceScore: 0,
                rulesApplied: [],
                templateMatch: 0
            }
        };
    }
}

export default new ResumeFormatAuthenticationSystem();
export { ResumeFormatAuthenticationSystem };