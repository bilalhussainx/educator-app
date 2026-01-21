/**
 * Essay Collaboration Service
 *
 * Frontend API service for the multi-agent collaborative essay writing system.
 */

import apiClient from './apiClient';
import { io, Socket } from 'socket.io-client';

// Types
export interface EssaySession {
  id: string;
  teacherId: number;
  studentId: number | null;
  essayPrompt: string;
  university: string | null;
  targetWordCount: number;
  studentProfile: Record<string, any>;
  currentStage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageState {
  id: number;
  session_id: string;
  stage: string;
  stage_order: number;
  agent_output: any;
  approval_status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  teacher_feedback: string | null;
  student_feedback: string | null;
  edited_output: any | null;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: number;
  session_id: string;
  version: number;
  content: string;
  word_count: number;
  source_stage: string;
  created_by: number | null;
  creation_type: 'agent' | 'human' | 'ai_assisted';
  created_at: string;
}

export interface Comment {
  id: number;
  session_id: string;
  user_id: number;
  username: string;
  selection_start: number | null;
  selection_end: number | null;
  selected_text: string | null;
  content: string;
  resolved: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  user_id: number | null;
  username: string | null;
  message_type: string;
  content: string;
  metadata: any;
  created_at: string;
}

export interface SessionState {
  session: EssaySession;
  stages: StageState[];
  drafts: Draft[];
  comments: Comment[];
  messages: ChatMessage[];
  agentOutputs: Record<string, any>;
  currentContent: string;
}

export const STAGES = {
  NOT_STARTED: 'not_started',
  TOPIC_ANALYSIS: 'topic_analysis',
  RESEARCH: 'research',
  OUTLINE: 'outline',
  DRAFT: 'draft',
  EDITING: 'editing',
  POLISH: 'polish',
  COMPLETE: 'complete'
} as const;

export const STAGE_LABELS: Record<string, string> = {
  [STAGES.NOT_STARTED]: 'Not Started',
  [STAGES.TOPIC_ANALYSIS]: 'Topic Analysis',
  [STAGES.RESEARCH]: 'Research',
  [STAGES.OUTLINE]: 'Outline',
  [STAGES.DRAFT]: 'Draft',
  [STAGES.EDITING]: 'Editing',
  [STAGES.POLISH]: 'Polish',
  [STAGES.COMPLETE]: 'Complete'
};

export const STAGE_ORDER = [
  STAGES.TOPIC_ANALYSIS,
  STAGES.RESEARCH,
  STAGES.OUTLINE,
  STAGES.DRAFT,
  STAGES.EDITING,
  STAGES.POLISH
];

// Session Management
export async function createSession(data: {
  studentId?: number;
  essayPrompt: string;
  university?: string;
  targetWordCount?: number;
  studentProfile?: Record<string, any>;
}): Promise<EssaySession> {
  const response = await apiClient.post('/api/essay-collab/sessions', data);
  return response.data.session;
}

export async function listSessions(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<EssaySession[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));

  const response = await apiClient.get(`/api/essay-collab/sessions?${params.toString()}`);
  return response.data.sessions;
}

export async function getSession(sessionId: string): Promise<SessionState> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}`);
  const state = response.data.state || {};
  return {
    session: response.data.session,
    stages: state.stages || [],
    drafts: state.drafts || [],
    comments: state.comments || [],
    messages: state.messages || [],
    agentOutputs: state.agentOutputs || {},
    currentContent: state.currentContent || ''
  };
}

export async function updateSession(sessionId: string, data: Partial<{
  essayPrompt: string;
  university: string;
  targetWordCount: number;
  studentProfile: Record<string, any>;
  studentId: number;
}>): Promise<EssaySession> {
  const response = await apiClient.put(`/api/essay-collab/sessions/${sessionId}`, data);
  return response.data.session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/essay-collab/sessions/${sessionId}`);
}

// Pipeline Control
export async function startPipeline(sessionId: string): Promise<{ currentStage: string; awaitingApproval: boolean }> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/start`);
  return response.data.state;
}

export async function approveStage(sessionId: string, data?: {
  feedback?: string;
  editedOutput?: any;
}): Promise<{ currentStage: string; awaitingApproval: boolean }> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/approve`, data);
  return response.data.state;
}

export async function requestRevision(sessionId: string, feedback: string): Promise<{ currentStage: string; awaitingApproval: boolean }> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/revise`, { feedback });
  return response.data.state;
}

export async function pauseSession(sessionId: string): Promise<void> {
  await apiClient.post(`/api/essay-collab/sessions/${sessionId}/pause`);
}

export async function resumeSession(sessionId: string): Promise<SessionState> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/resume`);
  return response.data.state;
}

// Stage Data
export async function getStages(sessionId: string): Promise<StageState[]> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/stages`);
  return response.data.stages;
}

export async function getStage(sessionId: string, stage: string): Promise<StageState> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/stages/${stage}`);
  return response.data.stage;
}

