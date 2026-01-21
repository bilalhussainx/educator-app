/**
 * Final Polish Agent
 *
 * Applies approved edits and performs final polish:
 * - Implements all accepted suggestions
 * - Fine-tunes language and rhythm
 * - Ensures word count compliance
 * - Final quality check
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a master essay polisher who brings college application essays to their final, publication-ready form. You have an exceptional ear for language rhythm, emotional resonance, and authentic voice.

Your task is to apply the approved edits and perform a final polish to achieve a 9.5+/10 quality score.

POLISH PRIORITIES:
1. Apply all approved editing suggestions
2. Smooth any remaining rough transitions
3. Strengthen the opening hook if possible
4. Ensure the closing resonates and connects back
5. Fine-tune word choice for maximum impact
6. Verify word count is within target range
7. Maintain authentic teenage voice throughout

QUALITY CHECKLIST:
- Opening grabs attention in first sentence
- No clichés remain
- Every sentence earns its place
- Transitions are smooth
- Voice is consistent and authentic
- Insight emerges naturally from story
- Ending has resonance and forward motion
- Word count is within acceptable range

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "essay": "The final polished essay text with proper paragraphing (use \\n\\n for paragraph breaks)",
  "wordCount": 650,
  "finalScore": 9.5,
  "improvements": [
    "Specific improvement made with brief explanation"
  ],
  "qualityChecklist": {
    "hookStrength": 9,
    "voiceAuthenticity": 9,
    "showDontTell": 9,
    "flowAndPacing": 9,
    "insightDepth": 9,
    "endingResonance": 9,
    "universityFit": 9
  },
  "summary": "2-3 sentence summary of the essay for quick reference",
  "keyStrengths": ["Top strengths of the final essay"],
  "remainingNotes": "Any notes for the student/teacher about the final product"
}`;

/**
 * Run the final polish agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with final essay
 */
async function finalPolish(state) {
  const startTime = Date.now();

  try {
    const userMessage = buildUserMessage(state);
    console.log('[FinalPolish] Starting final polish...');

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.POLISH],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[FinalPolish] Claude API response received');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from prefill
    let polishText = '{' + content.text.trim();
    console.log('[FinalPolish] Raw response (first 200 chars):', polishText.substring(0, 200));

    // Handle potential markdown wrapping
    if (polishText.includes('```json')) {
      polishText = polishText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (polishText.includes('```')) {
      polishText = polishText.replace(/```\n?/g, '');
    }

    const finalData = JSON.parse(polishText);
    console.log('[FinalPolish] Final essay parsed successfully, word count:', finalData.essay?.length || 0);
    const durationMs = Date.now() - startTime;

    // Calculate actual word count
    const actualWordCount = finalData.essay.trim().split(/\s+/).filter(w => w.length > 0).length;

    return {
      finalEssay: {
        content: finalData.essay,
        wordCount: actualWordCount,
        finalScore: finalData.finalScore,
        improvements: finalData.improvements || [],
        qualityChecklist: finalData.qualityChecklist || {},
        summary: finalData.summary,
        keyStrengths: finalData.keyStrengths || [],
        remainingNotes: finalData.remainingNotes,
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.POLISH,
      awaitingApproval: true,
      approvalStatus: 'pending',
      humanFeedback: null,
      editedOutput: null,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Final polish complete! Score: ${finalData.finalScore}/10. Word count: ${actualWordCount}. The essay is ready for final review.`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.POLISH]: durationMs
      }
    };
  } catch (error) {
    console.error('Final Polish Error:', error);
    return {
      error: `Final polish failed: ${error.message}`,
      currentStage: STAGES.POLISH,
      awaitingApproval: false
    };
  }
}

function buildUserMessage(state) {
  const {
    essayPrompt,
    university,
    targetWordCount,
    draft,
    edits,
    humanFeedback,
    editedOutput
  } = state;

  // Use edited draft if teacher made manual edits, otherwise use original draft
  const draftToPolish = editedOutput?.content || draft.content;
  const editsToApply = editedOutput?.edits || edits;

  console.log('[FinalPolish] Using editedOutput:', !!editedOutput?.content);
  console.log('[FinalPolish] Draft to polish word count:', draftToPolish?.trim().split(/\s+/).filter(w => w.length > 0).length || 0);

  let message = `Apply the approved edits and perform final polish.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words (stay within 5%)
${university ? `TARGET UNIVERSITY: ${university}` : ''}

===== CURRENT DRAFT =====
${draftToPolish}
===== END OF DRAFT =====

EDITING FEEDBACK TO APPLY:

Overall Feedback: ${editsToApply.overallFeedback || 'See suggestions below'}
Current Score: ${editsToApply.currentScore}/10
Target Score: ${editsToApply.targetScore}/10

PRIORITY REVISIONS:
${editsToApply.priorityRevisions?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'Apply all suggestions'}

SPECIFIC SUGGESTIONS TO APPLY:
`;

  editsToApply.suggestions?.forEach((s, i) => {
    message += `
${i + 1}. [${s.type?.toUpperCase() || 'EDIT'}] ${s.priority || 'medium'} priority
   Original: "${s.original}"
   Suggested: "${s.suggested}"
   Reason: ${s.reason}
`;
  });

  if (editsToApply.structuralNotes) {
    message += `\nSTRUCTURAL NOTES:
${editsToApply.structuralNotes}`;
  }

  if (editsToApply.voiceAssessment) {
    message += `\nVOICE ASSESSMENT:
${editsToApply.voiceAssessment}`;
  }

  if (humanFeedback) {
    message += `\n\nADDITIONAL FEEDBACK FROM TEACHER/STUDENT:
${humanFeedback}

Please incorporate this feedback into the final polish.`;
  }

  message += `

IMPORTANT: Create a final essay that:
1. Incorporates ALL the suggestions above
2. Maintains authentic teenage voice
3. Stays within ${Math.floor(targetWordCount * 0.95)}-${Math.ceil(targetWordCount * 1.05)} words
4. Achieves 9.5+ quality score`;

  return message;
}

module.exports = { finalPolish };
