/**
 * Topic Analyzer Agent
 *
 * Analyzes the essay prompt and student profile to identify:
 * - Key themes in the prompt
 * - 3-4 unique angles the student could take
 * - Strengths and risks of each angle
 * - Recommended approach based on student profile
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert college admissions counselor. Analyze essay prompts and provide angle recommendations.

CRITICAL: You must respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON.

JSON Schema:
{
  "themes": ["2-4 key themes from the prompt"],
  "angles": [
    {
      "title": "Angle title",
      "description": "2-3 sentence description",
      "openingHook": "Suggested opening line",
      "strengths": ["strength 1", "strength 2"],
      "risks": ["risk 1"],
      "fitScore": 8
    }
  ],
  "recommendedAngle": 0,
  "recommendationReason": "Why recommended",
  "scopeSuggestions": ["suggestion 1"],
  "universityAlignment": "Alignment notes"
}

Provide 3-4 unique angles. Be specific, not generic.`;

/**
 * Run the topic analyzer agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with topic analysis
 */
async function topicAnalyzer(state) {
  const startTime = Date.now();
  console.log('[TopicAnalyzer] Starting topic analysis...');
  console.log('[TopicAnalyzer] Using model:', DEFAULT_MODEL);
  console.log('[TopicAnalyzer] Essay prompt:', state.essayPrompt?.substring(0, 100) + '...');

  try {
    // Build the user message with all context
    const userMessage = buildUserMessage(state);
    console.log('[TopicAnalyzer] User message length:', userMessage.length);

    // Call Claude with prefill to force JSON output
    console.log('[TopicAnalyzer] Calling Claude API...');
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.TOPIC_ANALYSIS],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[TopicAnalyzer] Claude API response received');

    // Extract and parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from our prefill and parse JSON response
    let analysisText = '{' + content.text.trim();
    console.log('[TopicAnalyzer] Raw response (first 200 chars):', analysisText.substring(0, 200));

    // Handle potential markdown wrapping (shouldn't happen with prefill, but just in case)
    if (analysisText.includes('```json')) {
      analysisText = analysisText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (analysisText.includes('```')) {
      analysisText = analysisText.replace(/```\n?/g, '');
    }

    // Try to extract JSON from the response if it's wrapped in text
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // Try to find JSON object in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Create a fallback response from the text
        console.warn('[TopicAnalyzer] Could not parse JSON, creating fallback response');
        analysis = {
          themes: ['Personal growth', 'Overcoming challenges'],
          angles: [{
            title: 'Personal Narrative',
            description: analysisText.substring(0, 200),
            openingHook: 'Start with a vivid moment',
            strengths: ['Authentic voice'],
            risks: ['May need more focus'],
            fitScore: 7
          }],
          recommendedAngle: 0,
          recommendationReason: 'Based on initial analysis',
          scopeSuggestions: ['Focus on one specific moment'],
          universityAlignment: 'General alignment with admissions goals'
        };
      }
    }
    const durationMs = Date.now() - startTime;
    console.log(`[TopicAnalyzer] Analysis complete in ${durationMs}ms. Found ${analysis.angles?.length || 0} angles.`);

    // Return updated state
    return {
      topicAnalysis: {
        ...analysis,
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.TOPIC_ANALYSIS,
      awaitingApproval: true,
      approvalStatus: 'pending',
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Topic analysis complete. Identified ${analysis.angles.length} potential angles. Recommended: "${analysis.angles[analysis.recommendedAngle]?.title || 'First option'}"`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.TOPIC_ANALYSIS]: durationMs
      }
    };
  } catch (error) {
    console.error('[TopicAnalyzer] Error:', error.message);
    console.error('[TopicAnalyzer] Error details:', error.status || 'no status', error.error || 'no error object');
    return {
      error: `Topic analysis failed: ${error.message}`,
      currentStage: STAGES.TOPIC_ANALYSIS,
      awaitingApproval: false
    };
  }
}

/**
 * Build the user message with full context
 */
