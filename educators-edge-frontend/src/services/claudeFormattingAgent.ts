/**
 * Claude AI Formatting Agent
 * Specialized AI agent for preserving document authenticity while enhancing formatting
 * Maintains original content positioning and structure
 */

export interface DocumentSection {
    type: 'header' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'other';
    title: string;
    content: string;
    originalPosition: number;
    subsections?: DocumentSubsection[];
}

export interface DocumentSubsection {
    title: string;
    content: string;
    bulletPoints: string[];
    dateRange?: string;
    location?: string;
    originalOrder: number;
}

export interface FormattingAnalysis {
    sections: DocumentSection[];
    originalStructure: {
        titlePositions: { [key: string]: number };
        contentFlow: string[];
        bulletPointStyles: string[];
        sectionBreaks: number[];
    };
    authenticity: {
        contentPreserved: boolean;
        positionMaintained: boolean;
        structureIntact: boolean;
        improvements: string[];
    };
    recommendations: {
        spacing: string[];
        alignment: string[];
        typography: string[];
        visual: string[];
    };
}

export interface FormattingRequest {
    originalContent: string;
    templateStyle: 'executive' | 'technical' | 'creative' | 'academic' | 'entry-level';
    preserveOrder: boolean;
    enhanceVisuals: boolean;
    formattingData?: {
        detectedHeadings: Array<{
            text: string;
            level: number;
            position: number;
            formatting: {
                isBold: boolean;
                fontSize?: number;
                isUpperCase: boolean;
            };
        }>;
        boldTexts: string[];
        headingsFound: number;
    };
}

