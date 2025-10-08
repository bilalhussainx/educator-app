const express = require('express');
const router = express.Router();
const { Server } = require('socket.io');

// Store active sessions in memory (in production, use Redis or database)
const activeSessions = new Map();
const sessionParticipants = new Map(); // sessionId -> Set of participants
const workspaceUsers = new Map(); // workspaceId -> Set of users
const whiteboardData = new Map(); // workspaceId -> drawing actions array

class LiveSessionManager {
    constructor(io) {
        this.io = io;
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            // Session management
            socket.on('session:create', async (sessionData, callback) => {
                try {
                    const session = {
                        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        ...sessionData,
                        teacherId: socket.userId || socket.id,
                        startTime: Date.now(),
                        isActive: true,
                        workspaces: [{
                            id: 'main',
                            name: 'Main Session',
                            type: 'main',
                            ownerId: socket.userId || socket.id,
                            participants: [],
                            isActive: true,
                            createdAt: Date.now(),
                            lastActivity: Date.now(),
                            isPrivate: false,
                            hasWhiteboard: true,
                            hasVideo: true,
                            hasAudio: true
                        }],
                        participants: []
                    };

                    activeSessions.set(session.id, session);
                    sessionParticipants.set(session.id, new Set());
                    socket.join(session.id);
                    socket.sessionId = session.id;

                    callback({ success: true, session });
                    console.log(`Session created: ${session.id}`);
                } catch (error) {
                    console.error('Error creating session:', error);
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('session:join', async ({ sessionId, userInfo }, callback) => {
                try {
                    const session = activeSessions.get(sessionId);
                    if (!session) {
                        callback({ success: false, error: 'Session not found' });
                        return;
                    }

                    const participant = {
                        id: userInfo.id,
                        name: userInfo.name,
                        role: userInfo.role,
                        isOnline: true,
                        lastSeen: Date.now(),
                        isMonitoring: false,
                        permissions: {
                            canDraw: true,
                            canVideo: true,
                            canAudio: true,
                            canInvite: userInfo.role === 'teacher'
                        }
                    };

                    // Add to session participants
                    session.participants = session.participants.filter(p => p.id !== userInfo.id);
                    session.participants.push(participant);

                    // Add to main workspace
                    const mainWorkspace = session.workspaces.find(w => w.type === 'main');
                    if (mainWorkspace) {
                        mainWorkspace.participants = mainWorkspace.participants.filter(p => p.id !== userInfo.id);
                        mainWorkspace.participants.push(participant);
                        mainWorkspace.lastActivity = Date.now();
                    }

                    socket.join(sessionId);
                    socket.sessionId = sessionId;
                    socket.userId = userInfo.id;
                    socket.userName = userInfo.name;
                    socket.userRole = userInfo.role;

                    // Notify other participants
                    socket.to(sessionId).emit('session:joined', participant);

                    callback({ success: true, session });
                    console.log(`User ${userInfo.name} joined session ${sessionId}`);
                } catch (error) {
                    console.error('Error joining session:', error);
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('session:leave', (sessionId, callback) => {
                try {
                    const session = activeSessions.get(sessionId);
                    if (session && socket.userId) {
                        // Remove from session
                        session.participants = session.participants.filter(p => p.id !== socket.userId);

                        // Remove from all workspaces
                        session.workspaces.forEach(workspace => {
                            workspace.participants = workspace.participants.filter(p => p.id !== socket.userId);
                        });

                        socket.leave(sessionId);
                        socket.to(sessionId).emit('session:left', socket.userId);

                        console.log(`User ${socket.userName} left session ${sessionId}`);
                    }
                    if (callback) callback({ success: true });
                } catch (error) {
                    console.error('Error leaving session:', error);
                    if (callback) callback({ success: false, error: error.message });
                }
            });

            socket.on('session:end', (sessionId, callback) => {
                try {
                    const session = activeSessions.get(sessionId);
                    if (session && socket.userRole === 'teacher') {
                        session.isActive = false;
                        session.endTime = Date.now();

                        // Notify all participants
                        this.io.to(sessionId).emit('session:ended');

                        // Clean up
                        activeSessions.delete(sessionId);
                        sessionParticipants.delete(sessionId);

                        // Clean up workspace data
                        session.workspaces.forEach(workspace => {
                            workspaceUsers.delete(workspace.id);
                            whiteboardData.delete(workspace.id);
                        });

                        callback({ success: true });
                        console.log(`Session ended: ${sessionId}`);
                    } else {
                        callback({ success: false, error: 'Only teachers can end sessions' });
                    }
                } catch (error) {
                    console.error('Error ending session:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Workspace management
            socket.on('workspace:create', async ({ sessionId, name, type, settings }, callback) => {
                try {
                    const session = activeSessions.get(sessionId);
                    if (!session) {
                        callback({ success: false, error: 'Session not found' });
                        return;
                    }

                    const workspace = {
                        id: `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name,
                        type,
                        ownerId: socket.userId,
                        participants: [],
                        isActive: true,
                        createdAt: Date.now(),
                        lastActivity: Date.now(),
                        isPrivate: settings.isPrivate || false,
                        hasWhiteboard: true,
                        hasVideo: true,
                        hasAudio: true
                    };

                    session.workspaces.push(workspace);
                    workspaceUsers.set(workspace.id, new Set());
                    whiteboardData.set(workspace.id, []);

                    // Notify all session participants
                    this.io.to(sessionId).emit('workspace:created', workspace);

                    callback({ success: true, workspace });
                    console.log(`Workspace created: ${workspace.name} (${workspace.id})`);
                } catch (error) {
                    console.error('Error creating workspace:', error);
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('workspace:join', async ({ sessionId, workspaceId }, callback) => {
                try {
                    const session = activeSessions.get(sessionId);
                    if (!session) {
                        callback({ success: false, error: 'Session not found' });
                        return;
                    }

                    const workspace = session.workspaces.find(w => w.id === workspaceId);
                    if (!workspace) {
                        callback({ success: false, error: 'Workspace not found' });
                        return;
                    }

                    const participant = session.participants.find(p => p.id === socket.userId);
                    if (!participant) {
                        callback({ success: false, error: 'User not in session' });
                        return;
                    }

                    // Add to workspace if not already there
                    if (!workspace.participants.find(p => p.id === socket.userId)) {
                        workspace.participants.push(participant);
                    }

                    workspace.lastActivity = Date.now();
                    socket.join(workspaceId);

                    // Notify workspace participants
                    socket.to(workspaceId).emit('workspace:joined', workspaceId, participant);

                    callback({ success: true });
                    console.log(`User ${socket.userName} joined workspace ${workspace.name}`);
                } catch (error) {
                    console.error('Error joining workspace:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Whiteboard collaboration
            socket.on('whiteboard:action', ({ sessionId, workspaceId, action }) => {
                try {
                    if (!whiteboardData.has(workspaceId)) {
                        whiteboardData.set(workspaceId, []);
                    }

                    const actions = whiteboardData.get(workspaceId);
                    actions.push(action);

                    // Broadcast to all users in the workspace
                    socket.to(workspaceId).emit('whiteboard:action', action);

                    // Update workspace activity
                    const session = activeSessions.get(sessionId);
                    if (session) {
                        const workspace = session.workspaces.find(w => w.id === workspaceId);
                        if (workspace) {
                            workspace.lastActivity = Date.now();
                        }
                    }
                } catch (error) {
                    console.error('Error handling whiteboard action:', error);
                }
            });

            socket.on('whiteboard:cursor', ({ sessionId, workspaceId, cursor }) => {
                try {
                    socket.to(workspaceId).emit('whiteboard:cursor', socket.userId, cursor);
                } catch (error) {
                    console.error('Error handling cursor update:', error);
                }
            });

            socket.on('whiteboard:clear', ({ sessionId, workspaceId }) => {
                try {
                    whiteboardData.set(workspaceId, []);
                    this.io.to(workspaceId).emit('whiteboard:clear', workspaceId);
                } catch (error) {
                    console.error('Error clearing whiteboard:', error);
                }
            });

            // Monitoring
            socket.on('monitor:start', ({ sessionId, workspaceId }, callback) => {
                try {
                    if (socket.userRole !== 'teacher') {
                        callback({ success: false, error: 'Only teachers can monitor workspaces' });
                        return;
                    }

                    socket.join(`monitor_${workspaceId}`);
                    socket.to(workspaceId).emit('monitor:started', workspaceId, socket.userId);

                    callback({ success: true });
                    console.log(`Teacher ${socket.userName} started monitoring workspace ${workspaceId}`);
                } catch (error) {
                    console.error('Error starting monitoring:', error);
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('monitor:stop', ({ sessionId, workspaceId }, callback) => {
                try {
                    socket.leave(`monitor_${workspaceId}`);
                    socket.to(workspaceId).emit('monitor:stopped', workspaceId, socket.userId);

                    callback({ success: true });
                    console.log(`Teacher ${socket.userName} stopped monitoring workspace ${workspaceId}`);
                } catch (error) {
                    console.error('Error stopping monitoring:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Communication
            socket.on('message:send', ({ sessionId, workspaceId, content }) => {
                try {
                    const message = {
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        workspaceId,
                        userId: socket.userId,
                        userName: socket.userName,
                        content,
                        timestamp: Date.now(),
                        type: 'text'
                    };

                    this.io.to(workspaceId).emit('message:sent', message);
                } catch (error) {
                    console.error('Error sending message:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Socket disconnected: ${socket.id}`);

                if (socket.sessionId && socket.userId) {
                    const session = activeSessions.get(socket.sessionId);
                    if (session) {
                        // Mark user as offline
                        const participant = session.participants.find(p => p.id === socket.userId);
                        if (participant) {
                            participant.isOnline = false;
                            participant.lastSeen = Date.now();
                        }

                        // Remove from workspaces
                        session.workspaces.forEach(workspace => {
                            const participantInWorkspace = workspace.participants.find(p => p.id === socket.userId);
                            if (participantInWorkspace) {
                                participantInWorkspace.isOnline = false;
                                participantInWorkspace.lastSeen = Date.now();
                            }
                        });

                        // Notify other participants
                        socket.to(socket.sessionId).emit('session:left', socket.userId);
                    }
                }
            });
        });
    }
}

// Initialize live session manager when socket.io server is available
let liveSessionManager = null;

const initializeLiveSessionManager = (io) => {
    liveSessionManager = new LiveSessionManager(io);
    console.log('Live Session Manager initialized');
};

// REST API endpoints for session management
router.get('/active-sessions', (req, res) => {
    try {
        const sessions = Array.from(activeSessions.values()).map(session => ({
            id: session.id,
            title: session.title,
            teacherId: session.teacherId,
            participantCount: session.participants.length,
            workspaceCount: session.workspaces.length,
            startTime: session.startTime,
            isActive: session.isActive
        }));

        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Error fetching active sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({ success: true, session });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/workspace/:workspaceId/whiteboard', (req, res) => {
    try {
        const { workspaceId } = req.params;
        const actions = whiteboardData.get(workspaceId) || [];

        res.json({ success: true, actions });
    } catch (error) {
        console.error('Error fetching whiteboard data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, initializeLiveSessionManager };