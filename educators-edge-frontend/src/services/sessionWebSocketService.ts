class SessionWebSocketService {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private isConnected = false;
    private userId: string | null = null;
    private sessionId: string | null = null;

    constructor() {
        // Use VITE_WS_URL from environment, fallback to localhost:5000
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

        // Remove any /ws suffix if already present in the env variable
        const baseUrl = wsUrl.replace(/\/ws$/, '');

        this.url = import.meta.env.PROD
            ? 'wss://educator-app-backend-vxtu.onrender.com/ws'
            : `${baseUrl}/ws`;

        console.log('[SessionWebSocketService] Initialized with URL:', this.url);
    }

    connect(userId: string, token: string, sessionId?: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.userId = userId;
        this.sessionId = sessionId || null;

        try {
            // Include sessionId if provided for essay sessions
            const params = new URLSearchParams({
                userId,
                token,
                ...(sessionId && { sessionId })
            });
            this.ws = new WebSocket(`${this.url}?${params.toString()}`);
            
            this.ws.onopen = () => {
                console.log('Session WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connection', { status: 'connected' });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('Session WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.emit('connection', { status: 'disconnected' });

                // Don't reconnect if server rejected due to missing session ID (4001)
                // or if it was a clean disconnect (1000)
                if (event.code !== 1000 && event.code !== 4001 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('Session WebSocket error:', error);
                this.emit('error', { error });
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.listeners.clear();
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            this.reconnectAttempts++;
            if (this.userId) {
                const token = localStorage.getItem('authToken');
                if (token) {
                    this.connect(this.userId, token, this.sessionId || undefined);
                }
            }
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }

    private handleMessage(data: any) {
        const { type, payload } = data;
        
        switch (type) {
            case 'session_request_update':
                this.emit('sessionRequestUpdate', payload);
                break;
            case 'session_status_change':
                this.emit('sessionStatusChange', payload);
                break;
            case 'new_message':
                this.emit('newMessage', payload);
                break;
            case 'session_started':
                this.emit('sessionStarted', payload);
                break;
            case 'essay_session_started':
                this.emit('essaySessionStarted', payload);
                break;
            case 'session_ended':
                this.emit('sessionEnded', payload);
                break;
            case 'essay_session_ended':
                this.emit('essaySessionEnded', payload);
                break;
            case 'user_status_update':
                this.emit('userStatusUpdate', payload);
                break;
            case 'calendar_event_update':
                this.emit('calendarEventUpdate', payload);
                break;
            case 'notification':
                this.emit('notification', payload);
                break;
            default:
                console.log('Unknown WebSocket message type:', type);
        }
    }

    private emit(event: string, data: any) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket event listener for ${event}:`, error);
                }
            });
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.delete(callback);
                if (eventListeners.size === 0) {
                    this.listeners.delete(event);
                }
            }
        };
    }

    off(event: string, callback: (data: any) => void) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    send(type: string, payload: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', { type, payload });
        }
    }

    // Session-specific methods
    subscribeToSessionUpdates(sessionId: string) {
        this.send('subscribe_session', { sessionId });
    }

    unsubscribeFromSessionUpdates(sessionId: string) {
        this.send('unsubscribe_session', { sessionId });
    }

    updateSessionStatus(sessionId: string, status: string) {
        this.send('update_session_status', { sessionId, status });
    }

    sendSessionMessage(sessionId: string, message: string) {
        this.send('session_message', { sessionId, message });
    }

    joinSession(sessionId: string) {
        this.send('join_session', { sessionId });
    }

    leaveSession(sessionId: string) {
        this.send('leave_session', { sessionId });
    }

    startSession(sessionId: string) {
        this.send('start_session', { sessionId });
    }

    endSession(sessionId: string) {
        this.send('end_session', { sessionId });
    }

    updateUserPresence(status: 'online' | 'offline' | 'busy' | 'away') {
        this.send('user_presence', { status });
    }

    requestSessionToken(sessionId: string) {
        this.send('request_session_token', { sessionId });
    }

    get connectionStatus() {
        return this.isConnected;
    }

    get readyState() {
        return this.ws?.readyState || WebSocket.CLOSED;
    }
}

// Create singleton instance
const sessionWebSocketService = new SessionWebSocketService();

export default sessionWebSocketService;