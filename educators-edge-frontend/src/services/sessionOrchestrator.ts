/**
 * ================================================================
 * SESSION ORCHESTRATOR - Unified Session Management Service
 * ================================================================
 *
 * This service provides a SINGLE SOURCE OF TRUTH for all session
 * navigation, state management, and presence tracking.
 *
 * Design Principles:
 * 1. Both users ALWAYS land in the same place
 * 2. Clear presence indicators (who's here)
 * 3. Graceful async arrivals (works if student joins first)
 * 4. No race conditions or arbitrary delays
 * 5. Handles reconnections gracefully
 *
 * @author Claude (Reimagined Architecture)
 * @date 2025-02-11
 */

import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================

export type SessionMode = 'code' | 'essay' | 'video';
export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'ended';
export type UserRole = 'teacher' | 'student';

export interface Session {
    id: number | string;
    student_id: string;
    mentor_id: string;
    session_mode?: SessionMode;
    session_type?: string;
    status: SessionStatus;
    scheduled_time?: string;
    started_at?: string;
    ended_at?: string;
    description?: string;
    course_id?: number;
}

export interface SessionPresence {
    sessionId: string | number;
    teacher: {
        connected: boolean;
        userId?: string;
        username?: string;
        socketId?: string;
        joinedAt?: string;
    };
    student: {
        connected: boolean;
        userId?: string;
        username?: string;
        socketId?: string;
        joinedAt?: string;
    };
    lastUpdated: string;
}

export interface NavigationContext {
    session: Session;
    userRole: UserRole;
    userId: string;
    username?: string;
}

// ============================================================
// SESSION ORCHESTRATOR CLASS
// ============================================================

class SessionOrchestrator {
    private socket: Socket | null = null;
    private presenceCache: Map<string | number, SessionPresence> = new Map();
    private connectionCallbacks: Map<string, Function[]> = new Map();
    private isInitialized = false;

