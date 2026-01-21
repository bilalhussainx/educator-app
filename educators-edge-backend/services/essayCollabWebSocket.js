/**
 * Essay Collaboration WebSocket Handler
 *
 * Manages WebSocket connections for collaborative essay writing sessions.
 * Integrates with the essay pipeline service for real-time updates.
 *
 * This module can be integrated with the existing websocketHandler.js
 * by calling handleEssayCollabMessage() when essay collaboration messages are received.
 */

const jwt = require('jsonwebtoken');
const essayPipelineService = require('./essayAgents/essayPipelineService');
const essaySessionDb = require('./essaySessionDb');

// Essay collaboration rooms (sessionId -> Set of client info)
const essayRooms = new Map();

// Message type constants
const ESSAY_COLLAB_MESSAGES = {
  // Connection management
  JOIN_ESSAY_SESSION: 'join_essay_session',
  LEAVE_ESSAY_SESSION: 'leave_essay_session',
  USER_JOINED_ESSAY: 'user_joined_essay',
  USER_LEFT_ESSAY: 'user_left_essay',

  // Pipeline control
  START_PIPELINE: 'start_pipeline',
  APPROVE_STAGE: 'approve_stage',
  REQUEST_REVISION: 'request_revision',
  ADD_STUDENT_FEEDBACK: 'add_student_feedback',
  EDIT_STAGE_OUTPUT: 'edit_stage_output',

  // Pipeline events (server -> client)
  AGENT_STARTED: 'agent_started',
  AGENT_OUTPUT: 'agent_output',
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_RESPONSE: 'approval_response',
  STAGE_CHANGED: 'stage_changed',
  PIPELINE_COMPLETE: 'pipeline_complete',
  PIPELINE_ERROR: 'pipeline_error',

  // Real-time essay content
  ESSAY_CONTENT_SYNC: 'essay_content_sync',
  ESSAY_CURSOR_UPDATE: 'essay_cursor_update',

  // Comments
  COMMENT_ADDED: 'comment_added',
  COMMENT_RESOLVED: 'comment_resolved',
  COMMENT_UPDATED: 'comment_updated',

  // Chat
  ESSAY_CHAT_MESSAGE: 'essay_chat_message',
  ESSAY_CHAT_HISTORY: 'essay_chat_history',

  // Presence
  USER_PRESENCE_UPDATE: 'user_presence_update',

  // Session state
  SESSION_STATE_SYNC: 'session_state_sync',

  // Errors
  ERROR: 'error'
};

/**
 * Initialize pipeline service event listeners
 * This forwards pipeline events to WebSocket clients
 */
function initializePipelineEvents() {
  // Agent started processing
  essayPipelineService.on('agentStarted', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.AGENT_STARTED,
      payload: data
    });
  });

  // Agent produced output
  essayPipelineService.on('agentOutput', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.AGENT_OUTPUT,
      payload: data
    });
  });

  // Approval requested (checkpoint reached)
  essayPipelineService.on('approvalRequested', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.APPROVAL_REQUESTED,
      payload: data
    });
  });

  // Approval response (approved/rejected)
  essayPipelineService.on('approvalResponse', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.APPROVAL_RESPONSE,
      payload: data
    });
  });

  // Stage changed
  essayPipelineService.on('stageChanged', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.STAGE_CHANGED,
      payload: data
    });
  });

  // Pipeline complete
  essayPipelineService.on('pipelineComplete', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.PIPELINE_COMPLETE,
      payload: data
    });
  });

  // Pipeline error
  essayPipelineService.on('error', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.PIPELINE_ERROR,
      payload: data
    });
  });

  // Student feedback
  essayPipelineService.on('studentFeedback', (data) => {
    broadcastToEssayRoom(data.sessionId, {
      type: ESSAY_COLLAB_MESSAGES.USER_PRESENCE_UPDATE,
      payload: { type: 'student_feedback', ...data }
    });
  });

  console.log('[EssayCollabWS] Pipeline event listeners initialized');
}

// Initialize on module load
initializePipelineEvents();

/**
 * Broadcast message to all clients in an essay room
 */
function broadcastToEssayRoom(sessionId, message, excludeUserId = null) {
  const room = essayRooms.get(sessionId);
  if (!room) return;

  const messageStr = JSON.stringify(message);

  room.forEach(client => {
    if (client.userId !== excludeUserId && client.ws.readyState === 1) { // 1 = OPEN
      try {
        client.ws.send(messageStr);
      } catch (error) {
        console.error(`[EssayCollabWS] Error sending to client ${client.userId}:`, error.message);
      }
    }
  });
}

/**
 * Send message to a specific user in a room
 */
