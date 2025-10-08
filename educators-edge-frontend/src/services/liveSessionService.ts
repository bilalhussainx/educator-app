import { io, Socket } from 'socket.io-client';
import { DrawingAction } from '../components/classroom/CollaborativeWhiteboard';
import { Workspace, Participant } from '../components/classroom/WorkspaceManager';

interface LiveSessionEvents {
    // Session management
    'session:created': (session: LiveSession) => void;
    'session:joined': (participant: Participant) => void;
    'session:left': (participantId: string) => void;
    'session:ended': () => void;

    // Workspace management
    'workspace:created': (workspace: Workspace) => void;
    'workspace:joined': (workspaceId: string, participant: Participant) => void;
    'workspace:left': (workspaceId: string, participantId: string) => void;
    'workspace:updated': (workspace: Workspace) => void;

    // Whiteboard collaboration
    'whiteboard:action': (action: DrawingAction) => void;
    'whiteboard:cursor': (userId: string, cursor: { x: number; y: number }) => void;
    'whiteboard:clear': (workspaceId: string) => void;

    // Monitoring
    'monitor:started': (workspaceId: string, monitorUserId: string) => void;
    'monitor:stopped': (workspaceId: string, monitorUserId: string) => void;
    'monitor:data': (workspaceId: string, data: any) => void;

    // Communication
    'message:sent': (message: SessionMessage) => void;
    'typing:start': (userId: string, workspaceId: string) => void;
    'typing:stop': (userId: string, workspaceId: string) => void;

    // Permissions
    'permissions:updated': (workspaceId: string, userId: string, permissions: Participant['permissions']) => void;

    // Error handling
    'error': (error: { message: string; code?: string }) => void;
}

interface LiveSession {
    id: string;
    teacherId: string;
    teacherName: string;
    title: string;
    description?: string;
    startTime: number;
    endTime?: number;
    maxParticipants: number;
    isActive: boolean;
    workspaces: Workspace[];
    participants: Participant[];
    settings: {
        allowBreakoutRooms: boolean;
        allowWhiteboard: boolean;
        allowPrivateWorkspaces: boolean;
        requireApproval: boolean;
    };
}

interface SessionMessage {
    id: string;
    workspaceId: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: number;
    type: 'text' | 'system' | 'file';
}

