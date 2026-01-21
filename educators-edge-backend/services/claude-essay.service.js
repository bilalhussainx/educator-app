/**
 * Claude Essay Generation Service
 *
 * Uses Claude Sonnet 4 to generate high-quality college essays
 * Implements a 6-agent system through structured prompting for 9.5/10 quality essays
 */

const Anthropic = require('@anthropic-ai/sdk');

class ClaudeEssayService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-sonnet-4-20250514'; // Claude Sonnet 4
  }

  /**
   * Generate a complete college essay using 6-agent workflow
   */
  async generateEssay(prompt, studentProfile, university, wordCount = 650) {
    console.log('[Claude Essay] Starting 6-agent essay generation...');
    console.log(`[Claude Essay] University: ${university}`);
    console.log(`[Claude Essay] Target words: ${wordCount}`);

    try {
      // Agent 1: Profile Analysis
      console.log('[Claude Essay] Agent 1: Analyzing student profile...');
      const profileAnalysis = await this.analyzeProfile(studentProfile, prompt);

      // Agent 2: University Research
      console.log('[Claude Essay] Agent 2: Researching university...');
      const universityInsights = await this.researchUniversity(university, prompt);

      // Agent 3: Brainstorming
      console.log('[Claude Essay] Agent 3: Brainstorming unique angles...');
      const brainstorm = await this.brainstormAngles(prompt, profileAnalysis, universityInsights);

      // Agent 4: Outline Creation
      console.log('[Claude Essay] Agent 4: Creating detailed outline...');
      const outline = await this.createOutline(prompt, brainstorm, wordCount);

      // Agent 5: Essay Drafting
      console.log('[Claude Essay] Agent 5: Drafting compelling essay...');
      const essay = await this.draftEssay(prompt, studentProfile, university, outline, wordCount);

      // Agent 6: Critique & Refinement
      console.log('[Claude Essay] Agent 6: Critiquing and refining...');
      const { refinedEssay, critique, qualityScore } = await this.critiqueAndRefine(essay, prompt, university, studentProfile);

      const actualWordCount = refinedEssay.split(/\s+/).length;
      console.log(`[Claude Essay] Generation complete! Words: ${actualWordCount}, Quality: ${qualityScore}/10`);

      return {
        essay: refinedEssay,
        critique: critique,
        word_count: actualWordCount,
        quality_score: qualityScore,
        target_university: university,
        target_word_count: wordCount
      };

    } catch (error) {
      console.error('[Claude Essay] Generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Agent 1: Analyze student profile for unique strengths
   */
  async analyzeProfile(studentProfile, prompt) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an expert college admissions counselor. Analyze this student profile to identify unique strengths, compelling stories, and authentic voice characteristics.

Student Profile:
- Name: ${studentProfile.name || 'Anonymous'}
- Background: ${studentProfile.background || 'Not provided'}
- Key Experiences: ${(studentProfile.experiences || []).join(', ') || 'Not provided'}
- SAT Verbal: ${studentProfile.satVerbal || 'Not provided'}

Essay Prompt: ${prompt}

Provide a concise analysis (200 words max) identifying:
1. Most compelling unique qualities
2. Potential story angles that feel authentic
3. Voice characteristics to maintain
4. Experiences that best address this prompt`
      }]
    });

    return response.content[0].text;
  }

  /**
   * Agent 2: Research university values and culture
   */
  async researchUniversity(university, prompt) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an expert on elite university admissions. Provide specific insights about ${university}.

Essay Prompt: ${prompt}

Provide concise insights (200 words max) on:
1. ${university}'s core values and culture
2. What ${university} specifically looks for in essays
3. Common mistakes applicants make for ${university}
4. How to authentically connect with ${university}'s mission
5. Specific programs, initiatives, or aspects of ${university} that could be referenced`
      }]
    });

    return response.content[0].text;
  }

  /**
   * Agent 3: Brainstorm unique angles
   */
  async brainstormAngles(prompt, profileAnalysis, universityInsights) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a creative writing strategist for college essays. Based on the analysis below, brainstorm compelling angles.

Profile Analysis:
${profileAnalysis}

University Insights:
${universityInsights}

Essay Prompt: ${prompt}

Generate 3 unique essay angles that:
1. Feel authentic and personal (not generic)
2. Show growth, reflection, or transformation
3. Connect naturally to the university
4. Would stand out among thousands of applications