    /**
     * Initialize the orchestrator with Socket.IO connection
     */
    initialize(token: string, userId: string): void {
        if (this.isInitialized) {
            console.log('[SessionOrchestrator] Already initialized');
            return;
        }

        const wsUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        console.log('[SessionOrchestrator] Initializing with URL:', wsUrl);

        this.socket = io(wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.setupSocketListeners(userId);
        this.isInitialized = true;
    }

    /**
     * Setup all socket event listeners
     */
    private setupSocketListeners(userId: string): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[SessionOrchestrator] ✅ Connected to server');
            // Register for presence updates
            this.socket?.emit('register:presence', userId);
        });

        this.socket.on('disconnect', () => {
            console.log('[SessionOrchestrator] ❌ Disconnected from server');
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('[SessionOrchestrator] 🔄 Reconnected after', attemptNumber, 'attempts');
            // Re-register for presence
            this.socket?.emit('register:presence', userId);
        });

        // Listen for presence updates
        this.socket.on('session:presence:update', (data: SessionPresence) => {
            console.log('[SessionOrchestrator] 👥 Presence update:', data);
            this.presenceCache.set(data.sessionId, data);

            // Trigger callbacks for this session
            this.triggerCallbacks(data.sessionId.toString(), data);
        });

        // Listen for user joined events
        this.socket.on('session:user:joined', (data: any) => {
            console.log('[SessionOrchestrator] ✅ User joined:', data);
            toast.success(`${data.username || data.role} has joined the session`);
        });

        // Listen for user left events
        this.socket.on('session:user:left', (data: any) => {
            console.log('[SessionOrchestrator] 👋 User left:', data);
            toast.info(`${data.username || data.role} has left the session`);
        });

        // Listen for session ended event
        this.socket.on('session:ended', (data: any) => {
            console.log('[SessionOrchestrator] 🛑 Session ended:', data);

            // Remove from presence cache
            this.presenceCache.delete(data.sessionId);

            // Show notification
            toast.error(`Session ended by ${data.endedBy || 'teacher'}`, {
                description: data.message || 'This session has been ended',
                duration: 5000
            });

            // Trigger callbacks
            this.triggerCallbacks(data.sessionId.toString(), {
                sessionId: data.sessionId,
                teacher: { connected: false },
                student: { connected: false },
                lastUpdated: new Date().toISOString()
            });
        });

        // Also listen for legacy session_ended event
        this.socket.on('session_ended', (data: any) => {
            console.log('[SessionOrchestrator] 🛑 Session ended (legacy):', data);

            // Remove from presence cache
            this.presenceCache.delete(data.sessionId);

            // Show notification
            toast.error('Session ended', {
                description: data.message || 'This session has been ended',
                duration: 5000
            });
        });
    }

    /**
     * Get the appropriate session URL for a given context
     * This is the SINGLE SOURCE OF TRUTH for session navigation
     */
    getSessionUrl(context: NavigationContext): string {
        const { session, userRole } = context;
        const sessionId = session.id;
        const mode = session.session_mode;

        console.log('[SessionOrchestrator] Getting URL for:', { sessionId, mode, userRole });

        // If no mode set, this is an error state
        if (!mode) {
            console.error('[SessionOrchestrator] ❌ Session has no mode set!', session);
            // Return sessions page to avoid broken state
            return '/sessions';
        }

        // Route based on mode
        switch (mode) {
            case 'code':
                // Both teacher and student go to same code editor
                return `/session/${sessionId}`;

            case 'essay':
                // Both teacher and student go to same essay editor
                // Include query params for backward compatibility
                return `/urgent-session/${sessionId}/essay?session=${sessionId}&role=${userRole}&type=live`;

            case 'video':
                // Both go to video-only session
                return `/video-session/${sessionId}`;

            default:
                console.error('[SessionOrchestrator] ❌ Unknown session mode:', mode);
                return `/session/${sessionId}`; // Fallback to code editor
        }
    }

    /**
     * Navigate to a session (used by both teacher and student)
     * This ensures both users end up in the EXACT same place
     */
    navigateToSession(
        context: NavigationContext,
        navigate: (path: string) => void
    ): void {
        const url = this.getSessionUrl(context);

        console.log('[SessionOrchestrator] 🧭 Navigating to:', url);
        console.log('[SessionOrchestrator] Context:', context);

        // Join the session room via Socket.IO
        this.joinSessionRoom(context.session.id, context.userRole, context.userId, context.username);

        // Navigate to the URL
        navigate(url);

        // Show toast
        toast.success(`Joining ${context.session.session_mode} session...`);
    }

    /**
     * Join a session room via Socket.IO for presence tracking
     */
    joinSessionRoom(
        sessionId: string | number,
        role: UserRole,
        userId: string,
        username?: string
    ): void {
        if (!this.socket?.connected) {
            console.warn('[SessionOrchestrator] ⚠️ Socket not connected, cannot join room');
            return;
        }

        console.log('[SessionOrchestrator] 📡 Joining session room:', sessionId);

        this.socket.emit('session:join', {
            sessionId,
            role,
            userId,
            username,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Leave a session room
     */
    leaveSessionRoom(sessionId: string | number, userId: string): void {
        if (!this.socket?.connected) {
            return;
        }

        console.log('[SessionOrchestrator] 🚪 Leaving session room:', sessionId);

        this.socket.emit('session:leave', {
            sessionId,
            userId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get current presence for a session
     */
    async getSessionPresence(sessionId: string | number): Promise<SessionPresence | null> {
        // Check cache first
        if (this.presenceCache.has(sessionId)) {
            return this.presenceCache.get(sessionId)!;
        }

        // Request from server
        return new Promise((resolve) => {
            if (!this.socket?.connected) {
                resolve(null);
                return;
            }

            // Set timeout
            const timeout = setTimeout(() => {
                resolve(null);
            }, 5000);

            // Listen for response
            this.socket.once('session:presence:response', (data: SessionPresence) => {
                clearTimeout(timeout);
                if (data.sessionId === sessionId) {
                    this.presenceCache.set(sessionId, data);
                    resolve(data);
                }
            });

            // Request presence
            this.socket.emit('session:presence:request', { sessionId });
        });
    }

    /**
     * Subscribe to presence updates for a session
     */
    onPresenceUpdate(
        sessionId: string | number,
        callback: (presence: SessionPresence) => void
    ): () => void {
        const key = sessionId.toString();

        if (!this.connectionCallbacks.has(key)) {
            this.connectionCallbacks.set(key, []);
        }

        this.connectionCallbacks.get(key)!.push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.connectionCallbacks.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Trigger all callbacks for a session
     */
    private triggerCallbacks(sessionId: string, presence: SessionPresence): void {
        const callbacks = this.connectionCallbacks.get(sessionId);
        if (callbacks) {
            callbacks.forEach(cb => cb(presence));
        }
    }

    /**
     * Check if session is ready (both users present)
     */
    isSessionReady(presence: SessionPresence): boolean {
        return presence.teacher.connected && presence.student.connected;
    }

    /**
     * Get waiting status message
     */
    getWaitingMessage(presence: SessionPresence, currentRole: UserRole): string {
        if (this.isSessionReady(presence)) {
            return 'Both users are present';
        }

        if (currentRole === 'teacher') {
            return presence.student.connected
                ? 'Student is here'
                : 'Waiting for student to join...';
        } else {
            return presence.teacher.connected
                ? 'Teacher is here'
                : 'Waiting for teacher to start session...';
        }
    }

    /**
     * Cleanup and disconnect
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.presenceCache.clear();
        this.connectionCallbacks.clear();
        this.isInitialized = false;
    }

    /**
     * Get socket instance (for custom events)
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Register callback for when session ends (for auto-redirect)
     * Returns unsubscribe function
     */
    onSessionEnded(
        sessionId: string | number,
        callback: (data: any) => void
    ): () => void {
        const handler = (data: any) => {
            if (data.sessionId === sessionId || data.sessionId.toString() === sessionId.toString()) {
                callback(data);
            }
        };

        // Listen to both events
        this.socket?.on('session:ended', handler);
        this.socket?.on('session_ended', handler);

        // Return unsubscribe function
        return () => {
            this.socket?.off('session:ended', handler);
            this.socket?.off('session_ended', handler);
        };
    }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const sessionOrchestrator = new SessionOrchestrator();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Parse JWT token to get user info
 */
export function parseJwtToken(token: string): any {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return {
            id: decoded.userId || decoded.id,
            username: decoded.username,
            role: decoded.role,
            ...decoded
        };
    } catch (error) {
        console.error('[SessionOrchestrator] Failed to parse token:', error);
        return null;
    }
}

/**
 * Validate session can be joined
 */
export function canJoinSession(session: Session): { canJoin: boolean; reason?: string } {
    if (session.status === 'completed' || session.status === 'ended') {
        return { canJoin: false, reason: 'This session has ended' };
    }

    if (!session.session_mode) {
        return { canJoin: false, reason: 'Session mode not set by teacher' };
    }

    if (session.status === 'scheduled' && !session.started_at) {
        return { canJoin: false, reason: 'Session has not started yet' };
    }

    return { canJoin: true };
}

/**
 * Get user-friendly session mode name
 */
export function getSessionModeName(mode: SessionMode): string {
    switch (mode) {
        case 'code': return 'Code Editor';
        case 'essay': return 'Essay Editor';
        case 'video': return 'Video Call';
        default: return 'Session';
    }
}
