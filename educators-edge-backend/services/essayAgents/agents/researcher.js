/**
 * Researcher Agent
 *
 * Takes the approved topic analysis and develops:
 * - Supporting points and evidence for the chosen angle
 * - Personal examples and anecdotes to use
 * - Counterarguments and how to address them
 * - Connections to the target university
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert essay strategist. Develop research and content for college essays.

CRITICAL: Respond with ONLY valid JSON. No explanations, no markdown.

JSON Schema:
{
  "selectedAngle": "The angle being developed",
  "centralTheme": "Core message of the essay",
  "insights": [
    {
      "category": "Category name (e.g., Personal Experience, Growth, Values)",
      "points": ["Key point 1", "Key point 2"]
    }
  ],
  "keyMoments": [
    {
      "moment": "Specific scene to include",
      "details": "Sensory and emotional details",
      "significance": "Why it matters"
    }
  ],
  "toneGuidance": "Recommended tone",
  "wordAllocation": "How to distribute the word count"
}`;

/**
 * Run the researcher agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with research
 */
async function researcher(state) {
  const startTime = Date.now();

  try {
    const userMessage = buildUserMessage(state);
    console.log('[Researcher] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.RESEARCH],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[Researcher] Claude API response received');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from prefill
    let researchText = '{' + content.text.trim();
    console.log('[Researcher] Raw response (first 200 chars):', researchText.substring(0, 200));

    // Handle potential markdown wrapping
    if (researchText.includes('```json')) {
      researchText = researchText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (researchText.includes('```')) {
      researchText = researchText.replace(/```\n?/g, '');
    }

    const research = JSON.parse(researchText);
    console.log('[Researcher] Parsed research with', research.insights?.length || 0, 'insights');
    const durationMs = Date.now() - startTime;

    return {
      research: {
        ...research,
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.RESEARCH,
      awaitingApproval: true,
      approvalStatus: 'pending',
      humanFeedback: null,
      editedOutput: null,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Research complete. Identified ${research.insights?.length || 0} insight categories and ${research.keyMoments?.length || 0} key moments.`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.RESEARCH]: durationMs
      }
    };
  } catch (error) {
    console.error('Researcher Error:', error);
    return {
      error: `Research failed: ${error.message}`,
      currentStage: STAGES.RESEARCH,
      awaitingApproval: false
    };
  }
}

function buildUserMessage(state) {
  const {
    essayPrompt,
    university,
    targetWordCount,
    studentProfile,
    topicAnalysis,
    humanFeedback,
    editedOutput
  } = state;

  // Use edited output if teacher made changes (contains selected angle)
  const analysisToUse = editedOutput || topicAnalysis;

  console.log('[Researcher] Using editedOutput:', !!editedOutput);
  console.log('[Researcher] recommendedAngle index:', analysisToUse?.recommendedAngle);

  // Handle missing topic analysis
  if (!analysisToUse || !analysisToUse.angles || analysisToUse.angles.length === 0) {
    throw new Error('Topic analysis is required before research. Please complete the topic analysis stage first.');
  }

  const angleIndex = analysisToUse.recommendedAngle ?? 0;
  const selectedAngle = analysisToUse.angles[angleIndex] || analysisToUse.angles[0];

  console.log('[Researcher] Selected angle index:', angleIndex);
  console.log('[Researcher] Selected angle title:', selectedAngle?.title);

  let message = `Develop research and content for this essay angle.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words
${university ? `TARGET UNIVERSITY: ${university}` : ''}

SELECTED ANGLE:
Title: ${selectedAngle.title}
Description: ${selectedAngle.description}
Opening Hook: ${selectedAngle.openingHook || 'Not specified'}

THEMES TO ADDRESS:
${analysisToUse.themes.map(t => `- ${t}`).join('\n')}
`;

  if (studentProfile) {
    message += `\n\nSTUDENT PROFILE:`;
    if (studentProfile.name) message += `\nName: ${studentProfile.name}`;
    if (studentProfile.background) message += `\nBackground: ${studentProfile.background}`;
    if (studentProfile.experiences?.length > 0) {
      message += `\nKey Experiences:\n${studentProfile.experiences.map(e => `- ${e}`).join('\n')}`;
    }
    if (studentProfile.achievements) message += `\nAchievements: ${studentProfile.achievements}`;
    if (studentProfile.challenges) message += `\nChallenges: ${studentProfile.challenges}`;
  }

  if (humanFeedback) {
    message += `\n\nFEEDBACK TO INCORPORATE:
${humanFeedback}

Please revise your research based on this feedback.`;
  }

  return message;
}

module.exports = { researcher };
