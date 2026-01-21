# Core-Zenith Multi-Agent Essay Writing System
## Portfolio Loom Video Script (5 Minutes)

**Duration:** 5 minutes
**Target Audience:** Technical recruiters, engineering managers, AI/ML teams

---

## INTRO HOOK (0:00 - 0:20)

> "I built a 6-agent AI system that writes college essays indistinguishable from human writers. It uses LangChain for orchestration, a locally fine-tuned Mistral model via Ollama, and Claude Sonnet 4 for production—all wrapped in a ChatGPT-style interface.
>
> Let me show you how it works."

**Show:** Quick 5-second demo of essay generating with 6-agent progress animation

---

## SECTION 1: The 6-Agent Architecture (0:20 - 1:20)

> "The core innovation is breaking essay writing into six specialized agents:
>
> **Agent 1 - Profile Analyst:** Analyzes the student's experiences and identifies their unique story angles.
>
> **Agent 2 - University Expert:** Researches what MIT, Harvard, or Stanford specifically looks for—loaded from a database of 20+ university profiles.
>
> **Agent 3 - Creative Strategist:** Brainstorms 3-4 distinct essay approaches with specific hooks and narrative arcs.
>
> **Agent 4 - Structure Architect:** Creates a paragraph-by-paragraph outline with word counts and specific details.
>
> **Agent 5 - Master Writer:** Drafts the complete essay using authentic teenage voice—no AI clichés.
>
> **Agent 6 - Quality Critic:** Evaluates against university standards, provides line-by-line feedback, and refines to 9.5/10 quality.
>
> Each agent passes its output to the next through a LangGraph state machine. Total generation time: 90 seconds."

**Show:**
- Code snippet of agent pipeline in `workflow.py`
- The `EssayState` TypedDict showing data flow
- Quick scroll through `university_profiles.json`

---

## SECTION 2: LangChain & LangGraph Implementation (1:20 - 2:20)

> "The orchestration layer uses LangGraph—LangChain's state machine framework. Here's the architecture:
>
> Each agent is a node in a directed graph. The state flows sequentially—Profile to Research to Brainstorm to Outline to Draft to Critique.
>
> The `EssayState` TypedDict holds everything: the prompt, student profile, target university, and each agent's output. When Agent 3 runs, it has access to Agents 1 and 2's analysis.
>
> The power of LangChain here is the LLM abstraction. I can swap between Claude and Ollama with a single environment variable—same agent code, different backend."

```python
# workflow.py - LangGraph orchestration
workflow = StateGraph(EssayState)
workflow.add_node("profile", profile_agent)
workflow.add_node("research", research_agent)
workflow.add_node("brainstorm", brainstorm_agent)
workflow.add_node("outline", outline_agent)
workflow.add_node("draft", draft_agent)
workflow.add_node("critique", critique_agent)
workflow.add_edge("profile", "research")
# ... sequential edges
```

**Show:**
- `workflow.py` with LangGraph setup
- `ollama_helper.py` showing Claude/Ollama routing
- `state.py` with the full EssayState structure

---

## SECTION 3: Local Fine-Tuning with Ollama (2:20 - 3:20)

> "Before deploying with Claude, I fine-tuned a local model to understand what quality essay writing looks like.
>
> **Base Model:** Mistral 7B Instruct—small enough for my RTX 4060 but powerful enough for creative writing.
>
> **Training Data:** 150 elite college essays from 99th percentile SAT verbal scorers.
>
> **Method:** LoRA—Low-Rank Adaptation. Instead of retraining 7 billion parameters, I trained 54 megabytes of adapter weights on attention layers only.
>
> **Quantization:** 4-bit NF4 to fit in 8GB VRAM.
>
> I tested the fine-tuned model against base Llama 3.1. The fine-tuned version produced essays with more specific details, authentic dialogue, and fewer generic phrases.
>
> Then I took those prompts and agent designs to Claude Sonnet 4. The result? Claude with my prompt engineering consistently hits 9-10 out of 10 quality—compared to 6-8 with base prompts."

