/**
 * Intelligent Resume Template Engine
 * Creates industry-standard resume templates from Liveblocks resumes
 * Uses Claude AI to optimize layout and formatting for specific industries/roles
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Industry-standard resume templates
 */
const INDUSTRY_TEMPLATES = {
    tech: {
        name: 'Modern Tech',
        layout: 'single-column',
        fonts: { heading: 'Inter', body: 'Inter' },
        colors: { primary: '#2563EB', accent: '#3B82F6' },
        sections: ['header', 'summary', 'skills', 'experience', 'projects', 'education'],
        emphasis: 'technical-skills',
        atsScore: 95
    },
    finance: {
        name: 'Professional Finance',
        layout: 'two-column',
        fonts: { heading: 'Times New Roman', body: 'Georgia' },
        colors: { primary: '#1F2937', accent: '#374151' },
        sections: ['header', 'summary', 'experience', 'education', 'certifications', 'skills'],
        emphasis: 'achievements',
        atsScore: 98
    },
    creative: {
        name: 'Creative Portfolio',
        layout: 'modern-grid',
        fonts: { heading: 'Helvetica', body: 'Arial' },
        colors: { primary: '#7C3AED', accent: '#A855F7' },
        sections: ['header', 'portfolio', 'experience', 'skills', 'education'],
        emphasis: 'visual-impact',
        atsScore: 85
    },
    healthcare: {
        name: 'Clinical Professional',
        layout: 'traditional',
        fonts: { heading: 'Arial', body: 'Arial' },
        colors: { primary: '#065F46', accent: '#10B981' },
        sections: ['header', 'credentials', 'experience', 'education', 'certifications', 'skills'],
        emphasis: 'credentials',
        atsScore: 97
    },
    consulting: {
        name: 'Management Consulting',
        layout: 'executive',
        fonts: { heading: 'Calibri', body: 'Calibri' },
        colors: { primary: '#1E40AF', accent: '#3B82F6' },
        sections: ['header', 'summary', 'experience', 'education', 'skills', 'leadership'],
        emphasis: 'impact-metrics',
        atsScore: 96
    },
    academic: {
        name: 'Academic CV',
        layout: 'detailed',
        fonts: { heading: 'Times New Roman', body: 'Times New Roman' },
        colors: { primary: '#000000', accent: '#374151' },
        sections: ['header', 'education', 'publications', 'research', 'teaching', 'awards'],
        emphasis: 'publications',
        atsScore: 90
    },
    marketing: {
        name: 'Marketing Professional',
        layout: 'modern',
        fonts: { heading: 'Montserrat', body: 'Open Sans' },
        colors: { primary: '#DC2626', accent: '#EF4444' },
        sections: ['header', 'summary', 'experience', 'campaigns', 'skills', 'education'],
        emphasis: 'results',
        atsScore: 93
    }
};

/**
 * Analyze resume content and recommend best template
 */
const recommendTemplate = async (resumeContent, targetRole, targetIndustry) => {
    console.log('[TEMPLATE ENGINE] Analyzing resume for template recommendation...');

    const prompt = `Analyze this resume and recommend the best industry-standard template.

RESUME CONTENT:
${resumeContent}

TARGET ROLE: ${targetRole || 'Not specified'}
TARGET INDUSTRY: ${targetIndustry || 'Not specified'}

AVAILABLE TEMPLATES:
${Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) =>
    `${key}: ${template.name} (Layout: ${template.layout}, ATS Score: ${template.atsScore}, Emphasis: ${template.emphasis})`
).join('\n')}

Respond with valid JSON:
{
  "recommendedTemplate": "template_key",
  "confidence": 0.95,
  "reasoning": "Why this template is best",
  "alternativeTemplates": ["alt1", "alt2"],
  "customizations": {
    "sectionsToAdd": [],
    "sectionsToRemove": [],
    "emphasize": "what to emphasize",
    "deemphasize": "what to minimize"
  },
  "industryInsights": "Specific advice for this industry"
}`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 2048,
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }]
        });

        const responseText = message.content[0].text.trim();

        // Extract JSON from markdown code blocks - try multiple patterns
        let jsonText = responseText;

        // Pattern 1: ```json ... ```
        let codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

        // Pattern 2: ``` ... ```
        if (!codeBlockMatch) {
            codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
        }

        // Pattern 3: Find JSON object directly
        if (!codeBlockMatch) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                codeBlockMatch = [null, jsonMatch[0]];
            }
        }

        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1].trim();
        }

        jsonText = jsonText.trim();

        const recommendation = JSON.parse(jsonText);

        console.log('[TEMPLATE ENGINE] Template recommended:', recommendation.recommendedTemplate);

        return {
            success: true,
            recommendation,
            template: INDUSTRY_TEMPLATES[recommendation.recommendedTemplate]
        };

    } catch (error) {
        console.error('[TEMPLATE ENGINE] Recommendation failed:', error);

        // Fallback to tech template
        return {
            success: false,
            recommendation: {
                recommendedTemplate: 'tech',
                confidence: 0.5,
                reasoning: 'Using default template due to analysis error'
            },
            template: INDUSTRY_TEMPLATES.tech
        };
    }
};

