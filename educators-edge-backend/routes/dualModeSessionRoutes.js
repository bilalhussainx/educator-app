const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db/db');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Create a new dual-mode session
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { title, description, mode, lessonId, courseId } = req.body;
    const teacherId = req.user.userId;

    const query = `
      INSERT INTO dual_mode_sessions (teacher_id, title, description, session_mode, lesson_id, course_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [teacherId, title, description, mode, lessonId, courseId]);
    const session = result.rows[0];

    res.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        mode: session.session_mode,
        teacherId: session.teacher_id,
        lessonId: session.lesson_id,
        courseId: session.course_id,
        status: session.status,
        createdAt: session.created_at
      }
    });
  } catch (error) {
    console.error('Error creating dual-mode session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Join a dual-mode session
router.post('/:sessionId/join', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { role } = req.body;

    // Check if session exists and is active
    const sessionQuery = 'SELECT * FROM dual_mode_sessions WHERE id = $1 AND status = $2';
    const sessionResult = await pool.query(sessionQuery, [sessionId, 'active']);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    const session = sessionResult.rows[0];

    // Check if user is already in session
    const participantQuery = 'SELECT * FROM session_participants WHERE session_id = $1 AND user_id = $2';
    const participantResult = await pool.query(participantQuery, [sessionId, userId]);

    if (participantResult.rows.length === 0) {
      // Add user to session participants
      const insertQuery = `
        INSERT INTO session_participants (session_id, user_id, role, joined_at, status)
        VALUES ($1, $2, $3, NOW(), 'active')
      `;
      await pool.query(insertQuery, [sessionId, userId, role]);
    }

    // Get all participants
    const participantsQuery = `
      SELECT sp.*, u.username, u.display_name
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = $1 AND sp.status = 'active'
    `;
    const participantsResult = await pool.query(participantsQuery, [sessionId]);

    res.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        mode: session.session_mode,
        teacherId: session.teacher_id,
        status: session.status
      },
      participants: participantsResult.rows.map(p => ({
        id: p.user_id,
        username: p.username,
        displayName: p.display_name,
        role: p.role,
        joinedAt: p.joined_at
      }))
    });
  } catch (error) {
    console.error('Error joining dual-mode session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Get session details
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Check if user is participant in session
    const participantQuery = 'SELECT * FROM session_participants WHERE session_id = $1 AND user_id = $2 AND status = $3';
    const participantResult = await pool.query(participantQuery, [sessionId, userId, 'active']);

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    // Get session details
    const sessionQuery = `
      SELECT ds.*, u.username as teacher_name, u.display_name as teacher_display_name
      FROM dual_mode_sessions ds
      JOIN users u ON ds.teacher_id = u.id
      WHERE ds.id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get participants
    const participantsQuery = `
      SELECT sp.*, u.username, u.display_name
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = $1 AND sp.status = 'active'
    `;
    const participantsResult = await pool.query(participantsQuery, [sessionId]);

    // Get essay homework assignments if in essay mode
    let homeworkAssignments = [];
    if (session.session_mode === 'essay') {
      const homeworkQuery = `
        SELECT * FROM essay_homework_assignments
        WHERE session_id = $1
        ORDER BY created_at DESC
      `;
      const homeworkResult = await pool.query(homeworkQuery, [sessionId]);
      homeworkAssignments = homeworkResult.rows;
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        mode: session.session_mode,
        teacherId: session.teacher_id,
        teacherName: session.teacher_name,
        teacherDisplayName: session.teacher_display_name,
        status: session.status,
        createdAt: session.created_at,
        lessonId: session.lesson_id,
        courseId: session.course_id
      },
      participants: participantsResult.rows.map(p => ({
        id: p.user_id,
        username: p.username,
        displayName: p.display_name,
        role: p.role,
        joinedAt: p.joined_at
      })),
      homeworkAssignments
    });
  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// Leave session
