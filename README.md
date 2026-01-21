# CoreZenith - AI-Enhanced Educational Platform

> Full-stack learning management system with 6 multi-agent AI tools providing intelligent assistance for students and educators

[🎥 Platform Demo](https://www.loom.com/share/1377b1b0829143d5901ec9afa780a535) | [📚 Documentation](./docs) | [🚀 Live Demo](https://educator-app.vercel.app/login)

### Video Demos

| Demo | Description | Link |
|------|-------------|------|
| **EssayMentor Standalone** | 6-agent essay generation system | [Watch Demo](https://www.loom.com/share/1377b1b0829143d5901ec9afa780a535) |
| **Human-in-Loop Demo** | Collaborative essay writing with feedback | [Watch Demo](https://www.loom.com/share/7972e0a42ab240608c6b53c3224f824d) |
| **Architecture Walkthrough** | System architecture deep dive | [Watch Demo](https://www.loom.com/share/76b5a27ae38347ce968ab60ab572848f) |

---

## 👀 For Recruiters & Technical Interviewers

**Looking to evaluate my skills? Start here:**

1. **AI/ML Skills**: See [EssayMentor technical deep-dive](link) - 6-agent LangGraph system
2. **Full-Stack Skills**: Review [architecture section](#architecture) - React + Node.js + PostgreSQL
3. **Code Quality**: Browse [backend services](./educators-edge-backend/services/) - 74 well-organized files
4. **Real-time Systems**: Check [WebSocket implementation](./educators-edge-backend/services/websocket*)
5. **Deployment**: Live demo at [https://educator-app.vercel.app](https://educator-app.vercel.app)

**Quick Stats:**
- 90+ React pages
- 74 backend services  
- 6 AI multi-agent systems
- 15+ API integrations
- Production-deployed

## 🎯 Overview

CoreZenith transforms traditional education with AI-powered tools that provide personalized, intelligent assistance while maintaining human oversight through our human-in-loop feedback system.

**What makes CoreZenith unique:**
- **6 specialized AI tools** built with multi-agent architectures
- **Real-time human feedback integration** at every AI decision point
- **Microservices architecture** for scalability and modularity
- **Production-ready LMS features** (courses, live classes, browser-based IDE)
- **Zero-cost AI inference** with local LLM support (Ollama)

---

## 🤖 AI-Powered Tools (6 Multi-Agent Systems)

### 1. **EssayMentor** - College Essay Generation
[Detailed repo](https://github.com/bilalhussainx/essaymentor-ai) | [Standalone Demo](https://www.loom.com/share/1377b1b0829143d5901ec9afa780a535) | [Human-in-Loop Demo](https://www.loom.com/share/7972e0a42ab240608c6b53c3224f824d) | [Architecture](https://www.loom.com/share/76b5a27ae38347ce968ab60ab572848f)

**Multi-Agent Architecture:**
```
Profile Analyzer → Researcher → Outline Architect → Draft Writer → Editor Critic → Final Polish
```

| Agent | Responsibility |
|-------|---------------|
| **Topic Analyzer** | Analyzes essay prompts and extracts key requirements |
| **Researcher** | Gathers information and context about the topic |
| **Outline Architect** | Creates detailed, structured essay outlines |
| **Draft Writer** | Writes initial essay draft with proper flow |
| **Editor Critic** | Provides feedback and identifies improvements |
| **Final Polish** | Refines language, ensures coherence, and polishes |

**Key Features:**
- Human-in-loop feedback at each pipeline stage
- Generates **8-8.5/10 quality** college admissions essays
- Real-time progress updates via WebSocket
- Quota management per user
- Target: 650-word optimized essays
- Supports multiple university prompts
- GPU-optimized local inference (Ollama) for zero-cost operation

**Human-in-Loop Integration:**
- Approval gates between each agent stage
- Request revision at any point
- Add inline comments and feedback
- Direct editing of stage outputs
- Real-time chat alongside editing

---

### 2. **AI Writing Coach** - Comprehensive Document Analysis

**Multi-Agent Architecture:**
```
Document Analyzer → Section Evaluator → Comment Generator → Priority Ranker → Feedback Synthesizer
```

**Capabilities:**
- Generates **30-50+ specific, actionable comments** per document
- Paragraph-by-paragraph deep analysis
- Comment distribution across entire document
- Category classification (grammar, structure, clarity, argument)
- Position tracking with line numbers
- Claude API integration with fallback analysis

**Human-in-Loop Features:**
- Real-time inline comment review
- Accept/reject individual suggestions
- Comment resolution tracking
- Iterative refinement based on user preferences

---

### 3. **AI Coding Supervisor** - Real-Time Session Guidance

**Multi-Agent Architecture:**
```
Code Analyzer → Difficulty Assessor → Hint Generator → Feedback Personalizer
```

**Personality Modes:**
| Mode | Teaching Style |
|------|---------------|
| **Encouraging** | Positive reinforcement, celebrates progress |
| **Socratic** | Questions to guide discovery |
| **Direct** | Clear, concise explanations |
| **Mentor** | Balanced guidance with context |

**Features:**
- Real-time coding session supervision
- Dynamic difficulty adaptation
- Configurable hint delay timing
- Code history tracking and analysis
- Mistake pattern recognition
- Progress monitoring and analytics

---

### 4. **AI Mentor Bot** - Intelligent Tutor Matching

**Multi-Agent Architecture:**
```
Request Classifier → Bot Matcher → Knowledge Retriever → Response Generator → Context Manager
```

**Capabilities:**
- Bot personality profiles with specialized knowledge bases
- Real-time session context management
- Dynamic matching based on request type and difficulty
- Specialization tracking per subject area
- Google Gemini 1.5 Pro integration
- Response caching for performance optimization

**Subject Specializations:**
- Mathematics & Problem Solving
- Programming & Computer Science
- Writing & Communication
- Science & Research Methods
- Test Preparation

---

### 5. **AI Course Generator** - Curriculum Creation System

**Multi-Agent Architecture:**
```
Topic Analyzer → Structure Designer → Content Generator → Problem Creator → Assessment Builder
```

**Capabilities:**
- Generates **Educative.io-style** structured courses
- LeetCode-style problem generation
- Pattern-based learning paths
- Multi-language support (JavaScript, Python, Java, C++)
- Progressive difficulty levels
- Real-world application examples
- Claude API integration

**Output Structure:**
```
Course
├── Modules (by concept)
│   ├── Lessons (theory + examples)
│   ├── Practice Problems (3 difficulty levels)
│   └── Assessments (quizzes + coding challenges)
└── Final Project
```

---

### 6. **AI Feedback Tutor** - Socratic Learning Assistant

**Multi-Agent Architecture:**
```
Code Evaluator → Concept Mapper → Hint Composer → Question Generator
```

**Capabilities:**
- Analyzes student code against lesson objectives
- Socratic questioning approach for deeper learning
- Concepts vs. correctness validation
- Conceptual hint generation (not direct answers)
- Robust error handling with graceful fallbacks
- Google Gemini integration

**Feedback Types:**
- Conceptual guidance
- Debugging hints
- Best practice suggestions
- Performance optimization tips
- Security vulnerability warnings

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  CoreZenith Frontend                        │
│            (React 18 + TypeScript + Vite)                   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │  Pages   │  │Components│  │  Stores  │  │ Services │   │
│   │  (90+)   │  │  (AI/UI) │  │ (Zustand)│  │  (API)   │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│              Node.js/Express API Gateway                     │
│      (Authentication, Routing, WebSocket, BullMQ)           │
└──┬─────────────┬─────────────┬─────────────┬────────────────┘
   │             │             │             │
   ▼             ▼             ▼             ▼
┌──────┐    ┌────────┐   ┌──────────┐   ┌───────────┐
│ LMS  │    │  User  │   │  AI      │   │  Real-    │
│ Core │    │  Mgmt  │   │  Services│   │  time     │
│      │    │        │   │  (15+)   │   │  (WS)     │
└──────┘    └────────┘   └────┬─────┘   └───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
      ┌──────────┐     ┌──────────┐     ┌──────────┐
      │  Claude  │     │  Gemini  │     │  Ollama  │
      │   API    │     │   API    │     │ (Local)  │
      └──────────┘     └──────────┘     └──────────┘
```

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Primary DB** | PostgreSQL | Users, courses, sessions, submissions |
| **Document DB** | MongoDB | Essays, AI outputs, collaboration |
| **Cache/Queue** | Redis + BullMQ | Session data, job queue |
| **File Storage** | Azure Blob Storage | Uploads, recordings |
| **Video** | Agora RTC SDK | Live classes, screen sharing |
| **Code Execution** | Judge0 + Docker | Sandboxed code running |
| **Real-time** | WebSocket + Socket.io | Live updates, collaboration |

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 🎨 Human-in-Loop Feedback System

Every AI tool includes human oversight through our unified feedback widget system.

### Feedback Widget Interface

```typescript
interface HumanFeedbackWidget {
  // Core Features
  realTimePreview: boolean;      // Live output preview
  thumbsRating: 'up' | 'down';   // Quick feedback
  detailedFeedback: string;      // Specific improvements
  regenerateWithFeedback: () => void;
  savePreferredOutput: () => void;
  iterationHistory: Output[];    // Track all versions

  // Essay-specific
  approvalGates: boolean;        // Stage-by-stage approval
  inlineComments: Comment[];     // Positional feedback
  revisionRequests: Request[];   // Rework requests

  // Code-specific
  hintAcceptance: boolean;       // Accept/reject hints
  difficultyOverride: number;    // Adjust AI difficulty
}
```

### Integration Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Pipeline                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              1. AI Agent Produces Output                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         2. Widget Displays Result + Feedback Options         │
│    ┌─────────────────────────────────────────────┐          │
│    │  Output Preview  │  👍 👎  │  [Feedback]    │          │
│    │  ─────────────────────────────────────────  │          │
│    │  [Approve] [Request Revision] [Edit Direct] │          │
│    └─────────────────────────────────────────────┘          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           3. User Provides Structured Feedback               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│        4. System Passes Feedback to Next Agent               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           5. Improved Output Generated                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              6. Repeat Until User Satisfied
```

---

## 🚀 Core LMS Features

### 👨‍🏫 For Teachers

| Feature | Description |
|---------|-------------|
| **Course Management** | Create, edit, organize courses with rich content |
| **Live Classes** | Real-time video with Agora SDK (50+ concurrent) |
| **Browser IDE** | Monaco Editor + XTerm.js for in-browser coding |
| **Code Environments** | Docker-sandboxed execution environments |
| **Student Analytics** | Track progress, engagement, and performance |
| **AI Tool Integration** | Embed AI assistants directly in lessons |
| **Assessment Tools** | Quizzes, assignments, automated grading |
| **Recording System** | Agora cloud + web page + screen share recording |
| **Scheduling** | Calendly integration for session booking |

### 👨‍🎓 For Students

| Feature | Description |
|---------|-------------|
| **Course Discovery** | Browse, search, and enroll in courses |
| **Live Sessions** | Join video classes with real-time interaction |
| **Interactive IDE** | Practice coding with instant feedback |
| **AI Assistance** | 6 specialized tools for learning support |
| **Progress Tracking** | Monitor achievements and milestones |
| **Collaboration** | Real-time document editing with peers |
| **Portfolio** | Showcase projects and achievements |
| **Resume Builder** | AI-powered resume optimization |

### 📊 Additional Features

- **Trading Terminal** - Stock market simulation with real-time data
- **LeetCode Integration** - Practice problems with test execution
- **Trust Graph** - Connection and collaboration visualization
- **Message System** - Real-time communication
- **Calendar Integration** - Session scheduling and reminders

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Radix UI | Component library |
| Zustand | State management |
| Monaco Editor | Code editing |
| XTerm.js | Terminal emulation |
| Agora RTC React SDK | Video streaming |
| Liveblocks + Yjs | Real-time collaboration |
| TipTap | Rich text editing |
| Three.js + GSAP | Visualizations |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express | API server |
| PostgreSQL | Primary database |
| MongoDB + Mongoose | Document storage |
| Redis + BullMQ | Caching & job queue |
| WebSocket + Socket.io | Real-time communication |
| JWT + bcrypt | Authentication |
| Azure Blob Storage | File storage |
| Docker + Dockerode | Container management |
| Judge0 | Code execution |

### AI Layer
| Technology | Purpose |
|------------|---------|
| Claude API (Anthropic) | Essay generation, course creation |
| Google Gemini 1.5 Pro | Bot service, feedback system |
| Ollama | Local LLM inference (zero-cost) |
| LangGraph | Agent orchestration |
| Python 3.11+ | AI microservices bridge |

---

## 📊 Performance & Scale

### AI Processing
| Metric | Value |
|--------|-------|
| Essay generation | 3-5 minutes (6 agents) |
| Document analysis | 30-60 seconds |
| Code feedback | < 2 seconds |
| Real-time updates | WebSocket (< 100ms) |
| AI costs | Zero (local inference available) |
| Concurrent AI jobs | Queue-managed via BullMQ |

### LMS Capabilities
| Metric | Value |
|--------|-------|
| Live video | 50+ concurrent users/session |
| Real-time code | Multiple simultaneous environments |
| Database | Optimized for 10k+ students |
| File uploads | Azure Blob with SAS tokens |
| WebSocket connections | Scalable via Redis adapter |

---

## 🔧 Installation & Setup

### Prerequisites

```bash
# Required
- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- Redis 6+
- Python 3.11+ (for AI bridges)

# Optional (for advanced features)
- MongoDB (essay collaboration)
- Docker (sandboxed code execution)
- NVIDIA GPU + CUDA (local AI inference)
- Ollama (zero-cost LLM)
```

### Quick Start

**1. Clone Repository**
```bash
git clone https://github.com/bilalhussainx/corezenith.git
cd corezenith
```

**2. Backend Setup**
```bash
cd educators-edge-backend
npm install
cp .env.example .env
# Configure environment variables (see below)
npm run migrate
npm run dev
```

**3. Frontend Setup**
```bash
cd educators-edge-frontend
npm install
cp .env.example .env.local
npm run dev
```

**4. AI Services Setup (Optional)**
```bash
# Install Ollama for local inference
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1

# Or configure Claude/Gemini API keys in .env
```

### Environment Variables

**Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/corezenith
MONGODB_URI=mongodb://localhost:27017/corezenith_essays

# Authentication
JWT_SECRET=your_secure_jwt_secret_here

# Redis
REDIS_URL=redis://localhost:6379

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_STORAGE_CONTAINER_NAME=uploads

# Agora (Live Video)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# AI Services
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://localhost:11434

# Code Execution
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=your_judge0_key
```

**Frontend (.env.local)**
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_AGORA_APP_ID=your_agora_app_id
VITE_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_key
```

---

## 🎓 Usage Examples

### For Students: Using EssayMentor

1. Navigate to **AI Tools** → **EssayMentor**
2. Complete the student profile questionnaire
3. Enter your essay prompt and university
4. Watch real-time agent progress (6 stages)
5. At each stage:
   - Review the agent's output
   - Approve to continue, or
   - Request revision with feedback
6. Add inline comments for specific improvements
7. Iterate until satisfied
8. Download final essay (PDF/DOCX)

### For Teachers: Creating AI-Enhanced Course

1. Go to **Course Management** → **Create Course**
2. Fill in course details and learning objectives
3. Use **AI Course Generator** to scaffold content:
   - Select topic and difficulty level
   - AI generates modules, lessons, problems
   - Review and customize generated content
4. Add interactive elements:
   - Embed code environments
   - Add AI tool widgets to lessons
5. Configure student AI quotas
6. Publish and monitor student AI interactions

---

## 📂 Project Structure

```
corezenith/
├── educators-edge-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ai/              # AI-specific UI components
│   │   │   ├── essay/           # Essay system components
│   │   │   ├── essayCollab/     # Collaboration components
│   │   │   ├── layout/          # Navigation, sidebar
│   │   │   └── ui/              # Radix UI components
│   │   ├── pages/               # 90+ page components
│   │   ├── services/            # API service layer
│   │   ├── stores/              # Zustand state stores
│   │   ├── lib/                 # Utilities, Liveblocks
│   │   └── types/               # TypeScript definitions
│   ├── public/
│   └── vite.config.ts
│
├── educators-edge-backend/
│   ├── controllers/             # Route handlers
│   ├── models/                  # Database models
│   ├── routes/                  # API routes
│   ├── services/                # 74 service files
│   │   ├── essayAgents/         # Multi-agent essay system
│   │   │   ├── agents/          # Individual agents
│   │   │   └── pipeline.js      # Orchestration
│   │   ├── ai*.js               # AI integrations
│   │   └── websocket*.js        # Real-time handlers
│   ├── middleware/              # Auth, validation
│   ├── migrations/              # Database migrations
│   ├── scripts/                 # Utility scripts
│   └── server.js
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── AI_TOOLS.md              # AI tools deep dive
│   └── guides/                  # Setup & usage guides
│
└── scripts/                     # Setup & utility scripts
```

---

## 🔐 User Roles & Permissions

### Administrator
- Full system access
- User management (create, edit, delete)
- AI quota allocation
- System configuration
- Analytics dashboard

### Teacher
- Course CRUD operations
- Live session hosting
- Student analytics
- AI tool configuration
- Assessment management
- Recording access

### Student
- Course enrollment
- AI tool usage (within quota)
- Live session participation
- Progress tracking
- Portfolio management
- Collaboration features

---

## 🧪 Testing

```bash
# Backend tests
cd educators-edge-backend
npm test

# Frontend tests
cd educators-edge-frontend
npm test

# AI service tests
cd educators-edge-backend
npm run test:ai

# Integration tests
npm run test:integration
```

---

## 🚀 Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://educator-app.vercel.app |
| Backend | AWS Elastic Beanstalk | API endpoint |
| Database | AWS RDS (PostgreSQL) | Internal |
| Cache | AWS ElastiCache (Redis) | Internal |
| Storage | Azure Blob | Internal |

See [docs/guides/AWS_DEPLOYMENT_GUIDE.md](./docs/guides/AWS_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

---

## 📈 Roadmap

### Q1 2026
- [ ] Expand to 10+ AI tools
- [ ] Implement vector DB for RAG
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

### Q2 2026
- [ ] Multi-language support (i18n)
- [ ] AI model fine-tuning on user data
- [ ] Advanced collaboration features
- [ ] Enterprise features (SSO, SAML)

### Q3 2026
- [ ] Marketplace for AI tools
- [ ] Plugin system for extensions
- [ ] Advanced proctoring features
- [ ] AI-powered grading automation

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

## 👨‍💻 Developer

**Bilal Hussain**
Senior Full-Stack AI Engineer

- [GitHub](https://github.com/bilalhussainx)

---

## 🔗 Related Repositories

- [EssayMentor AI](https://github.com/bilalhussainx/essaymentor-ai) - Multi-agent essay generation system
- [CoreZenith Documentation](./docs) - Full platform documentation

---

**Note:** This project was previously known as "Educators Edge" and has evolved into CoreZenith with enhanced AI capabilities and multi-agent architectures.
