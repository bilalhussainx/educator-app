/**
 * Essay Collaboration Routes
 *
 * REST API endpoints for the collaborative essay writing system
 * with multi-agent LangGraph pipeline and human-in-the-loop checkpoints.
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const essaySessionDb = require('../services/essaySessionDb');
const { essayPipelineService, STAGES, APPROVAL_STATUS } = require('../services/essayAgents');
const EssayCollaborationDraft = require('../models/EssayCollaborationDraft');

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/essay-collab/sessions
 * @desc    Create a new essay collaboration session
 * @access  Private (Teacher only)
 */
router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const { studentId, essayPrompt, university, targetWordCount, studentProfile } = req.body;
    const teacherId = req.user.id;

    // Validate teacher role
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can create essay collaboration sessions'
      });
    }

    // Validate required fields
    if (!essayPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Essay prompt is required'
      });
    }

    // Create the session
    const session = await essaySessionDb.createSession({
      teacherId,
      studentId: studentId || null, // null for solo mode
      essayPrompt,
      university: university || null,
      targetWordCount: targetWordCount || 650,
      studentProfile: studentProfile || {}
    });

    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        teacherId: session.teacher_id,
        studentId: session.student_id,
        essayPrompt: session.essay_prompt,
        university: session.university,
        targetWordCount: session.target_word_count,
        currentStage: session.current_stage,
        status: session.status,
        createdAt: session.created_at
      }
    });
  } catch (error) {
    console.error('Error creating essay session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create essay session'
    });
  }
});

/**
 * @route   GET /api/essay-collab/sessions
 * @desc    List user's essay collaboration sessions
 * @access  Private
 */
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, limit = 20, offset = 0 } = req.query;

    const sessions = await essaySessionDb.getUserSessions(userId, role, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        teacherId: s.teacher_id,
        studentId: s.student_id,
        essayPrompt: s.essay_prompt,
        university: s.university,
        targetWordCount: s.target_word_count,
        currentStage: s.current_stage,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })),
      total: sessions.length
    });
  } catch (error) {
    console.error('Error listing essay sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list essay sessions'
    });
  }
});

/**
 * @route   GET /api/essay-collab/sessions/:id
 * @desc    Get session details with current state
 * @access  Private (Session participants only)
 */
router.get('/sessions/:id', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check access:
    // - Teacher who created the session can access
    // - Assigned student can access
    // - Any student can join via session ID (they get assigned automatically)
    const normalizedRole = (userRole || '').toLowerCase();
    const isTeacher = String(session.teacher_id) === String(userId);
    const isAssignedStudent = session.student_id && String(session.student_id) === String(userId);
    const isStudentWithAccess = normalizedRole === 'student';

    console.log('[EssayCollab] Access check:', {
      userId,
      userRole,
      normalizedRole,
      sessionTeacherId: session.teacher_id,
      sessionStudentId: session.student_id,
      isTeacher,
      isAssignedStudent,
      isStudentWithAccess
    });

    if (!isTeacher && !isAssignedStudent && !isStudentWithAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    // If a student is joining and no student is assigned yet, assign them
    if (normalizedRole === 'student' && !session.student_id) {
      await essaySessionDb.updateSession(sessionId, { studentId: userId });
      session.student_id = userId;
    }

    // Re-fetch session to get latest data (in case it was just updated)
    const freshSession = await essaySessionDb.getSession(sessionId);

    // Get full session state including agent outputs
    const fullState = await essaySessionDb.getFullSessionState(sessionId);

    console.log(`[EssayCollab] GET session ${sessionId}: currentStage=${freshSession.current_stage}, status=${freshSession.status}`);

    res.json({
      success: true,
      session: {
        id: freshSession.id,
        teacherId: freshSession.teacher_id,
        studentId: freshSession.student_id,
        essayPrompt: freshSession.essay_prompt,
        university: freshSession.university,
        targetWordCount: freshSession.target_word_count,
        studentProfile: freshSession.student_profile,
        currentStage: freshSession.current_stage,
        status: freshSession.status,
        createdAt: freshSession.created_at,
        updatedAt: freshSession.updated_at
      },
      state: fullState
    });
  } catch (error) {
    console.error('Error getting essay session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get essay session'
    });
  }
});

