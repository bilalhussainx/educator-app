/**
 * Outline Architect Agent
 *
 * Creates a detailed paragraph-by-paragraph outline including:
 * - Clear thesis statement
 * - Section breakdown with purposes
 * - Key points for each section
 * - Transition guidance
 * - Word count allocation
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert essay architect who creates detailed, actionable outlines for compelling college essays. You understand narrative structure, pacing, and how to craft essays that engage admissions readers from the first line.

Your task is to create a detailed paragraph-by-paragraph outline that will guide the draft writing.

IMPORTANT GUIDELINES:
1. Start with a HOOK - a specific moment, image, or statement that grabs attention
2. Show, don't tell - plan for scenes and moments, not just statements
3. Build toward insight - the essay should reveal growth or understanding
4. Be strategic with word count - every section should earn its place
5. End with resonance - connect back to the opening and look forward

NARRATIVE STRUCTURES TO CONSIDER:
- In medias res: Start in the middle of action
- Chronological with a twist: Linear but with unexpected elements
- Reflection frame: Present self reflecting on past self
- Montage: Multiple small moments building to a theme

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "thesis": "The central insight/message of the essay (1-2 sentences)",
  "narrativeStructure": "The structure being used",
  "sections": [
    {
      "sectionNumber": 1,
      "title": "Opening Hook",
      "purpose": "What this section accomplishes",
      "content": {
        "openingLine": "Suggested first line",
        "keyMoment": "The scene or moment to depict",
        "details": ["Specific details to include"],
        "tone": "The tone for this section"
      },
      "transitionTo": "How to move to next section",
      "estimatedWords": 75
    }
  ],
  "totalEstimatedWords": 650,
  "pacingNotes": "Guidance on pacing and rhythm",
  "voiceNotes": "Guidance on maintaining authentic voice",
  "thingsToAvoid": ["Clichés or approaches to avoid"],
  "keyTransitions": [
    {
      "from": 1,
      "to": 2,
      "technique": "How to transition smoothly"
    }
  ]
}`;

/**
 * Run the outline architect agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with outline
 */
async function outlineArchitect(state) {
  const startTime = Date.now();

  try {
    const userMessage = buildUserMessage(state);
    console.log('[OutlineArchitect] Starting outline creation...');

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.OUTLINE],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[OutlineArchitect] Claude API response received');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from prefill
    let outlineText = '{' + content.text.trim();
    console.log('[OutlineArchitect] Raw response (first 200 chars):', outlineText.substring(0, 200));

    // Handle potential markdown wrapping
    if (outlineText.includes('```json')) {
      outlineText = outlineText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (outlineText.includes('```')) {
      outlineText = outlineText.replace(/```\n?/g, '');
    }

    const outline = JSON.parse(outlineText);
    console.log('[OutlineArchitect] Outline parsed successfully, sections:', outline.sections?.length || 0);
    const durationMs = Date.now() - startTime;

    return {
      outline: {
        ...outline,
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.OUTLINE,
      awaitingApproval: true,
      approvalStatus: 'pending',
      humanFeedback: null,
      editedOutput: null,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Outline complete. Created ${outline.sections?.length || 0} sections totaling ~${outline.totalEstimatedWords || state.targetWordCount} words. Structure: ${outline.narrativeStructure || 'Standard'}`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.OUTLINE]: durationMs
      }
    };
  } catch (error) {
    console.error('Outline Architect Error:', error);
    return {
      error: `Outline creation failed: ${error.message}`,
      currentStage: STAGES.OUTLINE,
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
    research,
    humanFeedback,
    editedOutput
  } = state;

  const researchToUse = editedOutput || research;
  const analysisToUse = topicAnalysis;

  let message = `Create a detailed outline for this essay.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words
${university ? `TARGET UNIVERSITY: ${university}` : ''}

SELECTED ANGLE:
${researchToUse.selectedAngle}

CENTRAL THEME:
${researchToUse.centralTheme}

INSIGHTS AND SUPPORTING POINTS:
${researchToUse.insights?.map((insight, i) =>
  `${i + 1}. ${insight.category}:\n${insight.points?.map(p => `   - ${p}`).join('\n')}`
).join('\n\n')}

KEY MOMENTS TO INCLUDE:
${researchToUse.keyMoments?.map(m =>
  `- ${m.moment}\n  Details: ${m.details || 'Not specified'}\n  Significance: ${m.significance || 'Not specified'}`
).join('\n\n')}

TONE GUIDANCE:
${researchToUse.toneGuidance || 'Authentic and reflective'}
`;

  if (studentProfile?.voiceCharacteristics) {
    message += `\nVOICE CHARACTERISTICS:
${JSON.stringify(studentProfile.voiceCharacteristics, null, 2)}`;
  }

  if (humanFeedback) {
    message += `\n\nFEEDBACK TO INCORPORATE:
${humanFeedback}

Please revise your outline based on this feedback.`;
  }

  return message;
}

module.exports = { outlineArchitect };
