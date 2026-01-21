# Collaborative Essay Writing System - Discovery Report

## Executive Summary

This report analyzes the existing CoreZenith codebase to determine the integration strategy for a new **Collaborative Essay Writing System** with multi-agent LangGraph pipeline and human-in-the-loop checkpoints.

---

## 1. EXISTING ARCHITECTURE OVERVIEW

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 18.2 + TypeScript 5.2 | Vite build, strict mode |
| **State Management** | Zustand + React Context | Minimal boilerplate |
| **UI** | Radix UI + Tailwind CSS | Accessible primitives |
| **Backend** | Node.js + Express | No ORM for PostgreSQL |
| **Databases** | PostgreSQL (Neon) + MongoDB (Mongoose) + Redis (Upstash) | Hybrid approach |
| **Auth** | JWT (5hr expiry) + bcrypt | localStorage token storage |
| **Real-time** | WebSocket + Socket.IO + Liveblocks | Multiple transport layers |

---

## 2. EXISTING WEBSOCKET IMPLEMENTATIONS

### 2.1 Main Collaboration WebSocket
**File:** `educators-edge-backend/services/websocketHandler.js`

- **Purpose:** Live tutoring, code editing, essay editing, whiteboard
- **Path:** `/ws`, `/ws/collaboration`
- **Auth:** JWT token via query parameter
- **Session Storage:** In-memory Map with client Sets

**Existing Essay Message Types:**
```javascript
ESSAY_CONTENT_UPDATE    // Broadcast essay text changes
ESSAY_CURSOR_UPDATE     // Share cursor positions
ESSAY_SAVE_REQUEST      // Save essay
ESSAY_HOMEWORK_ASSIGNED // Assign essay homework
ESSAY_COMMENT_ADDED     // Comment on essay
SESSION_MODE_SET        // Switch between 'code' and 'essay' mode
```

### 2.2 Terminal WebSocket
**File:** `educators-edge-backend/services/websocketTerminalHandler.js`
- **Path:** `/terminal`
- **Purpose:** Docker terminal, code execution

### 2.3 Socket.IO (Notifications)
**File:** `educators-edge-backend/src/handlers/sessionNotificationHandler.js`
- **Path:** `/socket.io`
- **Purpose:** Session lifecycle notifications

### 2.4 Liveblocks (Document Collaboration)
**Files:**
- Backend: `educators-edge-backend/controllers/liveblocksController.js`
- Frontend: `educators-edge-frontend/src/lib/liveblocks.ts`
- **Purpose:** CRDT-based real-time document sync
- **Auth:** JWT → Liveblocks session with FULL_ACCESS

### 2.5 WebSocket Router
**File:** `educators-edge-backend/src/services/websocketRouter.js`
- Routes HTTP upgrade requests to appropriate WebSocket server

---

## 3. EXISTING ESSAY WRITING FEATURE

### 3.1 Database Model (MongoDB)
**File:** `educators-edge-backend/models/Essay.js`

```javascript
{
  userId: String,              // PostgreSQL user ID as string
  prompt: String,              // Essay prompt
  university: String,          // Target university
  essayType: String,           // default: 'common_app'
  wordCount: Number,           // Target: 650
  actualWordCount: Number,
  status: ['processing', 'complete', 'failed'],
  essayText: String,           // Generated essay
  critique: String,            // AI feedback
  qualityScore: Number,        // 0-10
  generationTime: Number,      // Seconds
  studentProfile: {
    name, background, experiences, satVerbal, voiceCharacteristics
  }
}
```

### 3.2 Current 6-Agent Pipeline
**File:** `educators-edge-backend/services/claude-essay.service.js`

```
Agent 1: Profile Analyzer    → Student strengths & story angles
Agent 2: University Expert   → University values & expectations
Agent 3: Creative Strategist → 3 unique essay angles
Agent 4: Structure Architect → Detailed outline
Agent 5: Master Writer       → Complete draft
Agent 6: Quality Critic      → Critique + refinement to 9.5/10
```

- **Model:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Pattern:** Sequential, no human-in-the-loop
- **Storage:** Final essay only (no intermediate states)

### 3.3 API Endpoints
**File:** `educators-edge-backend/routes/essay.routes.js`

```
GET    /api/essays/universities     (public)
POST   /api/essays/generate         (auth required)
GET    /api/essays/stats
GET    /api/essays/:id
GET    /api/essays
DELETE /api/essays/:id
```

### 3.4 Frontend Components
**Location:** `educators-edge-frontend/src/components/essay/` and `/pages/EssayGenerator/`

| Component | Purpose |
|-----------|---------|
| `ConversationalEssayGenerator.tsx` | ChatGPT-style interface with agent progress |
| `EssayGenerator.tsx` | Form-based generation |
| `EssayList.tsx` | Essay dashboard with filters |
| `EssayView.tsx` | Display essay + critique |

---

## 4. EXISTING CODE COLLABORATION FEATURE

### 4.1 Session Management
**Database:** PostgreSQL `dual_mode_sessions` + `session_participants`