/**
 * @route   DELETE /api/essay-collab/sessions/:id
 * @desc    Delete a session (teacher only)
 * @access  Private (Teacher only)
 */
router.delete('/sessions/:id', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Only teacher can delete
    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the session teacher can delete this session'
      });
    }

    await essaySessionDb.deleteSession(sessionId);

    // Also delete MongoDB data
    await EssayCollaborationDraft.deleteOne({ sessionId });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting essay session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete essay session'
    });
  }
});

/**
 * @route   PUT /api/essay-collab/sessions/:id
 * @desc    Update session settings
 * @access  Private (Teacher or assigned student during setup)
 */
router.put('/sessions/:id', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { essayPrompt, university, targetWordCount, studentProfile, studentId } = req.body;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Allow teacher or assigned student to update during setup
    const isTeacher = String(session.teacher_id) === String(userId);
    const isAssignedStudent = session.student_id && String(session.student_id) === String(userId);

    if (!isTeacher && !isAssignedStudent) {
      return res.status(403).json({
        success: false,
        error: 'Only session participants can update this session'
      });
    }

    // Can't update if pipeline has started (except student profile)
    if (session.current_stage !== STAGES.NOT_STARTED) {
      // Only allow profile updates after pipeline has started
      if (!studentProfile || essayPrompt || university || targetWordCount || studentId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot update session after pipeline has started'
        });
      }
    }

    // Students can only update their profile, teachers can update everything
    let updateData;
    if (isTeacher) {
      // Teachers can update all settings
      updateData = { essayPrompt, university, targetWordCount, studentProfile, studentId };
    } else if (isAssignedStudent) {
      // Students can only update their profile
      if (essayPrompt || university || targetWordCount || studentId) {
        return res.status(403).json({
          success: false,
          error: 'Students can only update their profile'
        });
      }
      updateData = { studentProfile };
    } else {
      return res.status(403).json({
        success: false,
        error: 'Only session participants can update this session'
      });
    }

    const updated = await essaySessionDb.updateSession(sessionId, updateData);

    // Emit real-time update to all session participants
    const io = req.app.get('io');
    if (io) {
      io.to(`essay:${sessionId}`).emit('essay:session_updated', {
        sessionId,
        session: {
          id: updated.id,
          essayPrompt: updated.essay_prompt,
          university: updated.university,
          targetWordCount: updated.target_word_count,
          studentProfile: updated.student_profile,
          currentStage: updated.current_stage,
          status: updated.status
        }
      });
    }

    res.json({
      success: true,
      session: {
        id: updated.id,
        teacherId: updated.teacher_id,
        studentId: updated.student_id,
        essayPrompt: updated.essay_prompt,
        university: updated.university,
        targetWordCount: updated.target_word_count,
        studentProfile: updated.student_profile,
        currentStage: updated.current_stage,
        status: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating essay session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update essay session'
    });
  }
});

// ============================================================================
// PIPELINE CONTROL
// ============================================================================

/**
 * @route   POST /api/essay-collab/sessions/:id/start
 * @desc    Start the agent pipeline
 * @access  Private (Teacher only)
 */
