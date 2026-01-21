/**
 * Essay Collaboration Session Database Service
 *
 * Handles all PostgreSQL database operations for the collaborative
 * essay writing system. Works alongside EssayCollaborationDraft (MongoDB)
 * for large text content storage.
 */

const db = require('../db');
const EssayCollaborationDraft = require('../models/EssayCollaborationDraft');

// Stage order mapping
const STAGE_ORDER = {
  'not_started': 0,
  'topic_analysis': 1,
  'research': 2,
  'outline': 3,
  'draft': 4,
  'editing': 5,
  'polish': 6,
  'complete': 7
};

const STAGE_NAMES = ['not_started', 'topic_analysis', 'research', 'outline', 'draft', 'editing', 'polish', 'complete'];

/**
 * Create a new essay collaboration session
 * @param {Object} data - Session data (can include teacherId as first param for backwards compat)
 */
async function createSession(dataOrTeacherId, maybeData = null) {
  // Support both createSession({ teacherId, ... }) and createSession(teacherId, { ... })
  let data;
  if (typeof dataOrTeacherId === 'object') {
    data = dataOrTeacherId;
  } else {
    data = { ...maybeData, teacherId: dataOrTeacherId };
  }

  const {
    teacherId,
    title,
    essayPrompt,
    university = null,
    essayType = 'common_app',
    targetWordCount = 650,
    studentId = null,
    studentProfile = null
  } = data;

  const query = `
    INSERT INTO essay_collab_sessions (
      title, essay_prompt, university, essay_type, target_word_count,
      teacher_id, student_id, student_profile, status, current_stage
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', 'not_started')
    RETURNING *
  `;

  const values = [
    title,
    essayPrompt,
    university,
    essayType,
    targetWordCount,
    teacherId,
    studentId,
    studentProfile ? JSON.stringify(studentProfile) : null
  ];

  const result = await db.query(query, values);
  const session = result.rows[0];

  // Create corresponding MongoDB document for large content (non-blocking)
  try {
    await EssayCollaborationDraft.findOrCreateForSession(session.id);
  } catch (mongoErr) {
    console.warn('[EssaySessionDb] MongoDB draft creation skipped:', mongoErr.message);
    // Continue without MongoDB - PostgreSQL session is sufficient
  }

  return session;
}

/**
 * Get a session by ID with participant info
 */
async function getSession(sessionId) {
  const query = `
    SELECT
      s.*,
      t.username as teacher_username,
      t.email as teacher_email,
      st.username as student_username,
      st.email as student_email
    FROM essay_collab_sessions s
    LEFT JOIN users t ON s.teacher_id = t.id
    LEFT JOIN users st ON s.student_id = st.id
    WHERE s.id = $1
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows[0] || null;
}

/**
 * Get all sessions for a user (teacher or student)
 */
async function getSessionsByUser(userId, role) {
  const column = role === 'teacher' ? 'teacher_id' : 'student_id';

  const query = `
    SELECT
      s.*,
      t.username as teacher_username,
      st.username as student_username,
      (SELECT COUNT(*) FROM essay_collab_stage_states WHERE session_id = s.id) as stages_completed
    FROM essay_collab_sessions s
    LEFT JOIN users t ON s.teacher_id = t.id
    LEFT JOIN users st ON s.student_id = st.id
    WHERE s.${column} = $1
    ORDER BY s.updated_at DESC
  `;

  const result = await db.query(query, [userId]);
  return result.rows;
}

/**
 * Update session status
 */
async function updateSessionStatus(sessionId, status) {
  const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const updates = { status };
  if (status === 'active' && !await hasStartedAt(sessionId)) {
    updates.started_at = 'NOW()';
  }
  if (status === 'completed') {
    updates.completed_at = 'NOW()';
  }

  const query = `
    UPDATE essay_collab_sessions
    SET status = $1::text,
        started_at = COALESCE(started_at, CASE WHEN $1::text = 'active' THEN NOW() ELSE NULL END),
        completed_at = CASE WHEN $1::text = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = $2::uuid
    RETURNING *
  `;

  const result = await db.query(query, [status, sessionId]);
  return result.rows[0];
}

async function hasStartedAt(sessionId) {
  const result = await db.query(
    'SELECT started_at FROM essay_collab_sessions WHERE id = $1',
    [sessionId]
  );
  return result.rows[0]?.started_at != null;
}

/**
 * Update session's current stage and LangGraph checkpoint
 */
async function updateSessionStage(sessionId, stage, checkpointId = null) {
  const query = `
    UPDATE essay_collab_sessions
    SET current_stage = $1,
        langgraph_checkpoint_id = COALESCE($2, langgraph_checkpoint_id),
        status = CASE WHEN status = 'draft' THEN 'active' ELSE status END
    WHERE id = $3
    RETURNING *
  `;

  const result = await db.query(query, [stage, checkpointId, sessionId]);
  return result.rows[0];
}

/**
 * Set LangGraph thread ID for session
 */
async function setLangGraphThreadId(sessionId, threadId) {
  const query = `
    UPDATE essay_collab_sessions
    SET langgraph_thread_id = $1
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [threadId, sessionId]);
  return result.rows[0];
}