function sendToUser(sessionId, userId, message) {
  const room = essayRooms.get(sessionId);
  if (!room) return;

  const client = Array.from(room).find(c => c.userId === userId);
  if (client && client.ws.readyState === 1) {
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[EssayCollabWS] Error sending to user ${userId}:`, error.message);
    }
  }
}

/**
 * Get connected users in a room
 */
function getConnectedUsers(sessionId) {
  const room = essayRooms.get(sessionId);
  if (!room) return [];

  return Array.from(room).map(client => ({
    userId: client.userId,
    username: client.username,
    role: client.role
  }));
}

/**
 * Handle client joining an essay session
 */
async function handleJoinEssaySession(ws, clientInfo, sessionId) {
  const { userId, username, role } = clientInfo;

  // Verify user is participant
  const sessionRole = await essaySessionDb.getUserRoleInSession(sessionId, userId);
  if (!sessionRole) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'You are not a participant in this session' }
    }));
    return false;
  }

  // Create room if doesn't exist
  if (!essayRooms.has(sessionId)) {
    essayRooms.set(sessionId, new Set());
  }

  const room = essayRooms.get(sessionId);

  // Remove existing connection for this user
  const existingClient = Array.from(room).find(c => c.userId === userId);
  if (existingClient) {
    room.delete(existingClient);
  }

  // Add new connection
  const client = {
    ws,
    userId,
    username,
    role: sessionRole,
    joinedAt: new Date()
  };
  room.add(client);

  // Store session ID on websocket for cleanup
  ws.essaySessionId = sessionId;
  ws.essayClientInfo = client;

  console.log(`[EssayCollabWS] User ${username} (${sessionRole}) joined essay session ${sessionId}`);

  // Notify others
  broadcastToEssayRoom(sessionId, {
    type: ESSAY_COLLAB_MESSAGES.USER_JOINED_ESSAY,
    payload: { userId, username, role: sessionRole }
  }, userId);

  // Send current session state to the joining user
  try {
    const fullState = await essaySessionDb.getFullSessionState(sessionId);
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.SESSION_STATE_SYNC,
      payload: {
        ...fullState,
        connectedUsers: getConnectedUsers(sessionId)
      }
    }));
  } catch (error) {
    console.error(`[EssayCollabWS] Error sending session state:`, error.message);
  }

  return true;
}

/**
 * Handle client leaving an essay session
 */
function handleLeaveEssaySession(ws, sessionId) {
  const room = essayRooms.get(sessionId);
  if (!room || !ws.essayClientInfo) return;

  const { userId, username, role } = ws.essayClientInfo;

  room.delete(ws.essayClientInfo);
  ws.essaySessionId = null;
  ws.essayClientInfo = null;

  console.log(`[EssayCollabWS] User ${username} left essay session ${sessionId}`);

  // Notify others
  broadcastToEssayRoom(sessionId, {
    type: ESSAY_COLLAB_MESSAGES.USER_LEFT_ESSAY,
    payload: { userId, username, role }
  });

  // Clean up empty rooms
  if (room.size === 0) {
    essayRooms.delete(sessionId);
    essayPipelineService.cleanup(sessionId);
  }
}

/**
 * Main message handler for essay collaboration
 * Call this from the main websocketHandler when receiving essay collab messages
 */
async function handleEssayCollabMessage(ws, message, clientInfo) {
  const { type, payload } = message;
  const { userId, username, role } = clientInfo;

  try {
    switch (type) {
      case ESSAY_COLLAB_MESSAGES.JOIN_ESSAY_SESSION:
        await handleJoinEssaySession(ws, clientInfo, payload.sessionId);
        break;

      case ESSAY_COLLAB_MESSAGES.LEAVE_ESSAY_SESSION:
        handleLeaveEssaySession(ws, payload.sessionId);
        break;

      case ESSAY_COLLAB_MESSAGES.START_PIPELINE:
        await handleStartPipeline(ws, payload.sessionId, userId, role);
        break;

      case ESSAY_COLLAB_MESSAGES.APPROVE_STAGE:
        await handleApproveStage(ws, payload, userId, role);
        break;

      case ESSAY_COLLAB_MESSAGES.REQUEST_REVISION:
        await handleRequestRevision(ws, payload, userId, role);
        break;

      case ESSAY_COLLAB_MESSAGES.ADD_STUDENT_FEEDBACK:
        await handleAddStudentFeedback(ws, payload, userId, role);
        break;

      case ESSAY_COLLAB_MESSAGES.EDIT_STAGE_OUTPUT:
        await handleEditStageOutput(ws, payload, userId, role);
        break;

      case ESSAY_COLLAB_MESSAGES.ESSAY_CHAT_MESSAGE:
        await handleChatMessage(ws, payload, userId, username);
        break;

      case ESSAY_COLLAB_MESSAGES.COMMENT_ADDED:
        await handleCommentAdded(ws, payload, userId);
        break;

      case ESSAY_COLLAB_MESSAGES.COMMENT_RESOLVED:
        await handleCommentResolved(ws, payload, userId);
        break;

      case ESSAY_COLLAB_MESSAGES.ESSAY_CURSOR_UPDATE:
        handleCursorUpdate(ws, payload, userId);
        break;

      default:
        console.warn(`[EssayCollabWS] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`[EssayCollabWS] Error handling message ${type}:`, error);
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message, type }
    }));
  }
}