router.post('/sessions/:id/start', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Only teacher can start the pipeline
    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can start the pipeline'
      });
    }

    // Get Socket.IO for real-time updates
    const io = req.app.get('io');

    // Update session stage in database FIRST (so polling works immediately)
    await essaySessionDb.updateSessionStage(sessionId, 'topic_analysis');
    await essaySessionDb.updateSessionStatus(sessionId, 'active');
    console.log(`[EssayCollab] Updated session ${sessionId} to stage: topic_analysis, status: active`);

    // Emit pipeline starting event to all participants
    if (io) {
      // Get all sockets in the room to verify
      const room = io.sockets.adapter.rooms.get(`essay:${sessionId}`);
      console.log(`[EssayCollab] Room essay:${sessionId} has ${room?.size || 0} connected clients`);

      io.to(`essay:${sessionId}`).emit('essay:pipeline_started', {
        sessionId,
        stage: 'topic_analysis'
      });
      console.log(`[EssayCollab] Emitted pipeline_started to room essay:${sessionId}`);
    } else {
      console.warn('[EssayCollab] Socket.IO not available for real-time updates');
    }

    // Start the pipeline (runs asynchronously)
    essayPipelineService.startSession(sessionId, io).then(state => {
      // Emit completion/stage update
      if (io) {
        io.to(`essay:${sessionId}`).emit('essay:stage_complete', {
          sessionId,
          currentStage: state.currentStage,
          awaitingApproval: state.awaitingApproval,
          agentOutput: state.topicAnalysis || state.agentOutput
        });
      }
    }).catch(err => {
      console.error('Pipeline error:', err);
      if (io) {
        io.to(`essay:${sessionId}`).emit('essay:error', {
          sessionId,
          error: err.message
        });
      }
    });

    // Return immediately while pipeline runs
    res.json({
      success: true,
      message: 'Pipeline started',
      state: {
        currentStage: 'topic_analysis',
        awaitingApproval: false
      }
    });
  } catch (error) {
    console.error('Error starting pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start pipeline'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/approve
 * @desc    Approve current stage (teacher or student)
 * @access  Private (Session participants)
 */
router.post('/sessions/:id/approve', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { feedback, editedOutput } = req.body;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check access - both teacher and student can provide approval
    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    // Approve the stage
    const state = await essayPipelineService.approveStage(sessionId, userId, feedback, editedOutput);

    res.json({
      success: true,
      message: 'Stage approved',
      state: {
        currentStage: state.currentStage,
        awaitingApproval: state.awaitingApproval
      }
    });
  } catch (error) {
    console.error('Error approving stage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve stage'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/revise
 * @desc    Request revision of current stage
 * @access  Private (Session participants)
 */
router.post('/sessions/:id/revise', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        error: 'Feedback is required when requesting revision'
      });
    }

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check access
    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    // Request revision
    const state = await essayPipelineService.requestRevision(sessionId, userId, feedback);

    res.json({
      success: true,
      message: 'Revision requested',
      state: {
        currentStage: state.currentStage,
        awaitingApproval: state.awaitingApproval
      }
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to request revision'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/pause
 * @desc    Pause the session
 * @access  Private (Teacher only)
 */
router.post('/sessions/:id/pause', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can pause the session'
      });
    }

    await essayPipelineService.pauseSession(sessionId);

    res.json({
      success: true,
      message: 'Session paused'
    });
  } catch (error) {
    console.error('Error pausing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause session'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/resume
 * @desc    Resume a paused session
 * @access  Private (Teacher only)
 */
router.post('/sessions/:id/resume', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can resume the session'
      });
    }

    const state = await essayPipelineService.resumeSession(sessionId);

    res.json({
      success: true,
      message: 'Session resumed',
      state
    });
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume session'
    });
  }
});

// ============================================================================
// STAGE DATA
// ============================================================================

/**
 * @route   GET /api/essay-collab/sessions/:id/stages
 * @desc    Get all stage states for a session
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/stages', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const stages = await essaySessionDb.getAllStageStates(sessionId);

    res.json({
      success: true,
      stages
    });
  } catch (error) {
    console.error('Error getting stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stages'
    });
  }
});

/**
 * @route   GET /api/essay-collab/sessions/:id/stages/:stage
 * @desc    Get specific stage state
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/stages/:stage', verifyToken, async (req, res) => {
  try {
    const { id: sessionId, stage } = req.params;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const stageState = await essaySessionDb.getStageState(sessionId, stage);

    if (!stageState) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found'
      });
    }

    res.json({
      success: true,
      stage: stageState
    });
  } catch (error) {
    console.error('Error getting stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stage'
    });
  }
});

/**
 * @route   PUT /api/essay-collab/sessions/:id/stages/:stage/edit
 * @desc    Edit agent output before approving
 * @access  Private (Teacher only)
 */