/**
 * Transform resume content to match template structure
 */
const applyTemplate = async (resumeContent, templateKey, customizations = {}) => {
    console.log('[TEMPLATE ENGINE] Applying template:', templateKey);

    const template = INDUSTRY_TEMPLATES[templateKey];
    if (!template) {
        throw new Error(`Template ${templateKey} not found`);
    }

    const prompt = `Transform this resume to match the ${template.name} template.

RESUME CONTENT:
${resumeContent}

TEMPLATE REQUIREMENTS:
- Layout: ${template.layout}
- Sections (in order): ${template.sections.join(', ')}
- Emphasis: ${template.emphasis}
- ATS Optimization: ${template.atsScore}%

CUSTOMIZATIONS:
${JSON.stringify(customizations, null, 2)}

INSTRUCTIONS:
1. Restructure content to match template sections
2. Optimize bullet points for ATS (use strong action verbs, quantify achievements)
3. Format according to template layout
4. Maintain all important information
5. Remove redundancy
6. Enhance impact statements

Respond with valid JSON:
{
  "transformedHTML": "<formatted HTML content>",
  "sections": [
    {
      "name": "section_name",
      "content": "section HTML",
      "improvements": "what was improved"
    }
  ],
  "atsOptimizations": ["optimization 1", "optimization 2"],
  "impactEnhancements": ["enhancement 1", "enhancement 2"],
  "summary": "What was changed and why"
}`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 8192, // Increased from 4096 to handle longer resumes
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }]
        });

        const responseText = message.content[0].text.trim();
        console.log('[TEMPLATE ENGINE] Claude response length:', responseText.length);
        console.log('[TEMPLATE ENGINE] Stop reason:', message.stop_reason);

        // Check if response was truncated
        if (message.stop_reason === 'max_tokens') {
            console.warn('[TEMPLATE ENGINE] WARNING: Response was truncated due to max_tokens limit');
            throw new Error('Response was truncated. The resume content is too long. Please increase max_tokens or simplify the resume.');
        }

        // Extract JSON from markdown code blocks - try multiple patterns
        let jsonText = responseText;

        // Pattern 1: ```json ... ```
        let codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

        // Pattern 2: ``` ... ```
        if (!codeBlockMatch) {
            codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
        }

        // Pattern 3: Find JSON object directly
        if (!codeBlockMatch) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                codeBlockMatch = [null, jsonMatch[0]];
            }
        }

        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1].trim();
            console.log('[TEMPLATE ENGINE] Extracted JSON from code block');
        } else {
            console.log('[TEMPLATE ENGINE] No code block found, using raw response');
        }

        // Remove any leading/trailing whitespace and newlines
        jsonText = jsonText.trim();

        // Log first 500 chars of JSON for debugging
        console.log('[TEMPLATE ENGINE] Parsing JSON (first 500 chars):', jsonText.substring(0, 500));

        let result;
        try {
            result = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('[TEMPLATE ENGINE] JSON parse failed, attempting to save raw response for debugging');
            // Save the problematic response to a file for inspection
            const fs = require('fs');
            const debugPath = path.join(__dirname, '../debug-claude-response.json');
            fs.writeFileSync(debugPath, jsonText, 'utf8');
            console.error('[TEMPLATE ENGINE] Raw response saved to:', debugPath);
            console.error('[TEMPLATE ENGINE] Parse error position:', parseError.message);

            // Try to extract the position and show context
            const posMatch = parseError.message.match(/position (\d+)/);
            if (posMatch) {
                const pos = parseInt(posMatch[1]);
                const start = Math.max(0, pos - 100);
                const end = Math.min(jsonText.length, pos + 100);
                console.error('[TEMPLATE ENGINE] Context around error:');
                console.error(jsonText.substring(start, end));
            }

            throw parseError;
        }

        console.log('[TEMPLATE ENGINE] Template applied successfully');

        return {
            success: true,
            transformedHTML: result.transformedHTML,
            sections: result.sections,
            atsOptimizations: result.atsOptimizations,
            impactEnhancements: result.impactEnhancements,
            summary: result.summary,
            template
        };

    } catch (error) {
        console.error('[TEMPLATE ENGINE] Template application failed:', error);
        console.error('[TEMPLATE ENGINE] Error type:', error.constructor.name);
        console.error('[TEMPLATE ENGINE] Error message:', error.message);
        throw new Error(`Failed to apply template: ${error.message}`);
    }
};