For each angle, provide: the hook, the narrative arc, and the concluding insight.`
      }]
    });

    return response.content[0].text;
  }

  /**
   * Agent 4: Create detailed outline
   */
  async createOutline(prompt, brainstorm, wordCount) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an expert essay structuring specialist. Create a detailed outline for a ${wordCount}-word college essay.

Brainstormed Angles:
${brainstorm}

Essay Prompt: ${prompt}

Select the strongest angle and create a detailed outline with:
1. Opening hook (first 2-3 sentences) - must grab attention immediately
2. Context/background (brief, ~50 words)
3. Main narrative with specific moments/details
4. Reflection/insight section showing growth
5. Connection to future/university (subtle, not forced)
6. Closing that echoes opening but shows transformation

Include specific details, dialogue, or sensory elements to include at each stage.`
      }]
    });

    return response.content[0].text;
  }

  /**
   * Agent 5: Draft the complete essay
   */
  async draftEssay(prompt, studentProfile, university, outline, wordCount) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an elite college essay writer who has helped students get into Harvard, MIT, Stanford, and other top universities. Write a compelling ${wordCount}-word essay.

CRITICAL REQUIREMENTS:
- Write in first person as the student
- Sound like an authentic, intelligent 17-18 year old (not an adult or AI)
- Show, don't tell - use specific moments, dialogue, sensory details
- Avoid clichés and generic phrases
- Every sentence must earn its place
- The voice must feel genuine and personal

Student Profile:
- Name: ${studentProfile.name || 'the student'}
- Background: ${studentProfile.background || 'Not provided'}
- Experiences: ${(studentProfile.experiences || []).join(', ') || 'Not provided'}

Target University: ${university}

Essay Prompt: ${prompt}

Outline to Follow:
${outline}

Write the complete essay now. Make it exceptional - worthy of ${university} admission.`
      }]
    });

    return response.content[0].text;
  }

  /**
   * Agent 6: Critique and refine the essay
   */
  async critiqueAndRefine(essay, prompt, university, studentProfile) {
    // First, get critique
    const critiqueResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a senior admissions officer at ${university} with 20 years of experience. Critically evaluate this essay.

Essay Prompt: ${prompt}

Student Essay:
${essay}

Provide a detailed critique with:

**OVERALL SCORE: X/10** (be honest but fair, 9+ only for truly exceptional essays)

**STRENGTHS**
- List 3-4 specific strengths with examples from the essay

**AREAS FOR IMPROVEMENT**
- List 2-3 specific areas that need work

**${university.toUpperCase()}-SPECIFIC ANALYSIS**
- How well does this align with ${university}'s values?
- Would this stand out to ${university} admissions?

**AUTHENTICITY CHECK**
- Does this sound like a real 17-18 year old?
- Is the voice consistent throughout?

**SPECIFIC LINE EDITS NEEDED**
- Quote specific sentences that need improvement and explain why`
      }]
    });

    const critique = critiqueResponse.content[0].text;

    // Extract quality score
    const scoreMatch = critique.match(/OVERALL SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    let qualityScore = scoreMatch ? parseFloat(scoreMatch[1]) : 8.0;

    // Now refine the essay based on critique
    const refineResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a master essay editor. Refine this essay to achieve a 9.5+/10 quality score.

Original Essay:
${essay}

Critique to Address:
${critique}

REQUIREMENTS FOR REFINED VERSION:
1. Fix ALL issues identified in the critique
2. Enhance the opening hook to be unforgettable
3. Add more specific, vivid details
4. Ensure the voice is authentic and consistent
5. Make the conclusion resonate emotionally
6. Remove any clichés or generic phrases
7. Ensure every word serves a purpose

Write the complete refined essay. This must be publication-quality, worthy of a 9.5/10 score.`
      }]
    });

    const refinedEssay = refineResponse.content[0].text;

    // Re-evaluate the refined essay
    const finalScoreResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Rate this refined essay on a scale of 1-10, where 10 is perfect. Be honest but recognize quality.

Essay:
${refinedEssay}

Respond with just a number (like 9.2 or 9.5) and one sentence explaining why.`
      }]
    });

    const finalScoreText = finalScoreResponse.content[0].text;
    const finalScoreMatch = finalScoreText.match(/(\d+(?:\.\d+)?)/);
    if (finalScoreMatch) {
      qualityScore = parseFloat(finalScoreMatch[1]);
    }

    // Update critique with final score
    const updatedCritique = critique.replace(
      /OVERALL SCORE:\s*\d+(?:\.\d+)?\s*\/\s*10/i,
      `OVERALL SCORE: ${qualityScore}/10 (after refinement)`
    ) + `\n\n**FINAL ASSESSMENT**\n${finalScoreText}`;

    return {
      refinedEssay,
      critique: updatedCritique,
      qualityScore
    };
  }
}

module.exports = new ClaudeEssayService();
