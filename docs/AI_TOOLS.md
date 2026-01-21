# CoreZenith AI Tools Documentation

> Deep dive into the 6 multi-agent AI tools powering CoreZenith's intelligent education features

---

## Table of Contents

1. [EssayMentor - College Essay Generation](#1-essaymentor---college-essay-generation)
2. [AI Writing Coach - Document Analysis](#2-ai-writing-coach---document-analysis)
3. [AI Coding Supervisor - Session Guidance](#3-ai-coding-supervisor---session-guidance)
4. [AI Mentor Bot - Intelligent Tutoring](#4-ai-mentor-bot---intelligent-tutoring)
5. [AI Course Generator - Curriculum Creation](#5-ai-course-generator---curriculum-creation)
6. [AI Feedback Tutor - Socratic Learning](#6-ai-feedback-tutor---socratic-learning)
7. [Human-in-Loop Integration](#human-in-loop-integration)
8. [API Reference](#api-reference)

---

## 1. EssayMentor - College Essay Generation

### Overview

EssayMentor is a sophisticated 6-agent pipeline system designed to generate high-quality college admissions essays. The system produces essays rated 8-8.5/10 by leveraging specialized agents that work sequentially with human oversight at each stage.

**Video Demos:**
- [Standalone Demo](https://www.loom.com/share/1377b1b0829143d5901ec9afa780a535)
- [Human-in-Loop Demo](https://www.loom.com/share/7972e0a42ab240608c6b53c3224f824d)
- [Architecture Walkthrough](https://www.loom.com/share/76b5a27ae38347ce968ab60ab572848f)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EssayMentor Pipeline                                  │
│                                                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐       │
│  │ Student │   │  Topic  │   │Research │   │Outline  │   │  Draft  │       │
│  │ Profile │──▶│Analyzer │──▶│  Agent  │──▶│Architect│──▶│ Writer  │       │
│  └─────────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘       │
│                     │             │             │             │             │
│                     ▼             ▼             ▼             ▼             │
│               ┌──────────────────────────────────────────────────┐         │
│               │          Human-in-Loop Approval Gate             │         │
│               └──────────────────────────────────────────────────┘         │
│                     │             │             │             │             │
│                     ▼             ▼             ▼             ▼             │
│                ┌─────────┐   ┌─────────┐                                   │
│                │ Editor  │──▶│  Final  │──▶ [Output: 650-word Essay]       │
│                │ Critic  │   │ Polish  │                                   │
│                └─────────┘   └─────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Specifications

#### Agent 1: Topic Analyzer
**File:** `services/essayAgents/agents/topicAnalyzer.js`

**Purpose:** Analyzes essay prompts and extracts key requirements, themes, and constraints.

**Input:**
```json
{
  "prompt": "Describe a challenge you've faced...",
  "university": "Stanford",
  "wordLimit": 650,
  "studentProfile": { ... }
}
```

**Output:**
```json
{
  "themes": ["resilience", "growth", "personal challenge"],
  "requirements": ["specific example", "reflection", "impact"],
  "tone": "reflective but forward-looking",
  "keyQuestions": [
    "What was the challenge?",
    "How did you respond?",
    "What did you learn?"
  ]
}
```

---

#### Agent 2: Researcher
**File:** `services/essayAgents/agents/researcher.js`

**Purpose:** Gathers relevant information from the student profile and contextualizes the topic.

**Input:** Topic analysis + Student profile

**Output:**
```json
{
  "relevantExperiences": [...],
  "uniqueAngles": [...],
  "supportingDetails": [...],
  "connectionPoints": [...]
}
```

---

#### Agent 3: Outline Architect
**File:** `services/essayAgents/agents/outlineArchitect.js`

**Purpose:** Creates a detailed, structured essay outline with paragraph-level guidance.

**Output:**
```json
{
  "introduction": {
    "hook": "...",
    "context": "...",
    "thesis": "..."
  },
  "body": [
    {
      "topic": "The Challenge",
      "points": [...],
      "transition": "..."
    }
  ],
  "conclusion": {
    "reflection": "...",
    "futureConnection": "..."
  }
}
```

---

#### Agent 4: Draft Writer
**File:** `services/essayAgents/agents/draftWriter.js`

**Purpose:** Writes the initial essay draft following the outline structure.

**Features:**
- Maintains consistent voice
- Follows word count targets
- Incorporates student-specific details
- Creates natural transitions

---

#### Agent 5: Editor Critic
**File:** `services/essayAgents/agents/editorCritic.js`

**Purpose:** Reviews the draft and provides detailed feedback and suggestions.

**Output:**
```json
{
  "overallScore": 7.5,
  "strengths": [...],
  "weaknesses": [...],
  "suggestions": [
    {
      "location": "paragraph 2",
      "issue": "...",
      "suggestion": "..."
    }
  ],
  "revisedSections": [...]
}
```

---

#### Agent 6: Final Polish
**File:** `services/essayAgents/agents/finalPolish.js`

**Purpose:** Refines language, ensures coherence, and produces the final essay.

**Features:**
- Grammar and style refinement
- Word count optimization (target: 650 words)
- Coherence verification
- Final quality check

---

### Pipeline Orchestration

**File:** `services/essayAgents/essayPipelineService.js`

```javascript
class EssayPipelineService extends EventEmitter {
  constructor() {
    this.agents = [
      new TopicAnalyzer(),
      new Researcher(),
      new OutlineArchitect(),
      new DraftWriter(),
      new EditorCritic(),
      new FinalPolish()
    ];
  }

  async runPipeline(input, sessionId) {
    let context = { input };

    for (const agent of this.agents) {
      // Emit progress
      this.emit('stage_start', { agent: agent.name, sessionId });

      // Run agent
      const result = await agent.process(context);

      // Wait for human approval
      const approval = await this.waitForApproval(sessionId, agent.name);

      if (approval.action === 'reject') {
        // Re-run with feedback
        const revised = await agent.process(context, approval.feedback);
        context = { ...context, [agent.name]: revised };
      } else {
        context = { ...context, [agent.name]: result };
      }

      this.emit('stage_complete', { agent: agent.name, sessionId });
    }

    return context.finalPolish;
  }
}
```

---

### WebSocket Events

**File:** `services/essayCollabWebSocket.js`

| Event | Direction | Description |
|-------|-----------|-------------|
| `start_pipeline` | Client → Server | Initiates essay generation |
| `stage_started` | Server → Client | Agent begins processing |
| `stage_output` | Server → Client | Agent produces output |
| `approve_stage` | Client → Server | User approves stage output |
| `request_revision` | Client → Server | User requests changes |
| `add_feedback` | Client → Server | User provides feedback |
| `essay_complete` | Server → Client | Final essay ready |

---

### API Endpoints

```
POST /api/essays/generate
  Body: { prompt, university, studentProfile }
  Response: { sessionId, status }

GET /api/essays/:sessionId/status
  Response: { currentStage, progress, outputs }

POST /api/essays/:sessionId/approve
  Body: { stage, approved, feedback }
  Response: { nextStage }

GET /api/essays/:sessionId/download
  Query: { format: 'pdf' | 'docx' }
  Response: File download
```

---

## 2. AI Writing Coach - Document Analysis

### Overview

The AI Writing Coach provides comprehensive document analysis, generating 30-50+ specific, actionable comments distributed across the entire document.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Writing Coach Pipeline                             │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  Document   │──▶│  Section    │──▶│  Comment    │──▶│  Priority   │     │
│  │  Analyzer   │   │  Evaluator  │   │  Generator  │   │   Ranker    │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                               │             │
│                                                               ▼             │
│                                                        ┌─────────────┐     │
│                                            Output ◀────│  Feedback   │     │
│                                                        │ Synthesizer │     │
│                                                        └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Specifications

#### Document Analyzer
Extracts document structure, identifies sections, and understands overall flow.

#### Section Evaluator
Evaluates each section for:
- Clarity
- Grammar
- Argument strength
- Evidence quality
- Transitions

#### Comment Generator
Produces specific comments with:
- Exact position (line/paragraph)
- Issue description
- Improvement suggestion
- Priority level

#### Priority Ranker
Ranks comments by:
- Impact on overall quality
- Ease of implementation
- Critical vs. optional

#### Feedback Synthesizer
Produces summary feedback and organizes comments.

---

### Implementation

**File:** `services/comprehensiveAICoachService.js`

```javascript
class ComprehensiveAICoachService {
  async analyzeDocument(document, options = {}) {
    const { minComments = 30, maxComments = 50 } = options;

    // Break document into sections
    const sections = this.parseDocument(document);

    // Analyze each section
    const sectionAnalyses = await Promise.all(
      sections.map(s => this.analyzeSection(s))
    );

    // Generate distributed comments
    const comments = await this.generateComments(sectionAnalyses, {
      min: minComments,
      max: maxComments
    });

    // Rank and prioritize
    const rankedComments = this.rankComments(comments);

    return {
      summary: this.generateSummary(sectionAnalyses),
      comments: rankedComments,
      overallScore: this.calculateScore(sectionAnalyses)
    };
  }
}
```

---

### Comment Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Grammar** | Spelling, punctuation, syntax | "Consider using 'which' instead of 'that' here" |
| **Clarity** | Unclear phrasing | "This sentence could be clearer. Try: ..." |
| **Structure** | Organization issues | "Consider moving this paragraph earlier" |
| **Argument** | Logic and reasoning | "This claim needs supporting evidence" |
| **Style** | Tone and voice | "This phrase sounds too informal for academic writing" |
| **Citation** | Reference issues | "Add a citation for this statistic" |

---

### Human-in-Loop Features

```typescript
interface CommentFeedback {
  commentId: string;
  action: 'accept' | 'reject' | 'modify';
  userResponse?: string;
  implemented: boolean;
}
```

---

## 3. AI Coding Supervisor - Session Guidance

### Overview

Real-time coding session supervision with personality-based feedback and adaptive difficulty.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Coding Supervisor                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Real-time Code Monitor                           │   │
│  │                                                                     │   │
│  │   Code Input ──▶ Parse ──▶ Analyze ──▶ Compare to Solution         │   │
│  │                                              │                       │   │
│  └──────────────────────────────────────────────┼───────────────────────┘   │
│                                                 │                           │
│                                                 ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Feedback Generation                               │   │
│  │                                                                     │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │ Encouraging │  │  Socratic   │  │   Direct    │                │   │
│  │   │    Mode     │  │    Mode     │  │    Mode     │                │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Personality Modes

**File:** `services/aiSupervisor.js`

#### Encouraging Mode
```javascript
const encouragingPrompts = {
  onProgress: "Great job! You're making excellent progress!",
  onStuck: "Don't worry, this is a tricky part. Let's work through it together.",
  onError: "Almost there! Small syntax error on line {line}. Keep going!"
};
```

#### Socratic Mode
```javascript
const socraticPrompts = {
  onProgress: "What do you think happens when this function runs?",
  onStuck: "What if you tried printing the value at this point?",
  onError: "What type does this variable hold? What type does the function expect?"
};
```

#### Direct Mode
```javascript
const directPrompts = {
  onProgress: "Correct. Continue.",
  onStuck: "You need to use a for loop here. The syntax is: for (let i = 0; ...)",
  onError: "Line 15: Missing semicolon. Line 23: Undefined variable 'count'."
};
```

---

### Implementation

```javascript
class AISupervisor {
  constructor(config) {
    this.personality = config.personality || 'encouraging';
    this.hintDelay = config.hintDelay || 30000; // 30 seconds
    this.difficultyLevel = config.difficultyLevel || 'medium';
  }

  async superviseSession(sessionId, studentId) {
    const session = await this.getSession(sessionId);

    // Monitor code changes
    session.on('codeChange', async (code) => {
      const analysis = await this.analyzeCode(code, session.problem);

      // Track progress
      this.updateProgress(studentId, analysis);

      // Generate contextual feedback
      if (analysis.isStuck && !this.hintTimer) {
        this.hintTimer = setTimeout(() => {
          this.provideHint(sessionId, analysis);
        }, this.hintDelay);
      }

      if (analysis.hasError) {
        this.provideErrorGuidance(sessionId, analysis.errors);
      }

      if (analysis.isComplete) {
        this.congratulate(sessionId);
      }
    });
  }

  async provideHint(sessionId, analysis) {
    const hint = await this.generateHint(analysis, this.personality);
    this.emit('hint', { sessionId, hint, personality: this.personality });
  }
}
```

---

### Features

| Feature | Description |
|---------|-------------|
| **Code History Tracking** | Maintains history of all code versions |
| **Mistake Pattern Recognition** | Identifies recurring errors |
| **Dynamic Difficulty** | Adjusts hint specificity based on student level |
| **Progress Monitoring** | Tracks completion percentage |
| **Time-based Hints** | Delivers hints after configurable delay |

---

## 4. AI Mentor Bot - Intelligent Tutoring

### Overview

Intelligent mentor matching system that pairs students with specialized AI tutors based on request type, difficulty, and learning style.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Mentor Bot System                               │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  Request    │──▶│    Bot      │──▶│  Knowledge  │──▶│  Response   │     │
│  │ Classifier  │   │   Matcher   │   │  Retriever  │   │  Generator  │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                               │             │
│                                                               ▼             │
│                                                        ┌─────────────┐     │
│                                                        │   Context   │     │
│                                                        │   Manager   │     │
│                                                        └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bot Profiles

**File:** `services/aiBotService.js`

```javascript
const botProfiles = {
  math_tutor: {
    name: "Professor Newton",
    specialization: ["algebra", "calculus", "statistics"],
    personality: "patient and methodical",
    knowledgeBase: "mathematics",
    responseStyle: "step-by-step explanations"
  },

  coding_mentor: {
    name: "Dev Diana",
    specialization: ["javascript", "python", "algorithms"],
    personality: "encouraging and practical",
    knowledgeBase: "programming",
    responseStyle: "code examples with explanations"
  },

  writing_coach: {
    name: "Editor Emma",
    specialization: ["essays", "grammar", "style"],
    personality: "constructive and detailed",
    knowledgeBase: "writing",
    responseStyle: "before/after comparisons"
  },

  science_guide: {
    name: "Dr. Curie",
    specialization: ["physics", "chemistry", "biology"],
    personality: "curious and explorative",
    knowledgeBase: "science",
    responseStyle: "analogies and real-world examples"
  }
};
```

---

### Implementation

```javascript
class AIBotService {
  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    this.cache = new Map();
  }

  async matchBot(request) {
    // Classify the request
    const classification = await this.classifyRequest(request);

    // Find best matching bot
    const bot = this.findBestMatch(classification, botProfiles);

    return bot;
  }

  async generateResponse(request, botProfile, sessionContext) {
    // Build context-aware prompt
    const prompt = this.buildPrompt(request, botProfile, sessionContext);

    // Check cache
    const cacheKey = this.getCacheKey(request, botProfile.name);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Generate response using Gemini
    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);

    // Cache response
    this.cache.set(cacheKey, result.text);

    return result.text;
  }

  async manageSession(sessionId, userId) {
    // Maintain conversation context
    const context = await this.getSessionContext(sessionId);

    return {
      addMessage: (message) => this.addToContext(context, message),
      getHistory: () => context.messages,
      clear: () => this.clearContext(sessionId)
    };
  }
}
```

---

### Matching Algorithm

```javascript
function findBestMatch(classification, profiles) {
  const scores = Object.entries(profiles).map(([id, profile]) => {
    let score = 0;

    // Specialization match
    score += profile.specialization.filter(
      s => classification.topics.includes(s)
    ).length * 10;

    // Difficulty match
    if (profile.difficultyRange.includes(classification.difficulty)) {
      score += 5;
    }

    // Learning style match
    if (profile.responseStyle === classification.preferredStyle) {
      score += 3;
    }

    return { id, profile, score };
  });

  return scores.sort((a, b) => b.score - a.score)[0];
}
```

---

## 5. AI Course Generator - Curriculum Creation

### Overview

Generates comprehensive, Educative.io-style courses with structured learning paths, LeetCode-style problems, and assessments.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Course Generator                                   │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   Topic     │──▶│  Structure  │──▶│  Content    │──▶│  Problem    │     │
│  │  Analyzer   │   │  Designer   │   │  Generator  │   │  Creator    │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                               │             │
│                                                               ▼             │
│                                                        ┌─────────────┐     │
│                                            Output ◀────│ Assessment  │     │
│                                                        │  Builder    │     │
│                                                        └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Output Structure

```json
{
  "course": {
    "title": "Data Structures Mastery",
    "description": "...",
    "duration": "8 weeks",
    "difficulty": "intermediate",
    "prerequisites": ["Basic Programming"],

    "modules": [
      {
        "title": "Arrays and Strings",
        "lessons": [
          {
            "title": "Introduction to Arrays",
            "content": "...",
            "codeExamples": [...],
            "interactiveWidget": "array-visualizer"
          }
        ],
        "problems": [
          {
            "title": "Two Sum",
            "difficulty": "easy",
            "description": "...",
            "testCases": [...],
            "solution": "...",
            "hints": [...]
          }
        ],
        "assessment": {
          "quiz": [...],
          "codingChallenge": {...}
        }
      }
    ],

    "finalProject": {
      "title": "Build a Search Engine",
      "description": "...",
      "requirements": [...]
    }
  }
}
```

---

### Implementation

**File:** `services/claudeApiService.js`

```javascript
class CourseGeneratorService {
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateCourse(config) {
    const { topic, difficulty, targetAudience, languages } = config;

    // Step 1: Analyze topic and create structure
    const structure = await this.designStructure(topic, difficulty);

    // Step 2: Generate content for each module
    const modules = await Promise.all(
      structure.modules.map(m => this.generateModuleContent(m, languages))
    );

    // Step 3: Create practice problems
    const problems = await this.generateProblems(modules, difficulty);

    // Step 4: Build assessments
    const assessments = await this.buildAssessments(modules, problems);

    return {
      ...structure,
      modules,
      problems,
      assessments
    };
  }

  async generateModuleContent(module, languages) {
    const prompt = `Generate educational content for: ${module.title}

    Include:
    1. Clear explanations with analogies
    2. Code examples in ${languages.join(', ')}
    3. Common pitfalls and how to avoid them
    4. Real-world applications`;

    const response = await this.claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    });

    return this.parseModuleContent(response.content[0].text);
  }
}
```

---

### Problem Generation

```javascript
async generateProblems(modules, difficulty) {
  const problems = [];

  for (const module of modules) {
    // Easy problems
    problems.push(await this.createProblem(module, 'easy'));

    // Medium problems
    problems.push(await this.createProblem(module, 'medium'));

    // Hard problem (if intermediate/advanced course)
    if (difficulty !== 'beginner') {
      problems.push(await this.createProblem(module, 'hard'));
    }
  }

  return problems;
}

async createProblem(module, difficulty) {
  return {
    title: await this.generateProblemTitle(module.concepts, difficulty),
    difficulty,
    description: await this.generateDescription(module.concepts),
    examples: await this.generateExamples(3),
    constraints: await this.generateConstraints(difficulty),
    testCases: await this.generateTestCases(10),
    hints: await this.generateHints(3),
    solution: await this.generateSolution(),
    timeComplexity: await this.analyzeComplexity('time'),
    spaceComplexity: await this.analyzeComplexity('space')
  };
}
```

---

## 6. AI Feedback Tutor - Socratic Learning

### Overview

Provides conceptual hints using the Socratic method, guiding students to discover answers rather than giving direct solutions.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Feedback Tutor                                     │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │    Code     │──▶│  Concept    │──▶│    Hint     │──▶│  Question   │     │
│  │  Evaluator  │   │   Mapper    │   │  Composer   │   │  Generator  │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation

**File:** `services/aiFeedbackService.js`

```javascript
class AIFeedbackService {
  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }

  async generateConceptualHint(code, lessonObjectives, studentHistory) {
    // Evaluate code against objectives
    const evaluation = await this.evaluateCode(code, lessonObjectives);

    // Map to relevant concepts
    const concepts = this.mapToConcepts(evaluation.gaps);

    // Generate Socratic questions
    const questions = await this.generateSocraticQuestions(concepts);

    return {
      hint: questions[0],
      followUp: questions.slice(1),
      conceptsToReview: concepts,
      notDirectAnswer: true
    };
  }

  async generateSocraticQuestions(concepts) {
    const prompt = `Generate Socratic questions to help a student understand:
    ${concepts.join(', ')}

    Rules:
    1. Never give the direct answer
    2. Lead the student to discover the solution
    3. Use "What if..." and "Why do you think..." constructions
    4. Reference specific parts of their code`;

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);

    return this.parseQuestions(result.text);
  }
}
```

---

### Feedback Types

| Type | Example |
|------|---------|
| **Conceptual** | "What happens to the loop counter when this condition is met?" |
| **Debugging** | "What value does `x` have at line 15? Is that what you expected?" |
| **Best Practice** | "Why might it be useful to handle this edge case?" |
| **Performance** | "How many times does this loop run? Could you reduce that?" |
| **Security** | "What happens if the user enters unexpected input here?" |

---

## Human-in-Loop Integration

### Universal Feedback Widget

All AI tools implement a consistent human-in-loop interface:

```typescript
interface HumanInLoopWidget {
  // Display
  renderOutput(output: AIOutput): void;
  renderOptions(options: FeedbackOptions): void;

  // Actions
  approve(): Promise<void>;
  reject(feedback: string): Promise<void>;
  edit(changes: EditChanges): Promise<void>;

  // History
  getIterations(): Iteration[];
  rollback(iterationId: string): Promise<void>;

  // Real-time
  onProgress(callback: (progress: Progress) => void): void;
}
```

### Integration Pattern

```
User Request
     │
     ▼
┌─────────────┐
│  AI Agent   │──────────────────────────────┐
└─────────────┘                              │
     │                                       │
     ▼                                       │
┌─────────────┐    ┌─────────────────────┐   │
│   Output    │───▶│  Human Feedback     │   │
│   Preview   │    │      Widget         │   │
└─────────────┘    └──────────┬──────────┘   │
                              │              │
              ┌───────────────┼───────────┐  │
              │               │           │  │
              ▼               ▼           ▼  │
         ┌─────────┐   ┌─────────┐  ┌─────────┐
         │ Approve │   │ Reject  │  │  Edit   │
         └────┬────┘   └────┬────┘  └────┬────┘
              │             │            │
              ▼             └────────────┘
         Continue                  │
         Pipeline                  │
              │                    ▼
              │              Re-run Agent
              │              with Feedback
              │                    │
              └────────────────────┘
```

---

## API Reference

### Essay API

```
POST   /api/essays/generate          # Start essay generation
GET    /api/essays/:id               # Get essay details
GET    /api/essays/:id/status        # Get pipeline status
POST   /api/essays/:id/approve       # Approve stage
POST   /api/essays/:id/revision      # Request revision
GET    /api/essays/:id/download      # Download essay
DELETE /api/essays/:id               # Delete essay
```

### AI Coach API

```
POST   /api/ai/coach/analyze         # Analyze document
GET    /api/ai/coach/comments/:id    # Get comments
POST   /api/ai/coach/comments/:id/resolve  # Resolve comment
```

### AI Bot API

```
POST   /api/ai/bot/chat              # Send message to bot
GET    /api/ai/bot/session/:id       # Get session history
POST   /api/ai/bot/match             # Find matching bot
```

### Course Generator API

```
POST   /api/ai/course/generate       # Generate course
GET    /api/ai/course/:id            # Get course
PUT    /api/ai/course/:id            # Update course
POST   /api/ai/course/:id/publish    # Publish course
```

### Coding Supervisor API

```
POST   /api/ai/supervisor/start      # Start supervision
POST   /api/ai/supervisor/code       # Submit code update
GET    /api/ai/supervisor/hints/:id  # Get hints
PUT    /api/ai/supervisor/settings   # Update settings
```

### Feedback Tutor API

```
POST   /api/ai/feedback/hint         # Get conceptual hint
POST   /api/ai/feedback/evaluate     # Evaluate code
GET    /api/ai/feedback/concepts     # Get concept mapping
```

---

## Configuration

### Environment Variables

```env
# AI Service Configuration
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key
GOOGLE_GEMINI_API_KEY=...           # Gemini API key
OLLAMA_BASE_URL=http://localhost:11434  # Local LLM

# AI Tool Settings
AI_DEFAULT_MODEL=claude-sonnet-4    # Default model
AI_ESSAY_WORD_TARGET=650            # Essay word count
AI_HINT_DELAY_MS=30000              # Hint delay
AI_COACH_MIN_COMMENTS=30            # Minimum comments
AI_COACH_MAX_COMMENTS=50            # Maximum comments

# Quota Settings
AI_DAILY_ESSAY_LIMIT=5              # Essays per day
AI_DAILY_COACH_LIMIT=10             # Analyses per day
```

---

## Best Practices

### For Developers

1. **Always implement human-in-loop** - Never skip approval gates
2. **Handle API failures gracefully** - Use fallback models
3. **Cache responses** - Reduce API costs
4. **Log all AI interactions** - For debugging and improvement
5. **Validate outputs** - Check for inappropriate content

### For Users

1. **Provide specific feedback** - "More examples" vs "Improve"
2. **Use approval gates** - Review each stage carefully
3. **Iterate** - Multiple passes improve quality
4. **Save preferred outputs** - Build a personal library

---

For questions or issues, see the main [README.md](../README.md) or open an issue.