/**
 * Save resume as a custom template
 */
const saveAsTemplate = async (userId, resumeContent, templateName, templateMetadata) => {
    console.log('[TEMPLATE ENGINE] Saving custom template:', templateName);

    try {
        const templateDir = path.join(__dirname, '../templates/user-templates');
        await fs.mkdir(templateDir, { recursive: true });

        const templateId = `${userId}-${Date.now()}`;
        const templateData = {
            id: templateId,
            userId,
            name: templateName,
            content: resumeContent,
            metadata: templateMetadata,
            createdAt: new Date().toISOString(),
            baseTemplate: templateMetadata.baseTemplate || 'custom'
        };

        const templatePath = path.join(templateDir, `${templateId}.json`);
        await fs.writeFile(templatePath, JSON.stringify(templateData, null, 2));

        console.log('[TEMPLATE ENGINE] Template saved:', templatePath);

        return {
            success: true,
            templateId,
            templatePath
        };

    } catch (error) {
        console.error('[TEMPLATE ENGINE] Template save failed:', error);
        throw new Error(`Failed to save template: ${error.message}`);
    }
};

/**
 * Get user's saved templates
 */
const getUserTemplates = async (userId) => {
    console.log('[TEMPLATE ENGINE] Loading templates for user:', userId);

    try {
        const templateDir = path.join(__dirname, '../templates/user-templates');

        // Create directory if it doesn't exist
        try {
            await fs.access(templateDir);
        } catch {
            await fs.mkdir(templateDir, { recursive: true });
            return { success: true, templates: [] };
        }

        const files = await fs.readdir(templateDir);
        const userTemplates = [];

        for (const file of files) {
            if (file.startsWith(`${userId}-`) && file.endsWith('.json')) {
                const templatePath = path.join(templateDir, file);
                const templateData = JSON.parse(await fs.readFile(templatePath, 'utf8'));
                userTemplates.push(templateData);
            }
        }

        console.log('[TEMPLATE ENGINE] Found', userTemplates.length, 'templates');

        return {
            success: true,
            templates: userTemplates
        };

    } catch (error) {
        console.error('[TEMPLATE ENGINE] Template loading failed:', error);
        return {
            success: false,
            templates: [],
            error: error.message
        };
    }
};

/**
 * Generate template preview
 */
const generateTemplatePreview = async (templateKey) => {
    const template = INDUSTRY_TEMPLATES[templateKey];
    if (!template) {
        throw new Error(`Template ${templateKey} not found`);
    }

    return {
        success: true,
        preview: {
            name: template.name,
            layout: template.layout,
            sections: template.sections,
            styling: {
                fonts: template.fonts,
                colors: template.colors
            },
            features: {
                emphasis: template.emphasis,
                atsScore: template.atsScore
            },
            previewHTML: generatePreviewHTML(template)
        }
    };
};

/**
 * Generate preview HTML for template
 */
const generatePreviewHTML = (template) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: ${template.fonts.body};
            color: ${template.colors.primary};
            max-width: 850px;
            margin: 0 auto;
            padding: 40px;
        }
        h1, h2, h3 {
            font-family: ${template.fonts.heading};
            color: ${template.colors.primary};
        }
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        h2 {
            font-size: 18px;
            color: ${template.colors.accent};
            border-bottom: 2px solid ${template.colors.accent};
            padding-bottom: 5px;
            margin-top: 20px;
        }
        .section {
            margin-bottom: 20px;
        }
        ul {
            margin-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <h1>Your Name</h1>
    <div class="contact">
        your.email@example.com | (555) 123-4567 | linkedin.com/in/yourname
    </div>

    ${template.sections.map(section => `
        <div class="section">
            <h2>${section.toUpperCase()}</h2>
            <p>Sample content for ${section} section...</p>
        </div>
    `).join('\n')}
</body>
</html>
    `;
};

/**
 * Get all available templates
 */
const getAllTemplates = () => {
    return {
        success: true,
        templates: Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => ({
            id: key,
            name: template.name,
            layout: template.layout,
            emphasis: template.emphasis,
            atsScore: template.atsScore,
            sections: template.sections
        }))
    };
};

module.exports = {
    recommendTemplate,
    applyTemplate,
    saveAsTemplate,
    getUserTemplates,
    generateTemplatePreview,
    getAllTemplates,
    INDUSTRY_TEMPLATES
};
