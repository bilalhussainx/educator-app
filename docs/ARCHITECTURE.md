# CoreZenith Architecture Documentation

> Detailed technical architecture of the CoreZenith AI-Enhanced Educational Platform

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [AI Services Layer](#ai-services-layer)
5. [Database Architecture](#database-architecture)
6. [Real-Time Communication](#real-time-communication)
7. [Human-in-Loop Feedback System](#human-in-loop-feedback-system)
8. [Microservice Communication](#microservice-communication)
9. [Security Architecture](#security-architecture)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

CoreZenith follows a microservices architecture with clear separation between the presentation layer (React), business logic layer (Node.js/Express), and AI services layer (Python/Node.js).

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    React 18 + TypeScript + Vite                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │    │
│  │  │   Pages  │  │Components│  │  Stores  │  │  Services (API/WS)   │ │    │
│  │  │   (90+)  │  │  (AI/UI) │  │ (Zustand)│  │  HTTP + WebSocket    │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                          HTTPS / WSS (TLS)
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Node.js + Express Server                         │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │    │
│  │  │   Routes   │  │ Middleware │  │Controllers │  │  WebSocket   │   │    │
│  │  │  (REST)    │  │ (Auth/Val) │  │  (Logic)   │  │   Router     │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────┬────────────────┬────────────────┬────────────────┬─────────────────────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
│   LMS   │    │   User   │    │  AI Services │    │  Real-time   │
│  Core   │    │  Mgmt    │    │   (15+)      │    │   Handler    │
│ Service │    │ Service  │    │              │    │              │
└────┬────┘    └────┬─────┘    └──────┬───────┘    └──────┬───────┘
     │              │                 │                   │
     ▼              ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │  Azure   │  │    Agora     │   │
│  │ (Primary)│  │ (Essays) │  │ (Cache)  │  │  Blob    │  │   (Video)    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                           AI LAYER                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Claude API  │  │  Gemini API  │  │    Ollama    │  │   Judge0     │     │
│  │  (Anthropic) │  │   (Google)   │  │   (Local)    │  │ (Code Exec)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 | UI component library |
| Language | TypeScript | Type safety |
| Build | Vite | Fast dev server & bundling |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | Radix UI | Accessible primitives |
| State | Zustand | Lightweight state management |
| Code Editor | Monaco Editor | VS Code editing experience |
| Terminal | XTerm.js | Browser terminal emulation |
| Real-time | Socket.io-client | WebSocket client |
| Collaboration | Liveblocks + Yjs | Real-time sync |
| Video | Agora RTC SDK | Video streaming |
| Rich Text | TipTap | Extensible editor |
| Animation | GSAP + Framer Motion | Animations |
| 3D | Three.js | 3D visualizations |

### Directory Structure

```
educators-edge-frontend/
├── src/
│   ├── components/
│   │   ├── ai/                    # AI-specific UI components
│   │   │   ├── AIChat.tsx         # AI conversation interface
│   │   │   ├── AIFeedback.tsx     # Feedback widget
│   │   │   ├── AIProgress.tsx     # Agent progress tracker
│   │   │   └── HumanInLoop.tsx    # Approval gates
│   │   ├── essay/                 # Essay system components
│   │   │   ├── EssayEditor.tsx    # Rich text editor
│   │   │   ├── StageApproval.tsx  # Stage approval widget
│   │   │   └── CommentThread.tsx  # Inline comments
│   │   ├── essayCollab/           # Collaboration components
│   │   │   ├── CollabEditor.tsx   # Liveblocks editor
│   │   │   ├── PresenceList.tsx   # Active users
│   │   │   └── ChatPanel.tsx      # Real-time chat
│   │   ├── layout/                # Navigation & layout
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── ui/                    # Radix UI primitives
│   │   └── code/                  # Code editor components
│   │       ├── MonacoEditor.tsx
│   │       └── Terminal.tsx
│   │
│   ├── pages/                     # Route components (90+)
│   │   ├── Dashboard.tsx
│   │   ├── EssayGenerator/
│   │   │   ├── index.tsx
│   │   │   └── stages/
│   │   ├── LiveTutorialPage.tsx
│   │   ├── LeetCodeIDE.tsx
│   │   └── ...
│   │
│   ├── services/                  # API service layer
│   │   ├── api.ts                 # Axios instance
│   │   ├── authService.ts
│   │   ├── courseService.ts
│   │   ├── essayService.ts
│   │   ├── websocketService.ts
│   │   └── sessionWebSocketService.ts
│   │
│   ├── stores/                    # Zustand stores
│   │   ├── authStore.ts
│   │   ├── courseStore.ts
│   │   ├── essayStore.ts
│   │   └── uiStore.ts
│   │
│   ├── lib/                       # Utilities
│   │   ├── liveblocks.ts          # Liveblocks config
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── types/                     # TypeScript definitions
│       ├── api.d.ts
│       ├── essay.d.ts
│       └── user.d.ts
│
├── public/
└── vite.config.ts
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     React Component Tree                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │ Local State │      │   Zustand   │      │  Liveblocks │
   │  (useState) │      │   Stores    │      │  (Collab)   │
   └─────────────┘      └──────┬──────┘      └──────┬──────┘
                               │                    │
                               ▼                    ▼
                        ┌─────────────┐      ┌─────────────┐
                        │  API Layer  │      │  WebSocket  │
                        │   (REST)    │      │   (Yjs)     │
                        └──────┬──────┘      └──────┬──────┘
                               │                    │
                               └────────┬───────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Backend Server │
                               └─────────────────┘
```

---

## Backend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Framework | Express.js | Web framework |
| Primary DB | PostgreSQL | Relational data |
| Document DB | MongoDB | Essay storage |
| Cache | Redis | Session cache |
| Queue | BullMQ | Background jobs |
| Real-time | WebSocket + Socket.io | Live updates |
| Auth | JWT + bcrypt | Authentication |
| Storage | Azure Blob | File uploads |
| Container | Docker + Dockerode | Sandboxed execution |

### Directory Structure

```
educators-edge-backend/
├── server.js                      # Entry point
├── controllers/                   # Route handlers
│   ├── authController.js
│   ├── courseController.js
│   ├── sessionController.js
│   └── essayController.js
│
├── models/                        # Database models
│   ├── User.js
│   ├── Course.js
│   ├── Session.js
│   ├── Essay.js                   # MongoDB/Mongoose
│   └── EssayCollaborationDraft.js
│
├── routes/                        # API routes
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── sessionRoutes.js
│   ├── essay.routes.js
│   └── essayCollaboration.routes.js
│
├── services/                      # Business logic (74 files)
│   ├── essayAgents/              # Multi-agent essay system
│   │   ├── agents/
│   │   │   ├── topicAnalyzer.js
│   │   │   ├── researcher.js
│   │   │   ├── outlineArchitect.js
│   │   │   ├── draftWriter.js
│   │   │   ├── editorCritic.js
│   │   │   └── finalPolish.js
│   │   ├── essayPipelineService.js
│   │   └── pipeline.js
│   │
│   ├── aiBotService.js           # AI mentor bot
│   ├── aiSupervisor.js           # Coding supervisor
│   ├── aiFeedbackService.js      # Socratic feedback
│   ├── claudeApiService.js       # Claude integration
│   ├── claudeLeetCodeService.js  # LeetCode AI
│   ├── claude-essay.service.js   # Essay generation
│   ├── comprehensiveAICoachService.js
│   ├── geminiService.js          # Gemini integration
│   │
│   ├── websocketHandler.js       # Live sessions WS
│   ├── websocketRouter.js        # WS routing
│   ├── websocketTerminalHandler.js
│   ├── essayCollabWebSocket.js   # Essay collab WS
│   │
│   ├── agoraService.js           # Video streaming
│   ├── judge0Service.js          # Code execution
│   ├── dockerExecutionService.js # Sandboxed exec
│   └── ...
│
├── middleware/
│   ├── authMiddleware.js
│   ├── rateLimiter.js
│   └── errorHandler.js
│
├── migrations/                    # Database migrations
├── scripts/                       # Utility scripts
├── workers/                       # BullMQ workers
└── config/                        # Configuration
```

### Request Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Express │────▶│Middleware│────▶│Controller│
│          │     │  Router  │     │  Stack   │     │          │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                                                        ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │◀────│ Response │◀────│ Service  │◀────│  Service │
│          │     │  Format  │     │  Result  │     │  Layer   │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    │                   │                   │
                                    ▼                   ▼                   ▼
                             ┌──────────┐        ┌──────────┐        ┌──────────┐
                             │PostgreSQL│        │ MongoDB  │        │  Redis   │
                             └──────────┘        └──────────┘        └──────────┘
```

---

## AI Services Layer

### AI Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI SERVICE ORCHESTRATOR                            │
│                          (essayPipelineService.js)                          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────┬───────────┼───────────┬───────────────┐
        │               │           │           │               │
        ▼               ▼           ▼           ▼               ▼
┌───────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Topic Analyzer│ │ Researcher│ │  Outline  │ │   Draft   │ │  Polish   │
│    Agent      │ │   Agent   │ │  Architect│ │  Writer   │ │   Agent   │
└───────┬───────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
        │               │             │             │             │
        └───────────────┴──────┬──────┴─────────────┴─────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  LLM Provider Layer │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  Claude API │     │ Gemini API  │     │   Ollama    │
    │ (Anthropic) │     │  (Google)   │     │  (Local)    │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### AI Service Files

| Service | File | Purpose |
|---------|------|---------|
| Essay Pipeline | `essayPipelineService.js` | Orchestrates 6-agent essay generation |
| Claude Essay | `claude-essay.service.js` | Claude Sonnet 4 for essay writing |
| AI Bot | `aiBotService.js` | Intelligent tutor matching (Gemini) |
| AI Supervisor | `aiSupervisor.js` | Real-time coding supervision |
| AI Coach | `comprehensiveAICoachService.js` | Document analysis (30-50+ comments) |
| AI Feedback | `aiFeedbackService.js` | Socratic hint generation |
| Course Generator | `claudeApiService.js` | AI-powered curriculum creation |
| LeetCode AI | `claudeLeetCodeService.js` | Problem explanation & hints |

### Agent Communication Pattern

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent 1   │     │   Agent 2   │     │   Agent 3   │
│   (Topic)   │────▶│ (Research)  │────▶│  (Outline)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Human-in-Loop Approval Gate             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Approve │  │ Reject  │  │  Edit   │             │
│  └────┬────┘  └────┬────┘  └────┬────┘             │
└───────┼────────────┼────────────┼───────────────────┘
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │Continue │  │Re-run   │  │ Merge   │
   │Pipeline │  │ Agent   │  │ Edits   │
   └─────────┘  └─────────┘  └─────────┘
```

---

## Database Architecture

### PostgreSQL Schema (Primary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │    users    │     │   courses   │     │  sessions   │                   │
│  ├─────────────┤     ├─────────────┤     ├─────────────┤                   │
│  │ id (PK)     │     │ id (PK)     │     │ id (PK)     │                   │
│  │ email       │◀───▶│ teacher_id  │     │ course_id   │◀─────────────────┐│
│  │ password    │     │ title       │     │ teacher_id  │                  ││
│  │ role        │     │ description │     │ start_time  │                  ││
│  │ created_at  │     │ created_at  │     │ status      │                  ││
│  └─────────────┘     └─────────────┘     └─────────────┘                  ││
│         │                   │                   │                          ││
│         │                   │                   │                          ││
│         ▼                   ▼                   ▼                          ││
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  ││
│  │ enrollments │     │   lessons   │     │ recordings  │                  ││
│  ├─────────────┤     ├─────────────┤     ├─────────────┤                  ││
│  │ id (PK)     │     │ id (PK)     │     │ id (PK)     │                  ││
│  │ user_id     │     │ course_id   │     │ session_id  │──────────────────┘│
│  │ course_id   │     │ title       │     │ url         │                   │
│  │ enrolled_at │     │ content     │     │ duration    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ submissions │     │  documents  │     │   messages  │                   │
│  ├─────────────┤     ├─────────────┤     ├─────────────┤                   │
│  │ id (PK)     │     │ id (PK)     │     │ id (PK)     │                   │
│  │ user_id     │     │ user_id     │     │ sender_id   │                   │
│  │ lesson_id   │     │ type        │     │ receiver_id │                   │
│  │ code        │     │ content     │     │ content     │                   │
│  │ score       │     │ blob_url    │     │ created_at  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### MongoDB Schema (Essays)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                MongoDB                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         essays                                   │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │ {                                                                │       │
│  │   _id: ObjectId,                                                 │       │
│  │   userId: String,                                                │       │
│  │   sessionId: String,                                             │       │
│  │   prompt: String,                                                │       │
│  │   university: String,                                            │       │
│  │   stages: [                                                      │       │
│  │     {                                                            │       │
│  │       name: "topic_analysis",                                    │       │
│  │       output: String,                                            │       │
│  │       approved: Boolean,                                         │       │
│  │       feedback: String,                                          │       │
│  │       completedAt: Date                                          │       │
│  │     },                                                           │       │
│  │     // ... 5 more stages                                         │       │
│  │   ],                                                             │       │
│  │   finalEssay: String,                                            │       │
│  │   wordCount: Number,                                             │       │
│  │   comments: [{                                                   │       │
│  │     position: Number,                                            │       │
│  │     text: String,                                                │       │
│  │     resolved: Boolean                                            │       │
│  │   }],                                                            │       │
│  │   createdAt: Date,                                               │       │
│  │   updatedAt: Date                                                │       │
│  │ }                                                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                  essayCollaborationDrafts                        │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │ {                                                                │       │
│  │   _id: ObjectId,                                                 │       │
│  │   sessionId: String,                                             │       │
│  │   participants: [String],                                        │       │
│  │   currentStage: String,                                          │       │
│  │   sharedContent: String,                                         │       │
│  │   chatHistory: [{                                                │       │
│  │     userId: String,                                              │       │
│  │     message: String,                                             │       │
│  │     timestamp: Date                                              │       │
│  │   }]                                                             │       │
│  │ }                                                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Redis Data Structures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                Redis                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Session Cache                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ session:{sessionId}                                              │       │
│  │ {                                                                │       │
│  │   userId: "user_123",                                            │       │
│  │   role: "teacher",                                               │       │
│  │   expiresAt: 1704067200                                          │       │
│  │ }                                                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  AI Quota Tracking                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ ai_quota:{userId}:{tool}                                         │       │
│  │ {                                                                │       │
│  │   used: 5,                                                       │       │
│  │   limit: 10,                                                     │       │
│  │   resetAt: 1704153600                                            │       │
│  │ }                                                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  BullMQ Job Queue                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ bull:essay-generation:waiting                                    │       │
│  │ bull:essay-generation:active                                     │       │
│  │ bull:essay-generation:completed                                  │       │
│  │ bull:essay-generation:failed                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Real-time Presence                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ presence:{roomId}                                                │       │
│  │ Set: ["user_123", "user_456", "user_789"]                        │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Real-Time Communication

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WebSocket Router                                    │
│                      (websocketRouter.js)                                   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Live Session │       │    Terminal   │       │Essay Collab   │
│   Handler     │       │    Handler    │       │   Handler     │
│               │       │               │       │               │
│ - Code share  │       │ - Shell exec  │       │ - Content sync│
│ - Video       │       │ - Output      │       │ - Comments    │
│ - Participants│       │ - Input       │       │ - Chat        │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Socket.io Server   │
                    │                       │
                    │  - Room management    │
                    │  - Event broadcasting │
                    │  - Connection pooling │
                    └───────────────────────┘
```

### WebSocket Event Flow

```
Client A                    Server                    Client B
   │                          │                          │
   │  connect                 │                          │
   │─────────────────────────▶│                          │
   │                          │                          │
   │  join_room(roomId)       │                          │
   │─────────────────────────▶│                          │
   │                          │  join_room(roomId)       │
   │                          │◀─────────────────────────│
   │                          │                          │
   │  user_joined(userB)      │                          │
   │◀─────────────────────────│                          │
   │                          │                          │
   │  send_message(data)      │                          │
   │─────────────────────────▶│                          │
   │                          │  broadcast(data)         │
   │                          │─────────────────────────▶│
   │                          │                          │
   │  code_update(code)       │                          │
   │─────────────────────────▶│                          │
   │                          │  code_sync(code)         │
   │                          │─────────────────────────▶│
   │                          │                          │
```

### Essay Collaboration WebSocket Events

```javascript
// Event Types (essayCollabWebSocket.js)
const EVENTS = {
  // Pipeline Control
  START_PIPELINE: 'start_pipeline',
  APPROVE_STAGE: 'approve_stage',
  REQUEST_REVISION: 'request_revision',

  // Content Sync
  ESSAY_CONTENT_SYNC: 'essay_content_sync',
  STAGE_OUTPUT_UPDATE: 'stage_output_update',

  // Collaboration
  COMMENT_ADDED: 'comment_added',
  COMMENT_RESOLVED: 'comment_resolved',
  CHAT_MESSAGE: 'chat_message',

  // Presence
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  CURSOR_UPDATE: 'cursor_update'
};
```

---

## Human-in-Loop Feedback System

### Feedback Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Agent Execution                                   │
│                                                                             │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐             │
│   │ Agent 1 │────▶│ Agent 2 │────▶│ Agent 3 │────▶│ Agent N │             │
│   └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘             │
│        │               │               │               │                   │
│        ▼               ▼               ▼               ▼                   │
│   ┌─────────────────────────────────────────────────────────────┐         │
│   │                 Human Feedback Gateway                       │         │
│   │                                                             │         │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐              │         │
│   │   │  Preview  │  │  Feedback │  │  Actions  │              │         │
│   │   │  Widget   │  │   Form    │  │  Buttons  │              │         │
│   │   │           │  │           │  │           │              │         │
│   │   │ • Output  │  │ • Rating  │  │ • Approve │              │         │
│   │   │ • Diff    │  │ • Comment │  │ • Reject  │              │         │
│   │   │ • Compare │  │ • Request │  │ • Edit    │              │         │
│   │   └───────────┘  └───────────┘  └───────────┘              │         │
│   │                                                             │         │
│   └─────────────────────────────┬───────────────────────────────┘         │
│                                 │                                          │
│                                 ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐         │
│   │                 Feedback Processing                          │         │
│   │                                                             │         │
│   │   if (approved) → Continue to next agent                    │         │
│   │   if (rejected) → Re-run agent with feedback context        │         │
│   │   if (edited)   → Merge edits and continue                  │         │
│   │                                                             │         │
│   └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feedback Data Model

```typescript
interface HumanFeedback {
  // Core metadata
  sessionId: string;
  agentName: string;
  stageIndex: number;
  timestamp: Date;

  // User action
  action: 'approve' | 'reject' | 'edit';

  // Feedback content
  rating?: 'positive' | 'negative';
  comment?: string;
  specificRequests?: string[];

  // For edit action
  editedContent?: string;
  editDiff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };

  // Iteration tracking
  iterationNumber: number;
  previousFeedback?: HumanFeedback[];
}
```

---

## Microservice Communication

### Service Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Communication Patterns                                │
└─────────────────────────────────────────────────────────────────────────────┘

1. Synchronous (REST)
┌──────────┐  HTTP/JSON  ┌──────────┐  HTTP/JSON  ┌──────────┐
│  Client  │────────────▶│  Express │────────────▶│  Claude  │
│          │◀────────────│  Server  │◀────────────│   API    │
└──────────┘             └──────────┘             └──────────┘

2. Asynchronous (WebSocket)
┌──────────┐    WS     ┌──────────┐    WS     ┌──────────┐
│ Client A │◀────────▶│  Socket  │◀────────▶│ Client B │
│          │          │  Server  │          │          │
└──────────┘          └──────────┘          └──────────┘

3. Event-Driven (BullMQ)
┌──────────┐  enqueue  ┌──────────┐  process  ┌──────────┐
│  API     │──────────▶│  Redis   │◀──────────│  Worker  │
│ Handler  │           │  Queue   │           │          │
└──────────┘           └──────────┘           └────┬─────┘
                                                   │
                                                   ▼
                                            ┌──────────┐
                                            │ Callback │
                                            │  (WS)    │
                                            └──────────┘

4. Pub/Sub (Socket.io Rooms)
┌──────────┐  publish  ┌──────────┐  subscribe ┌──────────┐
│ Service  │──────────▶│  Room    │◀───────────│ Clients  │
│          │          │  Manager │            │  (N)     │
└──────────┘          └──────────┘            └──────────┘
```

### API Gateway Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (Express)                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         Middleware Pipeline                      │       │
│  │                                                                 │       │
│  │  Request → CORS → Auth → RateLimit → Validate → Route          │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         Route Groups                             │       │
│  │                                                                 │       │
│  │  /api/auth/*           → Auth Controller                        │       │
│  │  /api/courses/*        → Course Controller                      │       │
│  │  /api/sessions/*       → Session Controller                     │       │
│  │  /api/essays/*         → Essay Controller                       │       │
│  │  /api/ai/*             → AI Service Router                      │       │
│  │  /ws/*                 → WebSocket Upgrade                      │       │
│  │                                                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JWT Authentication Flow                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. Login
┌──────────┐  credentials  ┌──────────┐  validate  ┌──────────┐
│  Client  │──────────────▶│  Auth    │───────────▶│PostgreSQL│
│          │               │ Service  │            │          │
│          │◀──────────────│          │◀───────────│          │
│          │    JWT token  │          │    user    │          │
└──────────┘               └──────────┘            └──────────┘

2. Protected Request
┌──────────┐  JWT Header   ┌──────────┐  verify    ┌──────────┐
│  Client  │──────────────▶│   Auth   │───────────▶│Protected │
│          │               │Middleware│            │ Resource │
│          │◀──────────────│          │◀───────────│          │
│          │   response    │          │   data     │          │
└──────────┘               └──────────┘            └──────────┘

3. Token Refresh
┌──────────┐ refresh token ┌──────────┐  new JWT   ┌──────────┐
│  Client  │──────────────▶│  Auth    │───────────▶│  Client  │
│          │               │ Service  │            │          │
└──────────┘               └──────────┘            └──────────┘
```

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Security Layers                                    │
│                                                                             │
│  Layer 1: Transport Security                                                │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • TLS 1.3 encryption                                           │       │
│  │  • HTTPS only in production                                     │       │
│  │  • WSS for WebSocket                                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Layer 2: API Gateway                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • CORS configuration                                           │       │
│  │  • Rate limiting (express-rate-limit)                           │       │
│  │  • Request validation                                           │       │
│  │  • Input sanitization                                           │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Layer 3: Authentication                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • JWT tokens (HS256)                                           │       │
│  │  • bcrypt password hashing                                      │       │
│  │  • Session management (Redis)                                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Layer 4: Authorization                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • Role-based access control (RBAC)                             │       │
│  │  • Resource-level permissions                                   │       │
│  │  • AI quota enforcement                                         │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Layer 5: Code Execution Sandbox                                            │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • Docker container isolation                                   │       │
│  │  • Judge0 sandboxed execution                                   │       │
│  │  • Resource limits (CPU, memory, time)                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Production Architecture                               │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   CloudFlare    │
                              │      DNS        │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │    Vercel     │  │     AWS       │  │    Azure      │
           │   (Frontend)  │  │    (API)      │  │   (Storage)   │
           │               │  │               │  │               │
           │ React + Vite  │  │ Elastic       │  │ Blob Storage  │
           │ Static Files  │  │ Beanstalk     │  │               │
           └───────────────┘  └───────┬───────┘  └───────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │   AWS RDS     │  │AWS ElastiCache│  │  MongoDB      │
           │  PostgreSQL   │  │    Redis      │  │   Atlas       │
           └───────────────┘  └───────────────┘  └───────────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                              ┌───────▼───────┐
                              │    Agora      │
                              │   (Video)     │
                              └───────────────┘
```

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Pipeline                                     │
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Push   │───▶│  Test   │───▶│  Build  │───▶│ Deploy  │───▶│ Monitor │  │
│  │         │    │         │    │         │    │         │    │         │  │
│  │ GitHub  │    │ Jest    │    │ Vite    │    │ Vercel  │    │ Sentry  │  │
│  │         │    │ Mocha   │    │ npm     │    │ AWS EB  │    │ Logs    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

CoreZenith's architecture is designed for:

1. **Scalability** - Microservices allow independent scaling of components
2. **Maintainability** - Clear separation of concerns and modular design
3. **Real-time Performance** - WebSocket-first approach for live features
4. **AI Integration** - Flexible LLM provider layer supporting multiple providers
5. **Human Oversight** - Human-in-loop feedback at every AI decision point
6. **Security** - Multi-layered security with sandboxed code execution

For questions about specific components, see the related documentation:
- [AI_TOOLS.md](./AI_TOOLS.md) - Detailed AI tool documentation
- [guides/](./guides/) - Setup and configuration guides
