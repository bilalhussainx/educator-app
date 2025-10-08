/**
 * Claude Resume Coach Service
 * Enhanced AI analysis using formatting context from Azure Vision
 * This implements the single-comprehensive-prompt strategy with visual awareness
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Analyze resume with visual formatting context
 * Provides expert, context-aware coaching to improve the resume
 */
const analyzeResumeWithContext = async (plainText, formattingContext, sections) => {
    console.log('[CLAUDE COACH] Starting context-aware resume analysis...');

    const prompt = buildEnhancedPrompt(plainText, formattingContext, sections);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            temperature: 0.7,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Parse JSON response
        let analysis;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                            responseText.match(/```\n([\s\S]*?)\n```/) ||
                            [null, responseText];

            analysis = JSON.parse(jsonMatch[1] || responseText);
        } catch (parseError) {
            console.error('[CLAUDE COACH] Failed to parse JSON response:', parseError);

            // Return structured error with raw response
            analysis = {
                assessment: responseText,
                priorityImprovements: [],
                parseError: true
            };
        }

        console.log('[CLAUDE COACH] Analysis complete');

        return {
            success: true,
            analysis,
            tokensUsed: {
                input: message.usage.input_tokens,
                output: message.usage.output_tokens
            }
        };

    } catch (error) {
        console.error('[CLAUDE COACH] Analysis failed:', error);
        throw new Error(`Claude analysis failed: ${error.message}`);
    }
};

/**
 * Build enhanced prompt with formatting context
 */
const buildEnhancedPrompt = (plainText, formattingContext, sections) => {
    const contextSummary = formattingContext.summary || 'No formatting context available';

    return `You are a professional resume coach with expertise in both content and visual presentation. Your goal is to guide the user to a better resume by teaching them best practices.

## FORMATTING CONTEXT (Visual Analysis from Azure Vision)

The user's resume has been analyzed for visual structure and formatting. Use this context to provide specific, actionable feedback:

${contextSummary}

### Detailed Visual Metrics:

**Typography:**
- Font hierarchy: ${formattingContext.typography?.fontHierarchy?.levels || 0} levels
- Font sizes used: ${formattingContext.typography?.fontHierarchy?.sizes?.join(', ') || 'N/A'}pt
- Bold elements: ${formattingContext.typography?.boldUsage?.percentage || 0}%

**Visual Consistency:**
- Consistency score: ${formattingContext.consistency?.score || 0}/100
${formattingContext.consistency?.issues?.length > 0 ? `- Issues found: ${formattingContext.consistency.issues.length}` : '- No consistency issues'}

**Bullet Points:**
${formattingContext.bulletPointAnalysis?.hasBullets ? `- Total: ${formattingContext.bulletPointAnalysis.totalCount}
- Average length: ${formattingContext.bulletPointAnalysis.lengthAnalysis?.average || 0} characters
- Action verbs: ${formattingContext.bulletPointAnalysis.qualityMetrics?.startsWithActionVerb || 0}
- Quantifiable metrics: ${formattingContext.bulletPointAnalysis.qualityMetrics?.containsNumbers || 0}
- Too long (>200 chars): ${formattingContext.bulletPointAnalysis.lengthAnalysis?.tooLong || 0}` : '- No bullet points detected'}

**ATS Compatibility:**
- Score: ${formattingContext.atsCompatibility?.score || 0}/100
- Layout: ${formattingContext.documentStructure?.layoutType || 'unknown'}
${formattingContext.atsCompatibility?.issues?.length > 0 ? `- Issues: ${formattingContext.atsCompatibility.issues.map(i => i.category).join(', ')}` : ''}

## TASK

Analyze the resume content below and provide expert coaching feedback. Your analysis should:

1. **Leverage visual context**: Use the formatting analysis above to give specific, visual-aware advice
   - Example: "Job title 'Tech Lead' is not bold, unlike your other job titles - fix this for consistency"
   - Example: "You have 28 bullet points, which is too many for a one-page resume"

2. **Focus on teaching**: Explain WHY each improvement matters and HOW to fix it

3. **Prioritize impact**: Focus on high-impact improvements first

4. **Be specific**: Reference exact sections, bullet points, or formatting issues from the context

## OUTPUT FORMAT

Respond ONLY with valid JSON in this exact structure:

{
  "assessment": "Brief overall assessment (2-3 sentences)",
  "overallScore": {
    "content": 75,
    "formatting": 60,
    "ats": 80,
    "overall": 72
  },
  "priorityImprovements": [
    {
      "category": "Content | Formatting/ATS | Structure | Impact",
      "priority": "high | medium | low",
      "issue": "Clear description of the issue",
      "contextual_hint": "Specific reference using the visual context (e.g., 'Look at the 7 bullet points under Senior Developer')",
      "why_it_matters": "Explanation of why this matters for resume effectiveness",
      "how_to_fix": "Step-by-step guidance on how to fix it",
      "example": "Optional: show a before/after example"
    }
  ],
  "strengths": [
    "What the resume does well"
  ],
  "quickWins": [
    "Fast, high-impact changes the user can make right now"
  ]
}

## RESUME CONTENT

Sections detected: ${sections.map(s => s.title).join(', ')}

${plainText}

Remember:
- Use the formatting context to provide visual-centric advice
- Be specific and actionable
- Teach best practices, don't just list problems
- Respond ONLY with valid JSON`;
};