class LiveSessionService {
    private socket: Socket | null = null;
    private currentSession: LiveSession | null = null;
    private eventHandlers: Map<keyof LiveSessionEvents, Function[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor() {
        this.initializeSocket();
    }

    private initializeSocket() {
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

        this.socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        this.setupSocketHandlers();
    }

    private setupSocketHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to live session server');
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from live session server');
        });

        this.socket.on('error', (error: any) => {
            console.error('Socket error:', error);
            this.emit('error', { message: 'Connection error', code: 'SOCKET_ERROR' });
        });

        this.socket.on('reconnect_attempt', (attemptNumber: number) => {
            this.reconnectAttempts = attemptNumber;
            if (attemptNumber > this.maxReconnectAttempts) {
                this.emit('error', { message: 'Failed to reconnect to session', code: 'RECONNECT_FAILED' });
            }
        });

        // Set up event listeners for all live session events
        Object.keys({} as LiveSessionEvents).forEach(event => {
            this.socket!.on(event, (...args: any[]) => {
                this.emit(event as keyof LiveSessionEvents, ...(args as [any]));
            });
        });
    }

    // Event handling
    on<K extends keyof LiveSessionEvents>(event: K, handler: LiveSessionEvents[K]) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }

    off<K extends keyof LiveSessionEvents>(event: K, handler: LiveSessionEvents[K]) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    private emit<K extends keyof LiveSessionEvents>(event: K, ...args: Parameters<LiveSessionEvents[K]>) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    (handler as any)(...args);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Session management
    async createSession(sessionData: {
        title: string;
        description?: string;
        maxParticipants: number;
        settings: LiveSession['settings'];
    }): Promise<LiveSession> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('session:create', sessionData, (response: { success: boolean; session?: LiveSession; error?: string }) => {
                if (response.success && response.session) {
                    this.currentSession = response.session;
                    resolve(response.session);
                } else {
                    reject(new Error(response.error || 'Failed to create session'));
                }
            });
        });
    }

    async joinSession(sessionId: string, userInfo: { id: string; name: string; role: 'teacher' | 'student' }): Promise<LiveSession> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('session:join', { sessionId, userInfo }, (response: { success: boolean; session?: LiveSession; error?: string }) => {
                if (response.success && response.session) {
                    this.currentSession = response.session;
                    resolve(response.session);
                } else {
                    reject(new Error(response.error || 'Failed to join session'));
                }
            });
        });
    }

    async leaveSession(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.socket || !this.currentSession) {
                resolve();
                return;
            }

            this.socket.emit('session:leave', this.currentSession.id, () => {
                this.currentSession = null;
                resolve();
            });
        });
    }

    async endSession(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('session:end', sessionId, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    this.currentSession = null;
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to end session'));
                }
            });
        });
    }

    // Workspace management
    async createBreakoutRoom(name: string, settings: { isPrivate: boolean; maxParticipants: number }): Promise<Workspace> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('workspace:create', {
                sessionId: this.currentSession.id,
                name,
                type: 'breakout',
                settings
            }, (response: { success: boolean; workspace?: Workspace; error?: string }) => {
                if (response.success && response.workspace) {
                    resolve(response.workspace);
                } else {
                    reject(new Error(response.error || 'Failed to create breakout room'));
                }
            });
        });
    }

    async joinWorkspace(workspaceId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('workspace:join', {
                sessionId: this.currentSession.id,
                workspaceId
            }, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to join workspace'));
                }
            });
        });
    }

    async leaveWorkspace(workspaceId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('workspace:leave', {
                sessionId: this.currentSession.id,
                workspaceId
            }, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to leave workspace'));
                }
            });
        });
    }

    // Whiteboard collaboration
    sendWhiteboardAction(workspaceId: string, action: DrawingAction): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('whiteboard:action', {
            sessionId: this.currentSession.id,
            workspaceId,
            action
        });
    }

    sendCursorPosition(workspaceId: string, cursor: { x: number; y: number }): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('whiteboard:cursor', {
            sessionId: this.currentSession.id,
            workspaceId,
            cursor
        });
    }

    clearWhiteboard(workspaceId: string): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('whiteboard:clear', {
            sessionId: this.currentSession.id,
            workspaceId
        });
    }

    // Monitoring
    async startMonitoring(workspaceId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('monitor:start', {
                sessionId: this.currentSession.id,
                workspaceId
            }, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to start monitoring'));
                }
            });
        });
    }

    async stopMonitoring(workspaceId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('monitor:stop', {
                sessionId: this.currentSession.id,
                workspaceId
            }, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to stop monitoring'));
                }
            });
        });
    }

    // Communication
    sendMessage(workspaceId: string, content: string): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('message:send', {
            sessionId: this.currentSession.id,
            workspaceId,
            content
        });
    }

    startTyping(workspaceId: string): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('typing:start', {
            sessionId: this.currentSession.id,
            workspaceId
        });
    }

    stopTyping(workspaceId: string): void {
        if (!this.socket || !this.currentSession) return;

        this.socket.emit('typing:stop', {
            sessionId: this.currentSession.id,
            workspaceId
        });
    }

    // Permissions
    async updatePermissions(workspaceId: string, userId: string, permissions: Participant['permissions']): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.currentSession) {
                reject(new Error('Not connected to session'));
                return;
            }

            this.socket.emit('permissions:update', {
                sessionId: this.currentSession.id,
                workspaceId,
                userId,
                permissions
            }, (response: { success: boolean; error?: string }) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to update permissions'));
                }
            });
        });
    }

    // Utility methods
    getCurrentSession(): LiveSession | null {
        return this.currentSession;
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.currentSession = null;
    }
}

// Export singleton instance
export const liveSessionService = new LiveSessionService();
export default liveSessionService;
export type { LiveSession, SessionMessage, LiveSessionEvents };