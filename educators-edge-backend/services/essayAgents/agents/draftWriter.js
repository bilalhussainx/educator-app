/**
 * Draft Writer Agent
 *
 * Writes the complete first draft following the approved outline.
 * Focuses on:
 * - Authentic voice (17-18 year old, not AI)
 * - Show don't tell
 * - Specific details and sensory language
 * - Emotional resonance
 */

const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODEL, MAX_TOKENS_BY_STAGE, STAGES } = require('../constants');

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a master essay writer who channels the authentic voice of high school students writing their college application essays. You excel at bringing personal stories to life with vivid details, genuine emotion, and compelling narrative.

Your task is to write a complete first draft of the essay following the provided outline.

CRITICAL VOICE REQUIREMENTS:
1. Write in FIRST PERSON - this is the student's voice
2. Sound like an authentic 17-18 year old - NOT an adult, NOT AI
3. Use contractions naturally (I'm, didn't, couldn't)
4. Include moments of genuine uncertainty or vulnerability
5. Avoid overly sophisticated vocabulary unless it fits the student's profile
6. No clichés: avoid "journey," "passion," "pivotal moment," "ever since I was young"

WRITING TECHNIQUES:
1. SHOW, DON'T TELL - Use scenes, dialogue, and specific moments
2. Start in action - no throat-clearing introductions
3. Use sensory details - what did you see, hear, feel, smell?
4. Include internal thoughts and reactions
5. Let the insight emerge from the story, don't state it directly
6. End with resonance, not summary

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "essay": "The complete essay text with proper paragraphing (use \\n\\n for paragraph breaks)",
  "wordCount": 650,
  "sectionsWritten": ["Section 1: Opening Hook", "Section 2: ..."],
  "voiceNotes": "Notes on how voice was maintained",
  "techniquesUsed": ["Show don't tell moments", "Sensory details", "etc."]
}`;

/**
 * Run the draft writer agent
 * @param {Object} state - Current pipeline state
 * @returns {Promise<Object>} Updated state with draft
 */
async function draftWriter(state) {
  const startTime = Date.now();

  try {
    const userMessage = buildUserMessage(state);
    console.log('[DraftWriter] Starting draft writing...');
    console.log('[DraftWriter] User message length:', userMessage.length);

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_BY_STAGE[STAGES.DRAFT],
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{' }  // Prefill to force JSON
      ]
    });
    console.log('[DraftWriter] Claude API response received');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Prepend the '{' from prefill
    let draftText = '{' + content.text.trim();
    console.log('[DraftWriter] Raw response (first 200 chars):', draftText.substring(0, 200));

    // Handle potential markdown wrapping
    if (draftText.includes('```json')) {
      draftText = draftText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (draftText.includes('```')) {
      draftText = draftText.replace(/```\n?/g, '');
    }

    const draftData = JSON.parse(draftText);
    console.log('[DraftWriter] Draft parsed successfully, essay length:', draftData.essay?.length || 0);
    const durationMs = Date.now() - startTime;

    // Calculate actual word count
    const actualWordCount = draftData.essay.trim().split(/\s+/).filter(w => w.length > 0).length;

    return {
      draft: {
        content: draftData.essay,
        wordCount: actualWordCount,
        sectionsWritten: draftData.sectionsWritten || [],
        voiceNotes: draftData.voiceNotes,
        techniquesUsed: draftData.techniquesUsed || [],
        generatedAt: new Date().toISOString(),
        modelUsed: DEFAULT_MODEL,
        durationMs
      },
      currentStage: STAGES.DRAFT,
      awaitingApproval: true,
      approvalStatus: 'pending',
      humanFeedback: null,
      editedOutput: null,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: `Draft complete! ${actualWordCount} words written. Ready for review.`,
          timestamp: new Date().toISOString()
        }
      ],
      stageTimings: {
        ...state.stageTimings,
        [STAGES.DRAFT]: durationMs
      }
    };
  } catch (error) {
    console.error('Draft Writer Error:', error);
    return {
      error: `Draft writing failed: ${error.message}`,
      currentStage: STAGES.DRAFT,
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
    outline,
    humanFeedback,
    editedOutput
  } = state;

  const outlineToUse = editedOutput || outline;

  let message = `Write the complete essay following this outline.

ESSAY PROMPT:
${essayPrompt}

TARGET WORD COUNT: ${targetWordCount} words (IMPORTANT: Stay within 10% of this target)
${university ? `TARGET UNIVERSITY: ${university}` : ''}

THESIS:
${outlineToUse.thesis}

NARRATIVE STRUCTURE:
${outlineToUse.narrativeStructure || 'Standard'}

DETAILED OUTLINE:
`;

  outlineToUse.sections?.forEach((section, index) => {
    message += `
--- SECTION ${section.sectionNumber || index + 1}: ${section.title} (~${section.estimatedWords} words) ---
Purpose: ${section.purpose}
${section.content?.openingLine ? `Opening Line: "${section.content.openingLine}"` : ''}
${section.content?.keyMoment ? `Key Moment: ${section.content.keyMoment}` : ''}
${section.content?.details ? `Include: ${section.content.details.join(', ')}` : ''}
${section.content?.tone ? `Tone: ${section.content.tone}` : ''}
${section.transitionTo ? `Transition: ${section.transitionTo}` : ''}
`;
  });

  if (outlineToUse.voiceNotes) {
    message += `\nVOICE GUIDANCE:
${outlineToUse.voiceNotes}`;
  }

  if (outlineToUse.thingsToAvoid?.length > 0) {
    message += `\nAVOID:
${outlineToUse.thingsToAvoid.map(t => `- ${t}`).join('\n')}`;
  }

  if (studentProfile) {
    message += `\n\nSTUDENT CONTEXT (Write authentically as this student):`;
    if (studentProfile.name) message += `\nName: ${studentProfile.name}`;
    if (studentProfile.grade) message += `\nGrade: ${studentProfile.grade}`;

    // Background context that should inform voice and perspective
    const bg = studentProfile.background || {};
    if (bg.firstGeneration) {
      message += `\n[First-Generation College Student - Reflect this perspective authentically]`;
    }
    if (bg.uniqueCircumstances) {
      message += `\nUnique Life Context: ${bg.uniqueCircumstances}`;
    }
    if (bg.familyResponsibilities) {
      message += `\nFamily Context: ${bg.familyResponsibilities}`;
    }

    // Activities to potentially reference
    if (studentProfile.activities && studentProfile.activities.length > 0) {
      message += `\n\nKey Activities (reference where relevant):`;
      studentProfile.activities.slice(0, 3).forEach(a => {
        message += `\n- ${a.name} (${a.role}): ${a.impact || ''}`;
      });
    }

    // Personal voice elements
    if (studentProfile.strengths && studentProfile.strengths.length > 0) {
      message += `\nStrengths to show (not tell): ${studentProfile.strengths.join(', ')}`;
    }
    if (studentProfile.values && studentProfile.values.length > 0) {
      const values = Array.isArray(studentProfile.values) ? studentProfile.values : [studentProfile.values];
      message += `\nCore values: ${values.join(', ')}`;
    }
    if (studentProfile.passions && studentProfile.passions.length > 0) {
      message += `\nPassions: ${studentProfile.passions.join(', ')}`;
    }

    if (studentProfile.voiceCharacteristics) {
      message += `\nVoice Style: ${JSON.stringify(studentProfile.voiceCharacteristics)}`;
    }
  }

  // Include key research for reference
  if (research?.keyMoments?.length > 0) {
    message += `\n\nKEY MOMENTS TO INCLUDE:`;
    research.keyMoments.forEach(m => {
      message += `\n- ${m.moment}`;
      if (m.details) {
        message += ` (Details: ${m.details})`;
      }
      if (m.significance) {
        message += `\n  Significance: ${m.significance}`;
      }
    });
  }

  if (humanFeedback) {
    message += `\n\nFEEDBACK TO INCORPORATE:
${humanFeedback}

Please revise your draft based on this feedback.`;
  }

  return message;
}

module.exports = { draftWriter };
