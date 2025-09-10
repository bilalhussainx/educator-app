// Collaboration Service - Handle real-time document collaboration
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class CollaborationService {
    constructor() {
        this.sessions = new Map(); // sessionId -> { clients: [], document: { content, lastUpdate } }
        this.clients = new Map();  // ws -> { userId, sessionId, userInfo }
    }

    /**
     * Initialize WebSocket server for collaboration
     */
    initializeWebSocketServer(server) {
        this.wss = new WebSocket.Server({ 
            server, 
            path: '/ws/collaboration'
        });

        this.wss.on('connection', (ws, req) => {
            console.log('[COLLABORATION] New WebSocket connection');
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('[COLLABORATION] Invalid message format:', error);
                }
            });

            ws.on('close', () => {
                this.handleDisconnect(ws);
            });

            ws.on('error', (error) => {
                console.error('[COLLABORATION] WebSocket error:', error);
                this.handleDisconnect(ws);
            });
        });

        console.log('[COLLABORATION] WebSocket server initialized');
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(ws, message) {
        const { type, sessionId } = message;

        switch (type) {
            case 'join':
                this.handleJoin(ws, message);
                break;

            case 'content-change':
                this.handleContentChange(ws, message);
                break;

            case 'cursor-change':
                this.handleCursorChange(ws, message);
                break;

            default:
                console.warn('[COLLABORATION] Unknown message type:', type);
        }
    }

    /**
     * Handle user joining a collaboration session
     */
    handleJoin(ws, message) {
        const { sessionId, userId, color, documentId } = message;

        if (!sessionId || !userId) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Missing sessionId or userId'
            }));
            return;
        }

        // Create session if it doesn't exist
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                clients: [],
                document: {
                    content: '',
                    lastUpdate: Date.now()
                },
                documentId
            });
        }

        const session = this.sessions.get(sessionId);
        
        // Store client info
        this.clients.set(ws, {
            userId,
            sessionId,
            color,
            userInfo: {
                id: userId,
                name: userId, // In real implementation, get from user database
                color: color || '#' + Math.floor(Math.random()*16777215).toString(16),
                isOnline: true
            }
        });

        // Add client to session
        session.clients.push(ws);

        console.log(`[COLLABORATION] User ${userId} joined session ${sessionId}`);

        // Send current document content to new client
        ws.send(JSON.stringify({
            type: 'content-sync',
            content: session.document.content
        }));

        // Notify other clients about new user
        this.broadcastToSession(sessionId, {
            type: 'user-joined',
            userId,
            userName: userId
        }, ws);

        // Send updated collaborators list
        this.sendCollaboratorsList(sessionId);
    }

    /**
     * Handle content changes from users
     */
    handleContentChange(ws, message) {
        const client = this.clients.get(ws);
        if (!client) return;

        const session = this.sessions.get(client.sessionId);
        if (!session) return;

        // Update document content
        session.document.content = message.content;
        session.document.lastUpdate = Date.now();

        console.log(`[COLLABORATION] Content updated by ${client.userId} in session ${client.sessionId}`);

        // Broadcast to other clients in the session
        this.broadcastToSession(client.sessionId, {
            type: 'content-change',
            content: message.content,
            userId: message.userId,
            timestamp: message.timestamp
        }, ws);
    }

    /**
     * Handle cursor position changes
     */
    handleCursorChange(ws, message) {
        const client = this.clients.get(ws);
        if (!client) return;

        // Broadcast cursor position to other clients
        this.broadcastToSession(client.sessionId, {
            type: 'cursor-change',
            position: message.position,
            userId: message.userId,
            timestamp: message.timestamp
        }, ws);
    }

    /**
     * Handle client disconnect
     */
    handleDisconnect(ws) {
        const client = this.clients.get(ws);
        if (!client) return;

        console.log(`[COLLABORATION] User ${client.userId} disconnected from session ${client.sessionId}`);

        // Remove from session
        const session = this.sessions.get(client.sessionId);
        if (session) {
            session.clients = session.clients.filter(c => c !== ws);

            // Notify other clients
            this.broadcastToSession(client.sessionId, {
                type: 'user-left',
                userId: client.userId,
                userName: client.userId
            });

            // Send updated collaborators list
            this.sendCollaboratorsList(client.sessionId);

            // Clean up empty sessions
            if (session.clients.length === 0) {
                this.sessions.delete(client.sessionId);
                console.log(`[COLLABORATION] Cleaned up empty session ${client.sessionId}`);
            }
        }

        // Remove client
        this.clients.delete(ws);
    }

    /**
     * Broadcast message to all clients in a session except sender
     */
    broadcastToSession(sessionId, message, excludeWs = null) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const messageStr = JSON.stringify(message);
        
        session.clients.forEach(client => {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    /**
     * Send collaborators list to all clients in session
     */
    sendCollaboratorsList(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const collaborators = session.clients
            .map(client => this.clients.get(client))
            .filter(client => client)
            .map(client => client.userInfo);

        const message = JSON.stringify({
            type: 'collaborators-update',
            collaborators
        });

        session.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        return {
            totalSessions: this.sessions.size,
            totalClients: this.clients.size,
            sessions: Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
                sessionId,
                clientCount: session.clients.length,
                documentId: session.documentId,
                lastUpdate: session.document.lastUpdate
            }))
        };
    }
}

module.exports = new CollaborationService();