class ClaudeFormattingAgent {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
    }

    /**
     * Analyze document structure and preserve authenticity
     */
    async analyzeDocumentStructure(content: string): Promise<FormattingAnalysis> {
        console.log('🔍 Claude Formatting Agent: Analyzing document structure...');

        // Validate content before processing
        if (!this.isValidTextContent(content)) {
            console.warn('⚠️ Invalid or binary content detected, using fallback analysis');
            return this.createFallbackAnalysis(content);
        }

        const prompt = `
You are a professional document formatting specialist with expertise in resume structure analysis.

Analyze this resume content and provide a detailed structure analysis:

RESUME CONTENT:
${content}

Please analyze and return:
1. Document sections in their EXACT original order
2. Position of titles relative to content
3. Bullet point structures and styles
4. Section breaks and spacing patterns
5. Content authenticity preservation recommendations

Focus on:
- Maintaining original content positioning
- Preserving the author's intended flow
- Identifying natural section breaks
- Noting title placement patterns
- Preserving bullet point hierarchies

Return your analysis in this JSON format:
{
  "sections": [
    {
      "type": "section_type",
      "title": "section_title",
      "content": "section_content",
      "originalPosition": position_number,
      "subsections": [
        {
          "title": "subsection_title",
          "content": "content",
          "bulletPoints": ["bullet1", "bullet2"],
          "dateRange": "dates_if_any",
          "location": "location_if_any",
          "originalOrder": order_number
        }
      ]
    }
  ],
  "originalStructure": {
    "titlePositions": {"title": position},
    "contentFlow": ["section1", "section2"],
    "bulletPointStyles": ["style1", "style2"],
    "sectionBreaks": [position1, position2]
  },
  "authenticity": {
    "contentPreserved": true,
    "positionMaintained": true,
    "structureIntact": true,
    "improvements": ["improvement1", "improvement2"]
  },
  "recommendations": {
    "spacing": ["spacing_rec1"],
    "alignment": ["alignment_rec1"],
    "typography": ["typography_rec1"],
    "visual": ["visual_rec1"]
  }
}
`;

        try {
            const response = await this.callClaudeAPI(prompt);
            return this.parseAnalysisResponse(response);
        } catch (error) {
            console.error('❌ Error analyzing document structure:', error);
            return this.createFallbackAnalysis(content);
        }
    }

    /**
     * Generate authentic formatting for specific template
     */
    async generateAuthenticFormatting(
        analysis: FormattingAnalysis,
        templateStyle: string,
        originalContent: string,
        formattingData?: {
            detectedHeadings: Array<{
                text: string;
                level: number;
                position: number;
                formatting: { isBold: boolean; fontSize?: number; isUpperCase: boolean; };
            }>;
            boldTexts: string[];
            headingsFound: number;
        }
    ): Promise<string> {
        console.log(`🎨 Claude Formatting Agent: Generating authentic formatting for ${templateStyle} template...`);

        if (formattingData && formattingData.detectedHeadings.length > 0) {
            console.log(`📝 Using detected formatting: ${formattingData.headingsFound} headings found`);
        }

        const formattingInfo = formattingData ? `

DETECTED FORMATTING INFORMATION:
- Headings Found: ${formattingData.headingsFound}
- Detected Headings with Formatting:
${formattingData.detectedHeadings.map(h =>
  `  • "${h.text}" (Level ${h.level}, ${h.formatting.isBold ? 'BOLD' : 'normal'}, ${h.formatting.isUpperCase ? 'UPPERCASE' : 'normal case'})`
).join('\n')}
- Bold Text Elements: ${formattingData.boldTexts.length} detected` : '';

        const prompt = `
You are an expert resume formatter specializing in document authenticity and professional presentation.

ORIGINAL DOCUMENT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

TEMPLATE STYLE: ${templateStyle}
${formattingInfo}

ORIGINAL CONTENT:
${originalContent}

Create a professionally formatted resume that:

CRITICAL REQUIREMENTS:
1. PRESERVE EXACT CONTENT POSITIONING - Do not reorder sections
2. MAINTAIN ORIGINAL STRUCTURE - Keep titles above their content
3. PRESERVE BULLET POINT HIERARCHIES - Keep original groupings
4. MAINTAIN CONTENT AUTHENTICITY - No content should move to different sections
5. RESPECT ORIGINAL FORMATTING - Use detected headings and bold text as structure indicators:
   - Text identified as headings should be formatted as section headers
   - Bold text in original should remain emphasized
   - Preserve heading hierarchy levels as detected
   - Uppercase headings should maintain prominence

FORMATTING ENHANCEMENTS:
1. Improve visual spacing and alignment
2. Enhance typography while preserving readability
3. Add appropriate section separators
4. Optimize bullet point formatting
5. Improve overall visual hierarchy

TEMPLATE-SPECIFIC STYLING:
- Executive: Clean, professional, minimal colors
- Technical: Structured, logical flow, emphasis on skills
- Creative: Modern styling, subtle design elements
- Academic: Traditional, scholarly appearance
- Entry-Level: Fresh, approachable, growth-focused

Return complete HTML with inline CSS that:
- Preserves 100% of original content
- Maintains exact section ordering
- Enhances visual presentation
- Follows ${templateStyle} style guidelines
- Ensures ATS compatibility

Format as production-ready HTML with professional styling.
`;

        try {
            const response = await this.callClaudeAPI(prompt);
            return this.processFormattedHTML(response, analysis);
        } catch (error) {
            console.error('❌ Error generating authentic formatting:', error);
            return this.createFallbackFormatting(originalContent, templateStyle);
        }
    }

    /**
     * Validate content authenticity after formatting
     */
    async validateAuthenticity(
        originalContent: string,
        formattedContent: string
    ): Promise<{
        isAuthentic: boolean;
        preservationScore: number;
        issues: string[];
        recommendations: string[];
    }> {
        console.log('✅ Claude Formatting Agent: Validating content authenticity...');

        const prompt = `
You are a document authenticity validator. Compare the original and formatted resume content.

ORIGINAL CONTENT:
${originalContent}

FORMATTED CONTENT:
${formattedContent}

Validate:
1. All original content is preserved
2. Section ordering is maintained
3. Bullet points remain in original groupings
4. No content has been moved between sections
5. Professional presentation is enhanced

Provide validation score (0-100) and detailed analysis:
{
  "isAuthentic": boolean,
  "preservationScore": number,
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"]
}
`;

        try {
            const response = await this.callClaudeAPI(prompt);
            return this.parseValidationResponse(response);
        } catch (error) {
            console.error('❌ Error validating authenticity:', error);
            return {
                isAuthentic: false,
                preservationScore: 0,
                issues: ['Unable to validate authenticity'],
                recommendations: ['Manual review recommended']
            };
        }
    }

    /**
     * Enhanced template generation with authenticity preservation
     */
    async enhanceTemplate(
        originalContent: string,
        templateId: string,
        preserveOriginalOrder: boolean = true,
        formattingData?: {
            detectedHeadings: Array<{
                text: string;
                level: number;
                position: number;
                formatting: { isBold: boolean; fontSize?: number; isUpperCase: boolean; };
            }>;
            boldTexts: string[];
            headingsFound: number;
        }
    ): Promise<{
        html: string;
        analysis: FormattingAnalysis;
        authenticity: any;
        improvements: string[];
    }> {
        console.log(`🚀 Claude Formatting Agent: Enhancing template ${templateId} with authenticity preservation...`);

        // Step 1: Analyze original structure
        const analysis = await this.analyzeDocumentStructure(originalContent);

        // Step 2: Generate authentic formatting
        const formattedHTML = await this.generateAuthenticFormatting(
            analysis,
            templateId,
            originalContent,
            formattingData
        );

        // Step 3: Validate authenticity
        const authenticity = await this.validateAuthenticity(
            originalContent,
            formattedHTML
        );

        // Step 4: Extract improvements made
        const improvements = analysis.authenticity.improvements;

        return {
            html: formattedHTML,
            analysis,
            authenticity,
            improvements
        };
    }

    /**
     * Call Claude API
     */
    private async callClaudeAPI(prompt: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Claude API key not configured');
        }

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Parse analysis response from Claude
     */
    private parseAnalysisResponse(response: string): FormattingAnalysis {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No JSON found in response');
        } catch (error) {
            console.error('Error parsing analysis response:', error);
            return this.createFallbackAnalysis('');
        }
    }

    /**
     * Process formatted HTML from Claude
     */
    private processFormattedHTML(response: string, analysis: FormattingAnalysis): string {
        // Extract HTML content and ensure it's properly formatted
        const htmlMatch = response.match(/<html[\s\S]*<\/html>|<div[\s\S]*<\/div>/i);
        if (htmlMatch) {
            return this.addAuthenticityMeta(htmlMatch[0], analysis);
        }

        // Fallback: wrap response in HTML structure
        return this.wrapInHTMLStructure(response, analysis);
    }

    /**
     * Parse validation response
     */
    private parseValidationResponse(response: string): any {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No JSON found in validation response');
        } catch (error) {
            return {
                isAuthentic: false,
                preservationScore: 0,
                issues: ['Unable to parse validation'],
                recommendations: ['Manual review required']
            };
        }
    }

    /**
     * Add authenticity metadata to HTML
     */
    private addAuthenticityMeta(html: string, analysis: FormattingAnalysis): string {
        const meta = `
<!-- Authenticity Preserved by Claude Formatting Agent -->
<!-- Content Preservation Score: ${analysis.authenticity.contentPreserved ? 100 : 0}% -->
<!-- Original Structure Maintained: ${analysis.authenticity.structureIntact} -->
<!-- Generated: ${new Date().toISOString()} -->
`;
        return html.replace('<head>', `<head>${meta}`);
    }

    /**
     * Wrap content in proper HTML structure
     */
    private wrapInHTMLStructure(content: string, analysis: FormattingAnalysis): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume - Formatted by Claude AI</title>
    <!-- Authenticity Preserved by Claude Formatting Agent -->
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; margin: 40px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 1.2em; margin-bottom: 10px; }
        .bullet-point { margin-left: 20px; margin-bottom: 5px; }
        .preserved-order { /* Original order maintained */ }
    </style>
