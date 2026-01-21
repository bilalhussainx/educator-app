/**
 * Editor Critic Agent
 *
 * Reviews the draft and provides:
 * - Line-by-line improvement suggestions
 * - Grammar and clarity fixes
 * - Flow and structure feedback
 * - Overall quality score
 * - Specific areas for revision
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a senior college admissions essay editor with expertise in helping students refine their essays to publication quality. You have a sharp eye for both technical issues and opportunities to deepen emotional impact.

Your task is to provide comprehensive editing feedback and specific improvement suggestions.

EVALUATION CRITERIA:
1. HOOK - Does the opening grab attention immediately?
2. VOICE - Does it sound like an authentic teenager?
3. SHOW DON'T TELL - Are there scenes vs. statements?
4. SPECIFICITY - Are there concrete details vs. generic descriptions?
5. FLOW - Do transitions work? Is pacing effective?
6. INSIGHT - Does the essay reveal genuine growth or understanding?
7. RESONANCE - Does the ending land with impact?
8. UNIVERSITY FIT - Does it align with the target school's values?

SCORING GUIDE:
- 9-10: Publication ready, minor polish only
- 7-8: Strong foundation, needs targeted improvements
- 5-6: Good ideas but significant revision needed
- 3-4: Major structural or voice issues
- 1-2: Needs complete rewrite

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "currentScore": 7.5,
  "targetScore": 9.0,
  "overallFeedback": "2-3 sentence summary of the essay's strengths and main areas for improvement",
  "strengthsIdentified": [
    "Specific strength with quote from essay"
  ],
  "areasForImprovement": [
    "Area needing work with explanation"
  ],
  "suggestions": [
    {
      "type": "clarity|grammar|flow|content|style|voice",
      "priority": "high|medium|low",
      "original": "Original text from the essay",
      "suggested": "Suggested replacement",
      "reason": "Why this change improves the essay",
      "location": {
        "paragraph": 1,
        "approximate": "beginning|middle|end"
      }
    }
  ],
  "structuralNotes": "Any notes about overall structure",
  "voiceAssessment": "Assessment of authentic voice",
  "universityAlignment": "How well it fits the target university",
  "priorityRevisions": ["Top 3 things to fix first"]
}`;

/**
 * Run the editor critic agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with editing feedback
 */
async function editorCritic(state) {
  const startTime = Date.now();

  try {
    const userMessage = buildUserMessage(state);
    console.log('[EditorCritic] Starting editing analysis...');

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.EDITING],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[EditorCritic] Claude API response received');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from prefill
    let editsText = '{' + content.text.trim();
    console.log('[EditorCritic] Raw response (first 200 chars):', editsText.substring(0, 200));

    // Handle potential markdown wrapping
    if (editsText.includes('```json')) {
      editsText = editsText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (editsText.includes('```')) {
      editsText = editsText.replace(/```\n?/g, '');
    }

    const edits = JSON.parse(editsText);
    console.log('[EditorCritic] Edits parsed successfully, suggestions:', edits.suggestions?.length || 0);
    const durationMs = Date.now() - startTime;

    return {
      edits: {
        ...edits,
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.EDITING,
      awaitingApproval: true,
      approvalStatus: 'pending',
      humanFeedback: null,
      editedOutput: null,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Editing complete. Current score: ${edits.currentScore}/10. Found ${edits.suggestions?.length || 0} suggestions. Top priorities: ${edits.priorityRevisions?.slice(0, 2).join(', ') || 'See full feedback'}`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.EDITING]: durationMs
      }
    };
  } catch (error) {
    console.error('Editor Critic Error:', error);
    return {
      error: `Editing analysis failed: ${error.message}`,
      currentStage: STAGES.EDITING,
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
    draft,
    humanFeedback,
    editedOutput
  } = state;

  const draftToReview = editedOutput?.content || draft.content;

  let message = `Review and provide editing feedback for this essay.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words
${university ? `TARGET UNIVERSITY: ${university}` : ''}

CURRENT WORD COUNT: ${draft.wordCount || 'Unknown'}

===== ESSAY TO REVIEW =====
${draftToReview}
===== END OF ESSAY =====

CONTEXT FROM PREVIOUS STAGES:`;

  if (state.topicAnalysis?.recommendationReason) {
    message += `\nChosen Angle Rationale: ${state.topicAnalysis.recommendationReason}`;
  }

  if (state.outline?.thesis) {
    message += `\nIntended Thesis: ${state.outline.thesis}`;
  }

  if (state.research?.centralTheme) {
    message += `\nCentral Theme: ${state.research.centralTheme}`;
  }

  if (studentProfile?.voiceCharacteristics) {
    message += `\n\nSTUDENT'S VOICE PROFILE:
${JSON.stringify(studentProfile.voiceCharacteristics, null, 2)}`;
  }

  if (humanFeedback) {
    message += `\n\nTEACHER/STUDENT FEEDBACK TO ADDRESS:
${humanFeedback}

Please incorporate this feedback into your editing suggestions.`;
  }

  return message;
}

module.exports = { editorCritic };