router.put('/sessions/:id/stages/:stage/edit', verifyToken, async (req, res) => {
  try {
    const { id: sessionId, stage } = req.params;
    const userId = req.user.id;
    const { editedOutput } = req.body;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can edit stage outputs'
      });
    }

    await essayPipelineService.editStageOutput(sessionId, userId, editedOutput);

    res.json({
      success: true,
      message: 'Stage output edited'
    });
  } catch (error) {
    console.error('Error editing stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit stage'
    });
  }
});

// ============================================================================
// DRAFTS
// ============================================================================

/**
 * @route   GET /api/essay-collab/sessions/:id/drafts
 * @desc    Get all drafts for a session
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/drafts', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const drafts = await essaySessionDb.getSessionDrafts(sessionId);

    res.json({
      success: true,
      drafts
    });
  } catch (error) {
    console.error('Error getting drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get drafts'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/drafts
 * @desc    Save a new draft (manual save during editing)
 * @access  Private (Session participants)
 */
router.post('/sessions/:id/drafts', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { content, stage } = req.body;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const creationType = String(session.teacher_id) === String(userId) ? 'teacher_edit' : 'student_edit';
    const draft = await essaySessionDb.createDraft(
      sessionId,
      content,
      stage || session.current_stage,
      userId,
      creationType
    );

    res.status(201).json({
      success: true,
      draft
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create draft'
    });
  }
});

/**
 * @route   GET /api/essay-collab/sessions/:id/drafts/latest
 * @desc    Get the latest draft
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/drafts/latest', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const draft = await essaySessionDb.getLatestDraft(sessionId);

    res.json({
      success: true,
      draft
    });
  } catch (error) {
    console.error('Error getting latest draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest draft'
    });
  }
});

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * @route   GET /api/essay-collab/sessions/:id/comments
 * @desc    Get all inline comments for a session
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/comments', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const comments = await essaySessionDb.getSessionComments(sessionId);

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/comments
 * @desc    Add an inline comment
 * @access  Private (Session participants)
 */
router.post('/sessions/:id/comments', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { startOffset, endOffset, content, highlightedText, draftId, commentType } = req.body;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const comment = await essaySessionDb.addComment(
      sessionId,
      userId,
      {
        selectionStart: startOffset,
        selectionEnd: endOffset,
        selectedText: highlightedText,
        content,
        draftId,
        commentType
      }
    );

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

/**
 * @route   PUT /api/essay-collab/sessions/:id/comments/:commentId/resolve
 * @desc    Resolve a comment
 * @access  Private (Session participants)
 */
router.put('/sessions/:id/comments/:commentId/resolve', verifyToken, async (req, res) => {
  try {
    const { id: sessionId, commentId } = req.params;
    const userId = req.user.id;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    await essaySessionDb.resolveComment(commentId, userId);

    res.json({
      success: true,
      message: 'Comment resolved'
    });
  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve comment'
    });
  }
});

/**
 * @route   DELETE /api/essay-collab/sessions/:id/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (Comment author only)
 */
router.delete('/sessions/:id/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    await essaySessionDb.deleteComment(commentId, userId);

    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete comment'
    });
  }
});

// ============================================================================
// CHAT / MESSAGES
// ============================================================================

/**
 * @route   GET /api/essay-collab/sessions/:id/messages
 * @desc    Get chat messages for a session
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/messages', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const messages = await essaySessionDb.getSessionMessages(sessionId, {
      limit: parseInt(limit),
      before
    });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/messages
 * @desc    Send a chat message
 * @access  Private (Session participants)
 */