</head>
<body>
    <div class="preserved-order">
        ${content}
    </div>
</body>
</html>`;
    }

    /**
     * Create fallback analysis when API fails
     */
    private createFallbackAnalysis(content: string): FormattingAnalysis {
        const sections = this.basicSectionParsing(content);

        return {
            sections,
            originalStructure: {
                titlePositions: {},
                contentFlow: sections.map(s => s.title),
                bulletPointStyles: ['•', '-', '*'],
                sectionBreaks: []
            },
            authenticity: {
                contentPreserved: true,
                positionMaintained: true,
                structureIntact: true,
                improvements: ['Basic formatting applied']
            },
            recommendations: {
                spacing: ['Improve section spacing'],
                alignment: ['Align content consistently'],
                typography: ['Enhance typography'],
                visual: ['Add visual hierarchy']
            }
        };
    }

    /**
     * Create fallback formatting when API fails
     */
    private createFallbackFormatting(content: string, templateStyle: string): string {
        const cleanContent = content.replace(/\n/g, '<br>');
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Resume - ${templateStyle} Template</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .authentic-preserved { /* Content order preserved */ }
    </style>
</head>
<body>
    <div class="authentic-preserved">
        ${cleanContent}
    </div>
</body>
</html>`;
    }

    /**
     * Basic section parsing for fallback
     */
    private basicSectionParsing(content: string): DocumentSection[] {
        const lines = content.split('\n');
        const sections: DocumentSection[] = [];
        let currentSection: DocumentSection | null = null;
        let position = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;

            // Detect section headers (common patterns)
            if (this.isLikelyHeader(trimmed)) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    type: this.inferSectionType(trimmed),
                    title: trimmed,
                    content: '',
                    originalPosition: position,
                    subsections: []
                };
            } else if (currentSection) {
                currentSection.content += trimmed + ' ';
            }
            position++;
        }

        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Detect if line is likely a header
     */
    private isLikelyHeader(line: string): boolean {
        const headerPatterns = [
            /^[A-Z][A-Z\s]+$/,  // ALL CAPS
            /^[A-Z][a-z\s]+:$/,  // Title Case with colon
            /^(Experience|Education|Skills|Summary|Objective|Projects|Certifications)/i,
            /^[A-Z][^.]{2,30}$/  // Short capitalized line without period
        ];

        return headerPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Infer section type from title
     */
    private inferSectionType(title: string): DocumentSection['type'] {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('experience') || titleLower.includes('work') || titleLower.includes('employment')) {
            return 'experience';
        } else if (titleLower.includes('education') || titleLower.includes('degree') || titleLower.includes('university')) {
            return 'education';
        } else if (titleLower.includes('skill') || titleLower.includes('technical') || titleLower.includes('competenc')) {
            return 'skills';
        } else if (titleLower.includes('project') || titleLower.includes('portfolio')) {
            return 'projects';
        } else if (titleLower.includes('certification') || titleLower.includes('license') || titleLower.includes('award')) {
            return 'certifications';
        } else if (titleLower.includes('summary') || titleLower.includes('objective') || titleLower.includes('profile')) {
            return 'header';
        }

        return 'other';
    }

    /**
     * Validate if content is readable text (not binary data)
     */
    private isValidTextContent(content: string): boolean {
        if (!content || content.length === 0) {
            return false;
        }

        // Check for binary/corrupted content patterns
        const binaryPatterns = [
            /PK\x03\x04/,  // ZIP file header (DOCX)
            /\x00{4,}/,     // Multiple null bytes
            /[\x00-\x08\x0E-\x1F\x7F-\xFF]{10,}/, // Extended control characters
            /��{5,}/,       // Corruption indicators
        ];

        // Check if content is mostly printable characters
        const printableChars = content.replace(/[\s\n\r\t]/g, '');
        const nonPrintableCount = (printableChars.match(/[^\x20-\x7E]/g) || []).length;
        const printableRatio = (printableChars.length - nonPrintableCount) / printableChars.length;

        // Content is invalid if:
        // - Contains binary patterns
        // - Less than 50% printable characters
        // - Too short to be meaningful
        const hasBinaryPattern = binaryPatterns.some(pattern => pattern.test(content));
        const hasLowPrintableRatio = printableRatio < 0.5;
        const isTooShort = content.trim().length < 20;

        if (hasBinaryPattern || hasLowPrintableRatio || isTooShort) {
            console.warn('⚠️ Content validation failed:', {
                hasBinaryPattern,
                printableRatio: printableRatio.toFixed(2),
                contentLength: content.length,
                preview: content.substring(0, 100)
            });
            return false;
        }

        return true;
    }

    /**
     * Enhanced fallback analysis for binary or corrupted content
     */
    private createEnhancedFallbackAnalysis(fileName?: string): FormattingAnalysis {
        console.log('🔧 Creating enhanced fallback analysis...');

        return {
            sections: [
                {
                    type: 'header',
                    title: 'Personal Information',
                    content: 'Header section placeholder',
                    originalPosition: 0,
                    subsections: []
                },
                {
                    type: 'experience',
                    title: 'Professional Experience',
                    content: 'Experience section placeholder',
                    originalPosition: 1,
                    subsections: []
                },
                {
                    type: 'education',
                    title: 'Education',
                    content: 'Education section placeholder',
                    originalPosition: 2,
                    subsections: []
                },
                {
                    type: 'skills',
                    title: 'Skills',
                    content: 'Skills section placeholder',
                    originalPosition: 3,
                    subsections: []
                }
            ],
            originalStructure: {
                titlePositions: {
                    'Personal Information': 0,
                    'Professional Experience': 1,
                    'Education': 2,
                    'Skills': 3
                },
                contentFlow: ['Personal Information', 'Professional Experience', 'Education', 'Skills'],
                bulletPointStyles: ['•', '-', '*'],
                sectionBreaks: [0, 1, 2, 3]
            },
            authenticity: {
                contentPreserved: false,
                positionMaintained: false,
                structureIntact: false,
                improvements: [
                    'Document requires manual text extraction',
                    'Using standard template structure',
                    fileName ? `Processing ${fileName}` : 'Processing uploaded document',
                    'Consider uploading PDF or plain text for better results'
                ]
            },
            recommendations: {
                spacing: ['Use consistent section spacing'],
                alignment: ['Align content to left margin'],
                typography: ['Use professional fonts'],
                visual: ['Apply clean, minimal design']
            }
        };
    }
}

// Export singleton instance
const claudeFormattingAgent = new ClaudeFormattingAgent();
export default claudeFormattingAgent;