export async function editStageOutput(sessionId: string, stage: string, editedOutput: any): Promise<void> {
  await apiClient.put(`/api/essay-collab/sessions/${sessionId}/stages/${stage}/edit`, { editedOutput });
}

// Drafts
export async function getDrafts(sessionId: string): Promise<Draft[]> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/drafts`);
  return response.data.drafts;
}

export async function saveDraft(sessionId: string, content: string, stage?: string): Promise<Draft> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/drafts`, { content, stage });
  return response.data.draft;
}

export async function getLatestDraft(sessionId: string): Promise<Draft | null> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/drafts/latest`);
  return response.data.draft;
}

// Comments
export async function getComments(sessionId: string): Promise<Comment[]> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/comments`);
  return response.data.comments;
}

export async function addComment(sessionId: string, data: {
  startOffset?: number;
  endOffset?: number;
  content: string;
  highlightedText?: string;
  draftId?: number;
  commentType?: string;
}): Promise<Comment> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/comments`, data);
  return response.data.comment;
}

export async function resolveComment(sessionId: string, commentId: number): Promise<void> {
  await apiClient.put(`/api/essay-collab/sessions/${sessionId}/comments/${commentId}/resolve`);
}

export async function deleteComment(sessionId: string, commentId: number): Promise<void> {
  await apiClient.delete(`/api/essay-collab/sessions/${sessionId}/comments/${commentId}`);
}

// Messages
export async function getMessages(sessionId: string, options?: {
  limit?: number;
  before?: string;
}): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.before) params.append('before', options.before);

  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/messages?${params.toString()}`);
  return response.data.messages;
}

export async function sendMessage(sessionId: string, content: string, metadata?: any): Promise<ChatMessage> {
  const response = await apiClient.post(`/api/essay-collab/sessions/${sessionId}/messages`, { content, metadata });
  return response.data.message;
}

export async function addStudentFeedback(sessionId: string, feedback: string): Promise<void> {
  await apiClient.post(`/api/essay-collab/sessions/${sessionId}/feedback`, { feedback });
}

// Export
export async function exportEssay(sessionId: string, format: 'json' | 'text' = 'json'): Promise<{
  content: string;
  wordCount: number;
  prompt: string;
  university: string | null;
}> {
  const response = await apiClient.get(`/api/essay-collab/sessions/${sessionId}/export?format=${format}`);
  return response.data.essay;
}

// WebSocket Connection
export class EssayCollabSocket {
  private socket: Socket | null = null;
  private sessionId: string;
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): void {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
    const token = localStorage.getItem('authToken');

    this.socket = io(API_URL, {
      auth: { token },
      query: { sessionId: this.sessionId },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('[EssayCollab] WebSocket connected');
      this.socket?.emit('essay:join', { sessionId: this.sessionId });
    });

    this.socket.on('disconnect', () => {
      console.log('[EssayCollab] WebSocket disconnected');
    });

    // Forward essay events to handlers
    const events = [
      'essay:agent_started',
      'essay:agent_output',
      'essay:approval_requested',
      'essay:approval_response',
      'essay:stage_changed',
      'essay:pipeline_complete',
      'essay:pipeline_started',
      'essay:stage_complete',
      'essay:session_updated',
      'essay:state_sync',
      'essay:message',
      'essay:comment_added',
      'essay:comment_resolved',
      'essay:participant_joined',
      'essay:participant_left',
      'essay:draft_updated',
      'essay:typing',
      'essay:error'
    ];

    events.forEach(event => {
      this.socket?.on(event, (data: any) => {
        const eventName = event.replace('essay:', '');
        this.emit(eventName, data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('essay:leave', { sessionId: this.sessionId });
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  sendMessage(content: string): void {
    this.socket?.emit('essay:chat', {
      sessionId: this.sessionId,
      content
    });
  }

  sendTyping(): void {
    this.socket?.emit('essay:typing', {
      sessionId: this.sessionId
    });
  }

  sendDraftUpdate(content: string): void {
    this.socket?.emit('essay:draft_update', {
      sessionId: this.sessionId,
      content
    });
  }
}

export default {
  // Session
  createSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,

  // Pipeline
  startPipeline,
  approveStage,
  requestRevision,
  pauseSession,
  resumeSession,

  // Stages
  getStages,
  getStage,
  editStageOutput,

  // Drafts
  getDrafts,
  saveDraft,
  getLatestDraft,

  // Comments
  getComments,
  addComment,
  resolveComment,
  deleteComment,

  // Messages
  getMessages,
  sendMessage,
  addStudentFeedback,

  // Export
  exportEssay,

  // WebSocket
  EssayCollabSocket,

  // Constants
  STAGES,
  STAGE_LABELS,
  STAGE_ORDER
};