```sql
dual_mode_sessions: id, teacher_id, title, session_mode, status
session_participants: session_id, user_id, role, joined_at, status
```

### 4.2 Real-time Sync Architecture
**Hybrid Three-Layer System:**

1. **Liveblocks** → Document content sync (CRDT)
2. **Socket.IO** → Session lifecycle, permissions, workspace events
3. **Raw WebSocket** → Low-latency code/essay updates, cursor positions

### 4.3 Permission Model
- **Both teacher and student can edit** (FULL_ACCESS in Liveblocks)
- **Teacher-only:** Create/end session, monitor, assign homework, manage permissions
- **Presence:** Cursor tracking via Liveblocks + WebSocket

---

## 5. DATABASE ARCHITECTURE

### 5.1 PostgreSQL (via raw `pg` driver)
**Connection:** Neon cloud, pooled (max 3 connections)
**ORM:** None - raw SQL queries

**Key Tables:**
- `users` - Auth, roles, subscription tier
- `user_profiles` - Extended profile data
- `dual_mode_sessions` - Session metadata
- `session_participants` - Who's in each session
- `essay_collaboration_sessions` - Real-time essay state
- `essay_comments` - Inline comments
- `session_chat_messages` - Chat history

### 5.2 MongoDB (Mongoose)
- `Essay` model - Generated essays
- `SessionRecording` model - Recording metadata

### 5.3 Redis (Upstash)
- Session caching
- BullMQ job queues

---

## 6. AUTHENTICATION SYSTEM

### 6.1 Flow
1. Login → bcrypt password verify → JWT signed with `JWT_SECRET`
2. Token stored in `localStorage`
3. Axios interceptor attaches `Authorization: Bearer {token}`
4. Backend middleware decodes and attaches `req.user`

### 6.2 JWT Payload
```javascript
{
  user: {
    id: number,
    username: string,
    role: 'teacher' | 'student'
  }
}
```

### 6.3 WebSocket Auth
- Token passed as URL query: `?token=xxx`
- Verified on connection upgrade

---

## 7. FRONTEND ARCHITECTURE

### 7.1 Routing
**Library:** React Router v6
**Pattern:** `AppLayout` wrapper for authenticated routes

### 7.2 State Management
- **Zustand:** Lightweight stores (e.g., `useApeStore`)
- **Context:** User auth state from App.tsx
- **localStorage:** Token persistence

### 7.3 Real-time Hooks
- `sessionWebSocketService.ts` - Singleton WebSocket manager
- `useLiveblocksExtension` - TipTap editor collaboration
- Custom hooks for trading, portfolio, etc.

---

## 8. WHAT CAN BE REUSED

### 8.1 Fully Reusable
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| JWT Auth middleware | `middleware/authMiddleware.js` | Use as-is |
| WebSocket Router | `services/websocketRouter.js` | Add new path |
| Liveblocks setup | `lib/liveblocks.ts` + controller | Extend for essay rooms |
| UI components | `components/ui/*` | Use Radix primitives |
| API client | `services/apiClient.ts` | Use axios instance |
| Essay MongoDB model | `models/Essay.js` | Extend or create new model |
| Claude essay service | `services/claude-essay.service.js` | Refactor into LangGraph agents |

### 8.2 Partially Reusable (Needs Extension)
| Component | Changes Needed |
|-----------|----------------|
| `websocketHandler.js` | Add new message types for essay collaboration stages |
| `dual_mode_sessions` table | Add essay-specific fields or create new table |
| `ConversationalEssayGenerator.tsx` | Heavy refactor for real-time collaboration |
| Socket.IO notifications | Add essay approval notifications |

### 8.3 Build Fresh
| Component | Reason |
|-----------|--------|
| LangGraph pipeline | New architecture with checkpoints |
| Essay session WebSocket manager | Specialized for approval flow |
| Human-in-the-loop UI | New approval/reject/edit controls |
| Stage progress component | New 6-stage visualization |
| PostgreSQL essay tables | New schema for sessions, states, drafts |

---

## 9. RECOMMENDED INTEGRATION APPROACH

### 9.1 Database Strategy

**Option A (Recommended): Hybrid PostgreSQL + MongoDB**
- **PostgreSQL:** `essay_sessions`, `essay_states`, `essay_comments`, `essay_messages`
- **MongoDB:** Keep existing `Essay` model for final essays, add `EssayDraft` for versions

**Rationale:**
- PostgreSQL for relational data (sessions, approvals, users)
- MongoDB for large text documents (drafts, agent outputs)
- Matches existing pattern in codebase

### 9.2 WebSocket Strategy

**Option A (Recommended): Extend existing `websocketHandler.js`**
- Add new message types for essay collaboration
- Reuse session/room management
- Add essay-specific broadcast methods

**Option B: Dedicated Essay WebSocket**
- Cleaner separation
- More complex routing
- Not recommended due to existing complexity

### 9.3 LangGraph Integration