/**
 * Generate template hints based on visual analysis
 * Suggests how to improve the visual layout
 */
const generateTemplateHints = async (formattingContext, sections) => {
    console.log('[CLAUDE COACH] Generating template hints...');

    const prompt = `You are a resume design expert. Based on the visual analysis below, provide specific template and layout recommendations.

## VISUAL ANALYSIS

${formattingContext.summary}

Layout: ${formattingContext.documentStructure?.layoutType || 'unknown'}
Style: ${formattingContext.documentStructure?.overallStyle || 'unknown'}
Sections: ${sections.map(s => s.title).join(', ')}

## TASK

Provide specific template and layout recommendations in JSON format:

{
  "templateRecommendations": [
    {
      "aspect": "Section Headers | Spacing | Alignment | etc.",
      "current": "What they're doing now",
      "recommended": "What they should do",
      "why": "Why this is better"
    }
  ],
  "layoutSuggestions": [
    "Specific layout improvement suggestion"
  ],
  "visualHierarchyTips": [
    "Tips for improving visual hierarchy"
  ]
}

Respond ONLY with valid JSON.`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 2048,
            temperature: 0.7,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Parse JSON
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        [null, responseText];

        const hints = JSON.parse(jsonMatch[1] || responseText);

        console.log('[CLAUDE COACH] Template hints generated');

        return hints;

    } catch (error) {
        console.error('[CLAUDE COACH] Template hints generation failed:', error);
        return {
            templateRecommendations: [],
            layoutSuggestions: [],
            visualHierarchyTips: []
        };
    }
};

/**
 * Provide real-time feedback on user edits
 * As the user edits, give immediate coaching
 */
const provideLiveFeedback = async (beforeText, afterText, changeType) => {
    console.log('[CLAUDE COACH] Providing live feedback...');

    const prompt = `You are a resume coach providing real-time feedback as the user edits their resume.

## CHANGE TYPE
${changeType}

## BEFORE
${beforeText}

## AFTER
${afterText}

Provide brief, encouraging feedback in JSON format:

{
  "feedback": "Brief, encouraging feedback (1-2 sentences)",
  "isImprovement": true/false,
  "suggestion": "Optional: one quick suggestion to make it even better"
}

Respond ONLY with valid JSON.`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 512,
            temperature: 0.7,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Parse JSON
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        [null, responseText];

        const feedback = JSON.parse(jsonMatch[1] || responseText);

        return feedback;

    } catch (error) {
        console.error('[CLAUDE COACH] Live feedback failed:', error);
        return {
            feedback: 'Keep up the good work!',
            isImprovement: true
        };
    }
};

/**
 * Generate improvement roadmap
 * Creates a step-by-step plan for the user
 */
const generateImprovementRoadmap = (analysis, formattingContext) => {
    const roadmap = {
        phases: []
    };

    // Phase 1: Quick Wins
    if (analysis.quickWins && analysis.quickWins.length > 0) {
        roadmap.phases.push({
            phase: 1,
            title: 'Quick Wins (5-10 minutes)',
            description: 'Fast, high-impact changes',
            tasks: analysis.quickWins.map((win, index) => ({
                id: `quick-${index}`,
                task: win,
                completed: false
            }))
        });
    }

    // Phase 2: Critical Improvements
    const criticalImprovements = analysis.priorityImprovements?.filter(
        imp => imp.priority === 'high'
    ) || [];

    if (criticalImprovements.length > 0) {
        roadmap.phases.push({
            phase: 2,
            title: 'Critical Improvements (30-60 minutes)',
            description: 'Address high-priority issues',
            tasks: criticalImprovements.map((imp, index) => ({
                id: `critical-${index}`,
                task: imp.issue,
                howToFix: imp.how_to_fix,
                completed: false
            }))
        });
    }

    // Phase 3: Polish
    const polishImprovements = analysis.priorityImprovements?.filter(
        imp => imp.priority === 'medium' || imp.priority === 'low'
    ) || [];

    if (polishImprovements.length > 0) {
        roadmap.phases.push({
            phase: 3,
            title: 'Polish & Refinement (1-2 hours)',
            description: 'Fine-tune for excellence',
            tasks: polishImprovements.map((imp, index) => ({
                id: `polish-${index}`,
                task: imp.issue,
                howToFix: imp.how_to_fix,
                completed: false
            }))
        });
    }

    return roadmap;
};