function buildUserMessage(state) {
  const { essayPrompt, university, targetWordCount, studentProfile, humanFeedback } = state;

  let message = `Please analyze this essay prompt and provide angle recommendations.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words
`;

  if (university) {
    message += `\nTARGET UNIVERSITY: ${university}`;
  }

  if (studentProfile) {
    message += `\n\nSTUDENT PROFILE:`;

    // Basic info
    if (studentProfile.name) {
      message += `\nName: ${studentProfile.name}`;
    }
    if (studentProfile.grade) {
      message += `\nGrade: ${studentProfile.grade}`;
    }
    if (studentProfile.intendedMajor) {
      message += `\nIntended Major: ${studentProfile.intendedMajor}`;
    }

    // Background context (new comprehensive structure)
    const bg = studentProfile.background || {};
    if (bg.firstGeneration) {
      message += `\n\n[IMPORTANT CONTEXT: First-Generation College Student]`;
    }
    if (bg.financialSituation) {
      message += `\nFinancial Context: ${bg.financialSituation}`;
    }
    if (bg.familyResponsibilities) {
      message += `\nFamily Responsibilities: ${bg.familyResponsibilities}`;
    }
    if (bg.languages && bg.languages.length > 0) {
      message += `\nLanguages: ${bg.languages.join(', ')}`;
    }
    if (bg.uniqueCircumstances) {
      message += `\nUnique Circumstances: ${bg.uniqueCircumstances}`;
    }
    if (bg.challenges && bg.challenges.length > 0) {
      message += `\nLife Challenges: ${bg.challenges.join(', ')}`;
    }

    // Backward compatibility: old background field as string
    if (typeof studentProfile.background === 'string') {
      message += `\nBackground: ${studentProfile.background}`;
    }

    // Activities (new comprehensive structure)
    if (studentProfile.activities && studentProfile.activities.length > 0) {
      message += `\n\nACTIVITIES & EXPERIENCES:`;
      studentProfile.activities.forEach((activity, i) => {
        message += `\n${i + 1}. ${activity.name}`;
        if (activity.role) message += ` - ${activity.role}`;
        if (activity.years) message += ` (${activity.years} year${activity.years > 1 ? 's' : ''})`;
        if (activity.impact) message += `\n   Impact: ${activity.impact}`;
      });
    }

    // Backward compatibility: old experiences array
    if (studentProfile.experiences && studentProfile.experiences.length > 0 && !studentProfile.activities) {
      message += `\nKey Experiences:\n${studentProfile.experiences.map(e => `- ${e}`).join('\n')}`;
    }

    // Personal qualities (new structure)
    if (studentProfile.strengths && studentProfile.strengths.length > 0) {
      message += `\n\nStrengths: ${studentProfile.strengths.join(', ')}`;
    }
    if (studentProfile.values && studentProfile.values.length > 0) {
      message += `\nCore Values: ${Array.isArray(studentProfile.values) ? studentProfile.values.join(', ') : studentProfile.values}`;
    }
    if (studentProfile.passions && studentProfile.passions.length > 0) {
      message += `\nPassions: ${studentProfile.passions.join(', ')}`;
    }
    if (studentProfile.goals && studentProfile.goals.length > 0) {
      message += `\nFuture Goals: ${studentProfile.goals.join(', ')}`;
    }

    // Essay-specific context
    if (studentProfile.uniqueAspects && studentProfile.uniqueAspects.length > 0) {
      message += `\n\nUNIQUE ASPECTS TO HIGHLIGHT:\n${studentProfile.uniqueAspects.map(a => `- ${a}`).join('\n')}`;
    }
    if (studentProfile.significantExperiences && studentProfile.significantExperiences.length > 0) {
      message += `\n\nSIGNIFICANT LIFE EXPERIENCES:\n${studentProfile.significantExperiences.map(e => `- ${e}`).join('\n')}`;
    }

    // Backward compatibility fields
    if (studentProfile.interests) {
      message += `\nInterests: ${JSON.stringify(studentProfile.interests)}`;
    }
    if (studentProfile.achievements) {
      message += `\nAchievements: ${studentProfile.achievements}`;
    }
    if (typeof studentProfile.challenges === 'string') {
      message += `\nChallenges Overcome: ${studentProfile.challenges}`;
    }
    if (studentProfile.voiceCharacteristics) {
      message += `\nWriting Voice: ${JSON.stringify(studentProfile.voiceCharacteristics)}`;
    }
  }

  if (humanFeedback) {
    message += `\n\nPREVIOUS FEEDBACK TO INCORPORATE:
${humanFeedback}

Please revise your analysis based on this feedback.`;
  }

  return message;
}

module.exports = { topicAnalyzer };