**Show:**
- `training_info.json` with fine-tuning config
- LoRA adapter files in `models/draft_agent_finetuned/`
- Side-by-side comparison: base vs fine-tuned output
- Quality score comparison chart

---

## SECTION 4: Anthropic SDK & Production Pipeline (3:20 - 4:00)

> "For production, the system uses Claude Sonnet 4 through the Anthropic SDK. Here's a typical agent call:"

```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: `You are a master essay writer. Write in first person.
           Sound like an authentic 17-year-old—NOT an adult, NOT AI.
           Show don't tell. Avoid clichés like 'journey' or 'passion'.
           Every sentence must earn its place.`,
  messages: [{ role: 'user', content: outlineAndContext }]
});
```

> "The prompt engineering I developed during fine-tuning carries over. The 6-agent structure—profile analysis feeding into university research feeding into brainstorming—that's what makes this work. Claude has the capability; my system provides the guidance."

**Show:**
- `claude-essay.service.js` with SDK calls
- Master Writer agent prompt with quality requirements

---

## SECTION 5: ChatGPT-Style Interface (4:00 - 4:40)

> "The frontend is a React TypeScript app with a conversational interface.
>
> Users select from sample profiles or enter their own. When they submit, they see real-time progress through all six agents—spinners for in-progress, checkmarks for complete.
>
> The output includes the full essay, word count, generation time, and a quality score. Below that, an expandable critique with strengths, improvements, university-specific analysis, and line edits.
>
> Users can click 'Refine Based on Critique' for iterative improvement. The system tracks version history so you can compare drafts."

**Show:**
- Live demo: submit a sample profile
- 6-agent progress animation
- Essay card with critique accordion expanded
- Version history sidebar

---

## CLOSING (4:40 - 5:00)

> "Core-Zenith demonstrates:
> - Multi-agent orchestration with LangGraph
> - Local fine-tuning with Ollama and LoRA
> - Production deployment with Anthropic SDK
> - Full-stack React/Node/MongoDB architecture
>
> The fine-tuned model informed the prompts. The prompts elevated Claude. The result: publication-quality essays in 90 seconds.
>
> Thanks for watching—let's connect."

**Show:** Contact info / LinkedIn / GitHub

---

## QUICK REFERENCE

| Timestamp | Topic | Key Points |
|-----------|-------|------------|
| 0:00-0:20 | Intro | Hook + quick demo |
| 0:20-1:20 | 6 Agents | Profile→University→Brainstorm→Outline→Draft→Critique |
| 1:20-2:20 | LangChain | LangGraph state machine, EssayState, LLM abstraction |
| 2:20-3:20 | Fine-Tuning | Mistral 7B, LoRA, Ollama, quality comparison |
| 3:20-4:00 | Anthropic SDK | Claude Sonnet 4, prompt engineering transfer |
| 4:00-4:40 | UI Demo | Conversational interface, progress, critique |
| 4:40-5:00 | Closing | Summary + CTA |

---

## B-ROLL CUTS

- 0:05 - Essay generating animation
- 1:00 - `workflow.py` code
- 1:40 - LangGraph diagram
- 2:30 - Training config JSON
- 2:50 - Base vs fine-tuned comparison
- 3:30 - Claude SDK code
- 4:10 - Live UI demo

---

## TALKING POINTS IF ASKED

**"Why LangGraph over vanilla LangChain?"**
> "LangGraph gives me explicit state management. Each agent reads and writes to a typed state object—no ambiguity about what data flows where."

**"Why fine-tune locally first?"**
> "Two reasons: understanding and iteration. Fine-tuning forced me to define what makes a good essay. That knowledge transferred directly to my Claude prompts. Plus, I could iterate 50 times locally before spending on API calls."

**"What's the quality difference?"**
> "Base Llama 3.1: 6-8/10. Fine-tuned Mistral: 8-9/10. Claude with my prompts: 9-10/10. The fine-tuning taught me what to ask for."

**"Can this scale?"**
> "Yes—async generation with polling. The backend returns immediately, processes in background, frontend polls until complete. Add a Redis queue for higher volume."

---

*Script for Core-Zenith Portfolio Video - 5 Minutes*