/**
 * Apply AI Coach recommendations automatically
 * Takes the current resume content and coaching feedback, then generates improved version
 */
const applyCoachingRecommendations = async (currentHTML, plainText, coachingFeedback, formattingContext) => {
    console.log('[CLAUDE COACH] Applying coaching recommendations...');

    const prompt = buildApplyChangesPrompt(currentHTML, plainText, coachingFeedback, formattingContext);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 8192,
            temperature: 0.5, // Lower temperature for more consistent formatting
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Extract HTML from response (handle markdown code blocks)
        const htmlMatch = responseText.match(/```html\n([\s\S]*?)\n```/) ||
                        responseText.match(/<div[\s\S]*<\/div>/) ||
                        [null, responseText];

        const improvedHTML = htmlMatch[1] || htmlMatch[0] || responseText;

        console.log('[CLAUDE COACH] Improvements applied successfully');
        console.log('[CLAUDE COACH] Generated HTML length:', improvedHTML.length);

        return {
            success: true,
            improvedHTML,
            summary: 'Applied AI Coach recommendations',
            tokensUsed: {
                input: message.usage.input_tokens,
                output: message.usage.output_tokens
            }
        };

    } catch (error) {
        console.error('[CLAUDE COACH] Failed to apply recommendations:', error);
        throw new Error(`Failed to apply coaching recommendations: ${error.message}`);
    }
};

/**
 * Build prompt for applying coaching recommendations
 */
const buildApplyChangesPrompt = (currentHTML, plainText, coachingFeedback, formattingContext) => {
    return `You are a professional resume formatter. Your task is to take the current resume and apply the AI Coach's recommendations to create an improved version.

## CURRENT RESUME (HTML)

${currentHTML}

## AI COACH FEEDBACK

**Overall Assessment:**
${coachingFeedback.assessment || 'N/A'}

**Priority Improvements:**
${coachingFeedback.priorityImprovements?.map((imp, idx) => `
${idx + 1}. [${imp.priority.toUpperCase()}] ${imp.category}
   Issue: ${imp.issue}
   How to fix: ${imp.how_to_fix}
   ${imp.contextual_hint ? `Hint: ${imp.contextual_hint}` : ''}
`).join('\n') || 'None'}

**Quick Wins:**
${coachingFeedback.quickWins?.map((win, idx) => `${idx + 1}. ${win}`).join('\n') || 'None'}

## FORMATTING CONTEXT

${formattingContext.summary || 'Standard resume formatting'}

## YOUR TASK

Create an improved version of the resume by implementing the AI Coach's recommendations. Follow these rules:

1. **Preserve All Content**: Keep all the user's information, experiences, and achievements
2. **Apply High-Priority Fixes**: Focus on implementing high and medium priority improvements
3. **Maintain Visual Formatting**: Keep the HTML structure and styling intact
4. **Improve Systematically**:
   - Fix bullet point issues (action verbs, quantification, length)
   - Improve section headers and formatting consistency
   - Enhance ATS compatibility
   - Strengthen impact statements
   - Fix any spacing or alignment issues

5. **Keep Original Style**: Don't change fonts, colors, or overall layout unless specifically recommended
6. **Output HTML**: Return ONLY the improved HTML with inline styles preserved

## SPECIFIC IMPROVEMENTS TO MAKE

Based on the feedback above, implement these changes:

${coachingFeedback.priorityImprovements?.filter(imp => imp.priority === 'high' || imp.priority === 'medium')
    .map(imp => `- ${imp.how_to_fix}`).join('\n') || '- Apply all quick wins listed above'}

## OUTPUT

Return ONLY the improved HTML content wrapped in a code block:

\`\`\`html
<!-- Your improved resume HTML here -->
\`\`\`

Make sure to:
- Keep all inline styles
- Preserve the visual structure
- Implement the specific improvements from the feedback
- Maintain professional formatting
- Ensure ATS compatibility`;
};

module.exports = {
    analyzeResumeWithContext,
    generateTemplateHints,
    provideLiveFeedback,
    generateImprovementRoadmap,
    applyCoachingRecommendations
};