**Approach: Node.js with `@langchain/langgraph`**
- Use TypeScript LangGraph library
- PostgreSQL checkpointer for state persistence
- Interrupt on approval nodes
- Resume via WebSocket trigger

```
┌─────────────────────────────────────────────────────────┐
│                    LangGraph Pipeline                   │
├─────────────────────────────────────────────────────────┤
│  topic_analyzer → [CHECKPOINT] → researcher → ...       │
│        ↑              │                                 │
│        │         WebSocket                              │
│        │         broadcast                              │
│        │              ↓                                 │
│  [RESUME]    ← Teacher approves via WS                 │
└─────────────────────────────────────────────────────────┘
```

### 9.4 Frontend Strategy

**Extend ConversationalEssayGenerator pattern:**
- Add collaborative mode with WebSocket connection
- Real-time presence via Liveblocks
- Approval controls at each checkpoint
- Split view: Agent output | Essay editor

---

## 10. POTENTIAL CONFLICTS & REFACTORING

### 10.1 Conflicts to Address

| Area | Conflict | Resolution |
|------|----------|------------|
| Essay model | Current model is for single-user generation | Create new `EssaySession` model, keep existing for solo mode |
| WebSocket sessions | Current session structure assumes code/essay toggle | Extend to support dedicated essay collaboration mode |
| Liveblocks rooms | Currently generic room IDs | Namespace essay rooms: `essay-session-{id}` |

### 10.2 Required Refactoring

1. **Claude Essay Service** → Refactor into discrete LangGraph nodes
2. **Essay routes** → Add session CRUD endpoints alongside existing generate
3. **WebSocket handler** → Add essay session room management
4. **Frontend essay components** → Create collaborative variants

### 10.3 Migration Path

```
Phase 1: Database schema (new tables, don't modify existing)
Phase 2: LangGraph pipeline (standalone, testable)
Phase 3: WebSocket integration (new message types)
Phase 4: REST API (new endpoints)
Phase 5: Frontend workspace (new components)
Phase 6: Integration testing
```

---

## 11. ENVIRONMENT VARIABLES NEEDED

```bash
# Existing (already configured)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
MONGO_URI=mongodb://...
JWT_SECRET=...
LIVEBLOCKS_SECRET_KEY=...

# New (may need to add)
LANGGRAPH_CHECKPOINT_DB=postgresql://...  # Can reuse DATABASE_URL
ESSAY_AGENT_MODEL=claude-sonnet-4-20250514
```

---

## 12. QUESTIONS TO CLARIFY

1. **Solo vs Collaborative:** Should solo essay generation still work, or only collaborative?
2. **Who approves?** Teacher only, or can students also approve certain stages?
3. **Essay persistence:** After session ends, where does the final essay go?
4. **Video/Audio:** Include Agora video during essay collaboration sessions?
5. **Mobile support:** Required for initial release?

---

## 13. RECOMMENDED IMPLEMENTATION ORDER

```
1. Database Schema & Migrations
   └─ Create PostgreSQL tables: essay_sessions, essay_states, essay_drafts, essay_comments, essay_messages
   └─ Run migrations

2. LangGraph Pipeline (Backend)
   └─ Install @langchain/langgraph
   └─ Create agent nodes (refactor from claude-essay.service.js)
   └─ Add PostgreSQL checkpointer
   └─ Test pipeline in isolation

3. REST API Endpoints
   └─ Session CRUD
   └─ Pipeline control (start, approve, reject, edit)
   └─ Comments, drafts, export

4. WebSocket Integration
   └─ Add essay session message types
   └─ Connect LangGraph events to WebSocket broadcasts
   └─ Approval flow via WebSocket

5. Frontend Components
   └─ EssayWorkspace container
   └─ StageProgress visualization
   └─ AgentPanel with approval controls
   └─ Collaborative EssayEditor (TipTap + Liveblocks)
   └─ ChatPanel

6. Integration & Polish
   └─ End-to-end testing
   └─ Error handling
   └─ Edge cases (reconnection, concurrent edits)
```

---

## 14. ESTIMATED COMPLEXITY

| Component | Complexity | Est. Files |
|-----------|------------|------------|
| Database schema | Low | 2-3 migration files |
| LangGraph pipeline | High | 8-10 files (pipeline + 6 agents) |
| WebSocket integration | Medium | 2-3 files |
| REST API | Medium | 2-3 files |
| Frontend workspace | High | 15-20 components |
| **Total** | **High** | **~35-40 files** |

---

## 15. APPROVAL REQUESTED

Please review this discovery report and confirm:

1. **Database approach:** Hybrid PostgreSQL + MongoDB acceptable?
2. **WebSocket approach:** Extend existing handler vs. new dedicated handler?
3. **LangGraph in Node.js:** Confirm TypeScript LangGraph vs. Python bridge?
4. **Liveblocks for essay content:** Continue using for real-time sync?
5. **Scope clarifications:** Answers to questions in Section 12?

**Awaiting your approval before proceeding to Step 2 (Database Schema Design).**

---

*Report generated: January 2025*
*Codebase analyzed: educators-edge-backend + educators-edge-frontend*