/**
 * Invite a student to a session
 */
async function inviteStudent(sessionId, studentId, teacherId) {
  // Verify teacher owns session
  const session = await getSession(sessionId);
  if (!session || session.teacher_id !== teacherId) {
    throw new Error('Unauthorized: Only the session teacher can invite students');
  }

  const query = `
    UPDATE essay_collab_sessions
    SET student_id = $1
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [studentId, sessionId]);
  return result.rows[0];
}

// ============================================
// STAGE STATES (Human-in-the-loop checkpoints)
// ============================================

/**
 * Create or update a stage state with agent output
 */
async function createStageState(sessionId, stage, agentOutput, modelUsed = null, durationMs = null) {
  const stageOrder = STAGE_ORDER[stage] || 0;

  const query = `
    INSERT INTO essay_collab_stage_states (
      session_id, stage, stage_order, agent_output, agent_model, agent_duration_ms, approval_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    ON CONFLICT (session_id, stage)
    DO UPDATE SET
      agent_output = EXCLUDED.agent_output,
      agent_model = EXCLUDED.agent_model,
      agent_duration_ms = EXCLUDED.agent_duration_ms,
      approval_status = 'pending',
      approved_by = NULL,
      approved_at = NULL,
      teacher_feedback = NULL,
      student_feedback = NULL,
      edited_output = NULL,
      edited_by = NULL,
      updated_at = NOW()
    RETURNING *
  `;

  const result = await db.query(query, [
    sessionId,
    stage,
    stageOrder,
    JSON.stringify(agentOutput),
    modelUsed,
    durationMs
  ]);

  // Also save to MongoDB for large content backup
  const draft = await EssayCollaborationDraft.findOrCreateForSession(sessionId);
  await draft.updateAgentOutput(stage, {
    ...agentOutput,
    modelUsed,
    durationMs
  });

  return result.rows[0];
}

/**
 * Get all stage states for a session
 */
async function getStageStates(sessionId) {
  const query = `
    SELECT ss.*,
           u_approved.username as approved_by_username,
           u_edited.username as edited_by_username
    FROM essay_collab_stage_states ss
    LEFT JOIN users u_approved ON ss.approved_by = u_approved.id
    LEFT JOIN users u_edited ON ss.edited_by = u_edited.id
    WHERE ss.session_id = $1
    ORDER BY ss.stage_order ASC
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows;
}

/**
 * Get a specific stage state
 */
async function getStageState(sessionId, stage) {
  const query = `
    SELECT * FROM essay_collab_stage_states
    WHERE session_id = $1 AND stage = $2
  `;

  const result = await db.query(query, [sessionId, stage]);
  return result.rows[0] || null;
}

/**
 * Get the current pending stage state
 */
async function getPendingStageState(sessionId) {
  const query = `
    SELECT * FROM essay_collab_stage_states
    WHERE session_id = $1 AND approval_status = 'pending'
    ORDER BY stage_order DESC
    LIMIT 1
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows[0] || null;
}

/**
 * Update stage approval status (teacher approves/rejects)
 */
async function updateStageApproval(sessionId, stage, status, feedback, userId) {
  const validStatuses = ['approved', 'rejected', 'revision_requested'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid approval status: ${status}`);
  }

  const query = `
    UPDATE essay_collab_stage_states
    SET approval_status = $1,
        teacher_feedback = COALESCE($2, teacher_feedback),
        approved_by = $3,
        approved_at = NOW()
    WHERE session_id = $4 AND stage = $5
    RETURNING *
  `;

  const result = await db.query(query, [status, feedback, userId, sessionId, stage]);
  return result.rows[0];
}