router.post('/:sessionId/leave', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const query = `
      UPDATE session_participants
      SET status = 'left', left_at = NOW()
      WHERE session_id = $1 AND user_id = $2
    `;
    await pool.query(query, [sessionId, userId]);

    res.json({ success: true, message: 'Left session successfully' });
  } catch (error) {
    console.error('Error leaving session:', error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

// Update session mode (teacher only)
router.put('/:sessionId/mode', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { mode } = req.body;
    const userId = req.user.userId;

    // Check if user is the teacher
    const sessionQuery = 'SELECT * FROM dual_mode_sessions WHERE id = $1 AND teacher_id = $2';
    const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only the teacher can change session mode' });
    }

    // Update session mode
    const updateQuery = 'UPDATE dual_mode_sessions SET session_mode = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(updateQuery, [mode, sessionId]);

    res.json({
      success: true,
      session: {
        id: result.rows[0].id,
        mode: result.rows[0].session_mode,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating session mode:', error);
    res.status(500).json({ error: 'Failed to update session mode' });
  }
});

// Create essay homework assignment
router.post('/:sessionId/essay-homework', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { title, description, instructions, dueDate, maxWords, referenceDocument } = req.body;

    // Check if user is the teacher
    const sessionQuery = 'SELECT * FROM dual_mode_sessions WHERE id = $1 AND teacher_id = $2';
    const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only the teacher can assign homework' });
    }

    // Create homework assignment
    const insertQuery = `
      INSERT INTO essay_homework_assignments
      (session_id, teacher_id, title, description, instructions, due_date, max_words, reference_document, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      sessionId, userId, title, description, instructions, dueDate, maxWords,
      referenceDocument ? JSON.stringify(referenceDocument) : null
    ]);

    const assignment = result.rows[0];

    res.json({
      success: true,
      assignment: {
        id: assignment.id,
        sessionId: assignment.session_id,
        teacherId: assignment.teacher_id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        dueDate: assignment.due_date,
        maxWords: assignment.max_words,
        referenceDocument: assignment.reference_document ? JSON.parse(assignment.reference_document) : null,
        createdAt: assignment.created_at
      }
    });
  } catch (error) {
    console.error('Error creating essay homework:', error);
    res.status(500).json({ error: 'Failed to create essay homework' });
  }
});

// Submit essay homework
router.post('/:sessionId/essay-homework/:assignmentId/submit', authenticateToken, async (req, res) => {
  try {
    const { sessionId, assignmentId } = req.params;
    const userId = req.user.userId;
    const { content, wordCount } = req.body;

    // Check if assignment exists
    const assignmentQuery = 'SELECT * FROM essay_homework_assignments WHERE id = $1 AND session_id = $2';
    const assignmentResult = await pool.query(assignmentQuery, [assignmentId, sessionId]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Create or update submission
    const submissionQuery = `
      INSERT INTO essay_homework_submissions
      (assignment_id, student_id, content, word_count, submitted_at, status)
      VALUES ($1, $2, $3, $4, NOW(), 'submitted')
      ON CONFLICT (assignment_id, student_id)
      DO UPDATE SET content = $3, word_count = $4, submitted_at = NOW(), status = 'submitted'
      RETURNING *
    `;

    const result = await pool.query(submissionQuery, [assignmentId, userId, content, wordCount]);

    res.json({
      success: true,
      submission: {
        id: result.rows[0].id,
        assignmentId: result.rows[0].assignment_id,
        studentId: result.rows[0].student_id,
        content: result.rows[0].content,
        wordCount: result.rows[0].word_count,
        submittedAt: result.rows[0].submitted_at,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Error submitting essay homework:', error);
    res.status(500).json({ error: 'Failed to submit essay homework' });
  }
});

// Get essay homework submissions (teacher only)
router.get('/:sessionId/essay-homework/:assignmentId/submissions', authenticateToken, async (req, res) => {
  try {
    const { sessionId, assignmentId } = req.params;
    const userId = req.user.userId;

    // Check if user is the teacher
    const sessionQuery = 'SELECT * FROM dual_mode_sessions WHERE id = $1 AND teacher_id = $2';
    const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only the teacher can view submissions' });
    }

    // Get submissions
    const submissionsQuery = `
      SELECT ehs.*, u.username, u.display_name
      FROM essay_homework_submissions ehs
      JOIN users u ON ehs.student_id = u.id
      WHERE ehs.assignment_id = $1
      ORDER BY ehs.submitted_at DESC
    `;

    const result = await pool.query(submissionsQuery, [assignmentId]);

    res.json({
      success: true,
      submissions: result.rows.map(s => ({
        id: s.id,
        assignmentId: s.assignment_id,
        studentId: s.student_id,
        studentName: s.username,
        studentDisplayName: s.display_name,
        content: s.content,
        wordCount: s.word_count,
        submittedAt: s.submitted_at,
        status: s.status,
        grade: s.grade,
        feedback: s.feedback
      }))
    });
  } catch (error) {
    console.error('Error getting essay submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Grade essay homework submission (teacher only)
router.put('/:sessionId/essay-homework/:assignmentId/submissions/:submissionId/grade', authenticateToken, async (req, res) => {
  try {
    const { sessionId, assignmentId, submissionId } = req.params;
    const userId = req.user.userId;
    const { grade, feedback } = req.body;

    // Check if user is the teacher
    const sessionQuery = 'SELECT * FROM dual_mode_sessions WHERE id = $1 AND teacher_id = $2';
    const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only the teacher can grade submissions' });
    }

    // Update submission grade
    const updateQuery = `
      UPDATE essay_homework_submissions
      SET grade = $1, feedback = $2, graded_at = NOW(), status = 'graded'
      WHERE id = $3 AND assignment_id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [grade, feedback, submissionId, assignmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      success: true,
      submission: {
        id: result.rows[0].id,
        grade: result.rows[0].grade,
        feedback: result.rows[0].feedback,
        gradedAt: result.rows[0].graded_at,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Error grading essay submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

module.exports = router;