router.post('/sessions/:id/messages', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { content, metadata } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    const message = await essaySessionDb.addMessage(
      sessionId,
      userId,
      'chat',
      content,
      metadata || {}
    );

    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(`essay:${sessionId}`).emit('essay:message', {
        sessionId,
        message
      });
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * @route   POST /api/essay-collab/sessions/:id/feedback
 * @desc    Add student feedback for current stage
 * @access  Private (Student only)
 */
router.post('/sessions/:id/feedback', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        error: 'Feedback is required'
      });
    }

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!session.student_id || String(session.student_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the student can add student feedback'
      });
    }

    await essayPipelineService.addStudentFeedback(sessionId, userId, feedback);

    res.json({
      success: true,
      message: 'Feedback added'
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add feedback'
    });
  }
});

// ============================================================================
// INVITATIONS / NOTIFICATIONS
// ============================================================================

/**
 * @route   POST /api/essay-collab/sessions/:id/invite
 * @desc    Send invitation to a student
 * @access  Private (Teacher only)
 */
router.post('/sessions/:id/invite', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the session teacher can send invitations'
      });
    }

    // Update session with student ID if not already set
    if (!session.student_id) {
      await essaySessionDb.updateSession(sessionId, { studentId });
    }

    // Emit via Socket.IO to notify the student
    const io = req.app.get('io');
    if (io) {
      // Emit to the student's personal room
      io.to(`user:${studentId}`).emit('essay:invitation', {
        sessionId,
        teacherId: userId,
        essayPrompt: session.essay_prompt,
        university: session.university,
        targetWordCount: session.target_word_count
      });
    }

    res.json({
      success: true,
      message: 'Invitation sent'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation'
    });
  }
});

/**
 * @route   GET /api/essay-collab/invitations
 * @desc    Get pending invitations for a student
 * @access  Private (Student only)
 */
router.get('/invitations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can view invitations'
      });
    }

    // Get sessions where the student is invited but hasn't joined yet
    const sessions = await essaySessionDb.getStudentInvitations(userId);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        teacherId: s.teacher_id,
        essayPrompt: s.essay_prompt,
        university: s.university,
        targetWordCount: s.target_word_count,
        currentStage: s.current_stage,
        status: s.status,
        createdAt: s.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting invitations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invitations'
    });
  }
});

// ============================================================================
// EXPORT / UTILITIES
// ============================================================================

/**
 * @route   GET /api/essay-collab/sessions/:id/export
 * @desc    Export the final essay
 * @access  Private (Session participants)
 */
router.get('/sessions/:id/export', verifyToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { format = 'json' } = req.query;

    const session = await essaySessionDb.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (String(session.teacher_id) !== String(userId) && (!session.student_id || String(session.student_id) !== String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    // Get the MongoDB draft with full content
    const mongoDraft = await EssayCollaborationDraft.findOne({ sessionId });

    if (!mongoDraft || !mongoDraft.content) {
      return res.status(404).json({
        success: false,
        error: 'No essay content found'
      });
    }

    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="essay-${sessionId}.txt"`);
      return res.send(mongoDraft.content);
    }

    // Default JSON format
    res.json({
      success: true,
      essay: {
        content: mongoDraft.content,
        wordCount: mongoDraft.wordCount,
        prompt: session.essay_prompt,
        university: session.university,
        createdAt: session.created_at,
        completedAt: session.updated_at,
        agentOutputs: mongoDraft.agentOutputs
      }
    });
  } catch (error) {
    console.error('Error exporting essay:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export essay'
    });
  }
});

/**
 * @route   GET /api/essay-collab/stats
 * @desc    Get pipeline statistics (admin/debug)
 * @access  Private (Teacher only)
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const stats = essayPipelineService.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

module.exports = router;