/**
 * Add student feedback to a stage (doesn't change approval status)
 */
async function addStudentFeedback(sessionId, stage, feedback) {
  const query = `
    UPDATE essay_collab_stage_states
    SET student_feedback = $1
    WHERE session_id = $2 AND stage = $3
    RETURNING *
  `;

  const result = await db.query(query, [feedback, sessionId, stage]);
  return result.rows[0];
}

/**
 * Update stage with edited output before approval
 */
async function updateStageEditedOutput(sessionId, stage, editedOutput, userId) {
  const query = `
    UPDATE essay_collab_stage_states
    SET edited_output = $1,
        edited_by = $2
    WHERE session_id = $3 AND stage = $4
    RETURNING *
  `;

  const result = await db.query(query, [
    JSON.stringify(editedOutput),
    userId,
    sessionId,
    stage
  ]);
  return result.rows[0];
}

// ============================================
// DRAFTS (Version history)
// ============================================

/**
 * Create a new draft version
 */
async function createDraft(sessionId, content, sourceStage, createdBy = null, creationType = 'agent') {
  // Get the next version number
  const versionResult = await db.query(
    'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM essay_collab_drafts WHERE session_id = $1',
    [sessionId]
  );
  const nextVersion = versionResult.rows[0].next_version;

  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

  const query = `
    INSERT INTO essay_collab_drafts (
      session_id, version, content, word_count, source_stage, created_by, creation_type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await db.query(query, [
    sessionId,
    nextVersion,
    content,
    wordCount,
    sourceStage,
    createdBy,
    creationType
  ]);

  // Update MongoDB with latest content
  const draft = await EssayCollaborationDraft.findOrCreateForSession(sessionId);
  if (createdBy) {
    const user = await db.query('SELECT username, role FROM users WHERE id = $1', [createdBy]);
    await draft.updateContent(content, createdBy, user.rows[0]?.username, user.rows[0]?.role);
  } else {
    draft.content = content;
    draft.wordCount = wordCount;
    draft.version += 1;
    await draft.save();
  }

  return result.rows[0];
}

/**
 * Get all draft versions for a session
 */
async function getDrafts(sessionId) {
  const query = `
    SELECT d.*,
           u.username as created_by_username
    FROM essay_collab_drafts d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.session_id = $1
    ORDER BY d.version DESC
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows;
}

/**
 * Get a specific draft version
 */
async function getDraft(sessionId, version) {
  const query = `
    SELECT d.*,
           u.username as created_by_username
    FROM essay_collab_drafts d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.session_id = $1 AND d.version = $2
  `;

  const result = await db.query(query, [sessionId, version]);
  return result.rows[0] || null;
}

/**
 * Get the latest draft
 */