// ============================================
// Message Handlers
// ============================================

async function handleStartPipeline(ws, sessionId, userId, role) {
  if (role !== 'teacher') {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'Only teachers can start the pipeline' }
    }));
    return;
  }

  try {
    await essayPipelineService.startSession(sessionId);
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleApproveStage(ws, payload, userId, role) {
  const { sessionId, feedback, editedOutput } = payload;

  if (role !== 'teacher') {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'Only teachers can approve stages' }
    }));
    return;
  }

  try {
    await essayPipelineService.approveStage(sessionId, userId, feedback, editedOutput);
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleRequestRevision(ws, payload, userId, role) {
  const { sessionId, feedback } = payload;

  if (role !== 'teacher') {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'Only teachers can request revisions' }
    }));
    return;
  }

  if (!feedback) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'Feedback is required for revision requests' }
    }));
    return;
  }

  try {
    await essayPipelineService.requestRevision(sessionId, userId, feedback);
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleAddStudentFeedback(ws, payload, userId, role) {
  const { sessionId, feedback } = payload;

  try {
    await essayPipelineService.addStudentFeedback(sessionId, userId, feedback);

    // Broadcast to room
    broadcastToEssayRoom(sessionId, {
      type: ESSAY_COLLAB_MESSAGES.ESSAY_CHAT_MESSAGE,
      payload: {
        userId,
        content: feedback,
        type: 'student_feedback',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleEditStageOutput(ws, payload, userId, role) {
  const { sessionId, editedOutput } = payload;

  if (role !== 'teacher') {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: 'Only teachers can edit stage outputs' }
    }));
    return;
  }

  try {
    await essayPipelineService.editStageOutput(sessionId, userId, editedOutput);

    // Notify room of edit
    broadcastToEssayRoom(sessionId, {
      type: ESSAY_COLLAB_MESSAGES.STAGE_CHANGED,
      payload: { sessionId, action: 'output_edited', userId }
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleChatMessage(ws, payload, userId, username) {
  const { sessionId, content } = payload;

  try {
    // Save to database
    await essaySessionDb.addMessage(sessionId, userId, 'chat', content);

    // Broadcast to room
    broadcastToEssayRoom(sessionId, {
      type: ESSAY_COLLAB_MESSAGES.ESSAY_CHAT_MESSAGE,
      payload: {
        userId,
        username,
        content,
        messageType: 'chat',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleCommentAdded(ws, payload, userId) {
  const { sessionId, ...commentData } = payload;

  try {
    const comment = await essaySessionDb.addComment(sessionId, userId, commentData);

    // Broadcast to room
    broadcastToEssayRoom(sessionId, {
      type: ESSAY_COLLAB_MESSAGES.COMMENT_ADDED,
      payload: comment
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

async function handleCommentResolved(ws, payload, userId) {
  const { sessionId, commentId } = payload;

  try {
    await essaySessionDb.resolveComment(commentId, userId);

    // Broadcast to room
    broadcastToEssayRoom(sessionId, {
      type: ESSAY_COLLAB_MESSAGES.COMMENT_RESOLVED,
      payload: { commentId, resolvedBy: userId }
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: ESSAY_COLLAB_MESSAGES.ERROR,
      payload: { message: error.message }
    }));
  }
}

function handleCursorUpdate(ws, payload, userId) {
  const { sessionId, cursor } = payload;

  // Broadcast cursor to others (not saved to DB)
  broadcastToEssayRoom(sessionId, {
    type: ESSAY_COLLAB_MESSAGES.ESSAY_CURSOR_UPDATE,
    payload: { userId, cursor }
  }, userId);
}

/**
 * Handle WebSocket close - cleanup
 */
function handleDisconnect(ws) {
  if (ws.essaySessionId) {
    handleLeaveEssaySession(ws, ws.essaySessionId);
  }
}

/**
 * Check if a message type is an essay collaboration message
 */
function isEssayCollabMessage(type) {
  return Object.values(ESSAY_COLLAB_MESSAGES).includes(type);
}

/**
 * Initialize Socket.IO handler for essay collaboration
 * @param {Object} io - Socket.IO server instance
 */
function initializeEssayCollabHandler(io) {
  // Initialize pipeline event forwarding
  initializePipelineEvents();

  console.log('[EssayCollab] Initializing Socket.IO handler');

  io.on('connection', (socket) => {
    // Handle essay:join event
    socket.on('essay:join', async (data) => {
      const { sessionId } = data;
      if (!sessionId) return;

      try {
        // Verify auth
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          socket.emit('essay:error', { error: 'Authentication required' });
          return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Handle both token formats: decoded.id or decoded.user.id
        const userId = decoded.user?.id || decoded.id;
        const role = (decoded.user?.role || decoded.role || '').toLowerCase();

        // Verify user is participant
        const session = await essaySessionDb.getSession(sessionId);
        if (!session) {
          socket.emit('essay:error', { error: 'Session not found' });
          return;
        }

        // Allow teacher, assigned student, or any student joining via session ID
        const isTeacher = String(session.teacher_id) === String(userId);
        const isAssignedStudent = session.student_id && String(session.student_id) === String(userId);
        const isStudentJoining = role === 'student';

        if (!isTeacher && !isAssignedStudent && !isStudentJoining) {
          socket.emit('essay:error', { error: 'Access denied' });
          return;
        }

        // Auto-assign student if not assigned
        if (isStudentJoining && !session.student_id) {
          await essaySessionDb.updateSession(sessionId, { studentId: userId });
          session.student_id = userId;
        }

        // Join the Socket.IO room
        socket.join(`essay:${sessionId}`);
        socket.essaySessionId = sessionId;
        socket.essayUserId = userId;
        socket.essayUserRole = role;

        console.log(`[EssayCollab] User ${userId} joined essay session ${sessionId}`);

        // Notify room
        io.to(`essay:${sessionId}`).emit('essay:participant_joined', {
          sessionId,
          userId,
          role
        });

        // Send current state
        const fullState = await essaySessionDb.getFullSessionState(sessionId);
        socket.emit('essay:state_sync', { sessionId, state: fullState });

      } catch (error) {
        console.error('[EssayCollab] Join error:', error);
        socket.emit('essay:error', { error: error.message });
      }
    });

    // Handle essay:leave event
    socket.on('essay:leave', (data) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.leave(`essay:${sessionId}`);
        io.to(`essay:${sessionId}`).emit('essay:participant_left', {
          sessionId,
          userId: socket.essayUserId
        });
        console.log(`[EssayCollab] User ${socket.essayUserId} left essay session ${sessionId}`);
      }
    });

    // Handle chat messages
    socket.on('essay:chat', async (data) => {
      const { sessionId, content } = data;
      if (!sessionId || !content) return;

      try {
        const message = await essaySessionDb.addMessage(
          sessionId,
          socket.essayUserId,
          'chat',
          content,
          {}
        );

        io.to(`essay:${sessionId}`).emit('essay:message', {
          sessionId,
          message
        });
      } catch (error) {
        socket.emit('essay:error', { error: error.message });
      }
    });

    // Handle typing indicator
    socket.on('essay:typing', (data) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.to(`essay:${sessionId}`).emit('essay:typing', {
          sessionId,
          userId: socket.essayUserId,
          username: socket.handshake.auth?.username || 'User'
        });
      }
    });

    // Handle draft updates
    socket.on('essay:draft_update', async (data) => {
      const { sessionId, content } = data;
      if (!sessionId || !content) return;

      // Broadcast to others (Liveblocks handles sync, this is for backup)
      socket.to(`essay:${sessionId}`).emit('essay:draft_updated', {
        sessionId,
        content,
        userId: socket.essayUserId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.essaySessionId) {
        io.to(`essay:${socket.essaySessionId}`).emit('essay:participant_left', {
          sessionId: socket.essaySessionId,
          userId: socket.essayUserId
        });
      }
    });
  });

  // Forward pipeline events to Socket.IO rooms
  essayPipelineService.on('agentStarted', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:agent_started', data);
  });

  essayPipelineService.on('agentOutput', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:agent_output', data);
  });

  essayPipelineService.on('approvalRequested', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:approval_requested', data);
  });

  essayPipelineService.on('approvalResponse', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:approval_response', data);
  });

  essayPipelineService.on('stageChanged', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:stage_changed', data);
  });

  essayPipelineService.on('pipelineComplete', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:pipeline_complete', data);
  });

  essayPipelineService.on('error', (data) => {
    io.to(`essay:${data.sessionId}`).emit('essay:error', data);
  });

  console.log('[EssayCollab] Socket.IO handler initialized');
}

module.exports = {
  ESSAY_COLLAB_MESSAGES,
  handleEssayCollabMessage,
  handleJoinEssaySession,
  handleLeaveEssaySession,
  handleDisconnect,
  broadcastToEssayRoom,
  sendToUser,
  getConnectedUsers,
  isEssayCollabMessage,
  initializeEssayCollabHandler,
  essayRooms
};