async function getLatestDraft(sessionId) {
  const query = `
    SELECT d.*,
           u.username as created_by_username
    FROM essay_collab_drafts d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.session_id = $1
    ORDER BY d.version DESC
    LIMIT 1
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows[0] || null;
}

// ============================================
// COMMENTS
// ============================================

/**
 * Add an inline comment
 */
async function addComment(sessionId, userId, data) {
  const {
    draftId = null,
    selectionStart = null,
    selectionEnd = null,
    selectedText = null,
    content,
    commentType = 'comment'
  } = data;

  const query = `
    INSERT INTO essay_collab_comments (
      session_id, draft_id, user_id, selection_start, selection_end,
      selected_text, content, comment_type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const result = await db.query(query, [
    sessionId,
    draftId,
    userId,
    selectionStart,
    selectionEnd,
    selectedText,
    content,
    commentType
  ]);

  return result.rows[0];
}

/**
 * Get all comments for a session
 */
async function getComments(sessionId, includeResolved = true) {
  let query = `
    SELECT c.*,
           u.username,
           u.role as user_role
    FROM essay_collab_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.session_id = $1
  `;

  if (!includeResolved) {
    query += ' AND c.resolved = FALSE';
  }

  query += ' ORDER BY c.created_at DESC';

  const result = await db.query(query, [sessionId]);
  return result.rows;
}

/**
 * Resolve a comment
 */
async function resolveComment(commentId, userId) {
  const query = `
    UPDATE essay_collab_comments
    SET resolved = TRUE,
        resolved_by = $1,
        resolved_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [userId, commentId]);
  return result.rows[0];
}

/**
 * Update a comment
 */
async function updateComment(commentId, userId, content) {
  const query = `
    UPDATE essay_collab_comments
    SET content = $1
    WHERE id = $2 AND user_id = $3
    RETURNING *
  `;

  const result = await db.query(query, [content, commentId, userId]);
  return result.rows[0];
}

/**
 * Delete a comment
 */
async function deleteComment(commentId, userId) {
  const query = `
    DELETE FROM essay_collab_comments
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  const result = await db.query(query, [commentId, userId]);
  return result.rows[0];
}

// ============================================
// MESSAGES (Chat and system events)
// ============================================

/**
 * Add a message to the session
 */
async function addMessage(sessionId, userId, messageType, content, metadata = null) {
  const query = `
    INSERT INTO essay_collab_messages (
      session_id, user_id, message_type, content, metadata
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const result = await db.query(query, [
    sessionId,
    userId,
    messageType,
    content,
    metadata ? JSON.stringify(metadata) : null
  ]);

  return result.rows[0];
}

/**
 * Get messages for a session
 */
async function getMessages(sessionId, since = null, limit = 100) {
  let query = `
    SELECT m.*,
           u.username,
           u.role as user_role
    FROM essay_collab_messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.session_id = $1
  `;

  const values = [sessionId];

  if (since) {
    query += ' AND m.created_at > $2';
    values.push(since);
  }

  query += ' ORDER BY m.created_at ASC LIMIT $' + (values.length + 1);
  values.push(limit);

  const result = await db.query(query, values);
  return result.rows;
}

/**
 * Get recent messages (for reconnection sync)
 */
async function getRecentMessages(sessionId, count = 50) {
  const query = `
    SELECT m.*,
           u.username,
           u.role as user_role
    FROM essay_collab_messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.session_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2
  `;

  const result = await db.query(query, [sessionId, count]);
  return result.rows.reverse(); // Return in chronological order
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Delete a session (soft delete - archive)
 * @param {string} sessionId - Session UUID
 * @param {number} teacherId - Optional teacher ID for verification (if not provided, caller must verify)
 */
async function deleteSession(sessionId, teacherId = null) {
  // Verify ownership if teacherId is provided
  if (teacherId !== null) {
    const session = await getSession(sessionId);
    if (!session || session.teacher_id !== teacherId) {
      throw new Error('Unauthorized: Only the session teacher can delete the session');
    }
  }

  const query = `
    UPDATE essay_collab_sessions
    SET status = 'archived'
    WHERE id = $1
    RETURNING *
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows[0];
}

/**
 * Permanently delete a session (for cleanup)
 */
async function permanentlyDeleteSession(sessionId) {
  // Delete from PostgreSQL (cascades to related tables)
  await db.query('DELETE FROM essay_collab_sessions WHERE id = $1', [sessionId]);

  // Delete from MongoDB
  await EssayCollaborationDraft.deleteOne({ sessionId });
}

/**
 * Get full session state (for reconnection)
 */
async function getFullSessionState(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return null;

  // Get PostgreSQL data
  const [stages, drafts, comments, messages] = await Promise.all([
    getStageStates(sessionId),
    getDrafts(sessionId),
    getComments(sessionId),
    getRecentMessages(sessionId)
  ]);

  // Try to get MongoDB data, but don't fail if it's unavailable
  let mongoDraft = null;
  try {
    mongoDraft = await EssayCollaborationDraft.findOne({ sessionId });
  } catch (mongoErr) {
    console.warn('[EssaySessionDb] MongoDB fetch skipped:', mongoErr.message);
  }

  return {
    stages,
    drafts,
    comments,
    messages,
    agentOutputs: mongoDraft?.agentOutputs || {},
    currentContent: mongoDraft?.content || '',
    contentJson: mongoDraft?.contentJson || null
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user is a participant in the session
 */
async function isParticipant(sessionId, userId) {
  const query = `
    SELECT id FROM essay_collab_sessions
    WHERE id = $1 AND (teacher_id = $2 OR student_id = $2)
  `;

  const result = await db.query(query, [sessionId, userId]);
  return result.rows.length > 0;
}

/**
 * Get user's role in a session
 */
async function getUserRoleInSession(sessionId, userId) {
  const query = `
    SELECT
      CASE
        WHEN teacher_id = $2 THEN 'teacher'
        WHEN student_id = $2 THEN 'student'
        ELSE NULL
      END as session_role
    FROM essay_collab_sessions
    WHERE id = $1
  `;

  const result = await db.query(query, [sessionId, userId]);
  return result.rows[0]?.session_role || null;
}

/**
 * Get session statistics
 */
async function getSessionStats(sessionId) {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM essay_collab_stage_states WHERE session_id = $1 AND approval_status = 'approved') as stages_approved,
      (SELECT COUNT(*) FROM essay_collab_drafts WHERE session_id = $1) as draft_versions,
      (SELECT COUNT(*) FROM essay_collab_comments WHERE session_id = $1 AND resolved = FALSE) as unresolved_comments,
      (SELECT COUNT(*) FROM essay_collab_messages WHERE session_id = $1 AND message_type = 'chat') as chat_messages,
      (SELECT word_count FROM essay_collab_drafts WHERE session_id = $1 ORDER BY version DESC LIMIT 1) as current_word_count
  `;

  const result = await db.query(query, [sessionId]);
  return result.rows[0];
}

// ============================================
// ADDITIONAL UTILITY FUNCTIONS (for REST API)
// ============================================

/**
 * Get user sessions with filtering options
 * @param {number} userId - User ID
 * @param {string} role - User role ('teacher' or 'student')
 * @param {Object} options - Filter options
 */
async function getUserSessions(userId, role, options = {}) {
  const { status, limit = 20, offset = 0 } = options;
  const column = role === 'teacher' ? 'teacher_id' : 'student_id';

  let query = `
    SELECT
      s.*,
      t.username as teacher_username,
      st.username as student_username,
      (SELECT COUNT(*) FROM essay_collab_stage_states WHERE session_id = s.id) as stages_completed
    FROM essay_collab_sessions s
    LEFT JOIN users t ON s.teacher_id = t.id
    LEFT JOIN users st ON s.student_id = st.id
    WHERE s.${column} = $1
  `;

  const values = [userId];

  if (status) {
    query += ` AND s.status = $${values.length + 1}`;
    values.push(status);
  } else {
    query += ` AND s.status != 'archived'`;
  }

  query += ` ORDER BY s.updated_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);

  const result = await db.query(query, values);
  return result.rows;
}

/**
 * Update session settings
 */
async function updateSession(sessionId, updates) {
  const allowedFields = ['essay_prompt', 'university', 'target_word_count', 'student_profile', 'student_id', 'title'];
  const fieldMapping = {
    essayPrompt: 'essay_prompt',
    university: 'university',
    targetWordCount: 'target_word_count',
    studentProfile: 'student_profile',
    studentId: 'student_id',
    title: 'title'
  };

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMapping[key] || key;
    if (allowedFields.includes(dbField) && value !== undefined) {
      setClauses.push(`${dbField} = $${paramIndex}`);
      if (key === 'studentProfile') {
        values.push(value ? JSON.stringify(value) : null);
      } else {
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return await getSession(sessionId);
  }

  values.push(sessionId);
  const query = `
    UPDATE essay_collab_sessions
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Alias for getStageStates - get all stage states for a session
 */
async function getAllStageStates(sessionId) {
  return getStageStates(sessionId);
}

/**
 * Alias for getDrafts - get all drafts for a session
 */
async function getSessionDrafts(sessionId) {
  return getDrafts(sessionId);
}

/**
 * Alias for getComments - get all comments for a session
 */
async function getSessionComments(sessionId) {
  return getComments(sessionId);
}

/**
 * Get session messages with pagination options
 * @param {string} sessionId - Session UUID
 * @param {Object} options - Pagination options
 */
async function getSessionMessages(sessionId, options = {}) {
  const { limit = 50, before } = options;

  let query = `
    SELECT m.*,
           u.username,
           u.role as user_role
    FROM essay_collab_messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.session_id = $1
  `;

  const values = [sessionId];

  if (before) {
    query += ` AND m.created_at < $2`;
    values.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${values.length + 1}`;
  values.push(limit);

  const result = await db.query(query, values);
  return result.rows.reverse(); // Return in chronological order
}

/**
 * Get pending invitations for a student
 * Returns sessions where the student is assigned but not yet started
 */
async function getStudentInvitations(studentId) {
  const query = `
    SELECT
      s.*,
      t.username as teacher_username,
      t.email as teacher_email
    FROM essay_collab_sessions s
    LEFT JOIN users t ON s.teacher_id = t.id
    WHERE s.student_id = $1
      AND s.status IN ('draft', 'active')
      AND s.current_stage = 'not_started'
    ORDER BY s.created_at DESC
    LIMIT 20
  `;

  const result = await db.query(query, [studentId]);
  return result.rows;
}

module.exports = {
  // Session management
  createSession,
  getSession,
  getSessionsByUser,
  getUserSessions,
  updateSession,
  updateSessionStatus,
  updateSessionStage,
  setLangGraphThreadId,
  inviteStudent,
  getStudentInvitations,
  deleteSession,
  permanentlyDeleteSession,
  getFullSessionState,

  // Stage states
  createStageState,
  getStageStates,
  getAllStageStates,
  getStageState,
  getPendingStageState,
  updateStageApproval,
  addStudentFeedback,
  updateStageEditedOutput,

  // Drafts
  createDraft,
  getDrafts,
  getSessionDrafts,
  getDraft,
  getLatestDraft,

  // Comments
  addComment,
  getComments,
  getSessionComments,
  resolveComment,
  updateComment,
  deleteComment,

  // Messages
  addMessage,
  getMessages,
  getSessionMessages,
  getRecentMessages,

  // Utilities
  isParticipant,
  getUserRoleInSession,
  getSessionStats,
  STAGE_ORDER,
  STAGE_NAMES
};
