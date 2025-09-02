// routes/recordingRoutes.js
// Routes for handling recorded sessions and webhooks

const express = require('express');
const router = express.Router();
const db = require('../db');
const { addProcessingJob } = require('../services/processingService');
const intelligentRecordingService = require('../services/intelligentRecordingService');
const translationService = require('../services/translationService');

// Webhook endpoint for Agora recording completion
// Agora will call this when recording is finished
router.post('/webhook/recording-complete', async (req, res) => {
    try {
        console.log('[RECORDING WEBHOOK] Received recording completion:', req.body);
        
        const { resourceId, sid, fileList } = req.body;
        
        if (!resourceId || !sid) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Find the recording in our database
        const result = await db.query(
            'SELECT * FROM recorded_sessions WHERE agora_recording_resource_id = $1 AND agora_recording_sid = $2',
            [resourceId, sid]
        );

        if (result.rows.length === 0) {
            console.log('[RECORDING WEBHOOK] Recording not found in database');
            return res.status(404).json({ error: 'Recording not found' });
        }

        const recording = result.rows[0];
        
        // Extract video URL from fileList (Agora provides download URLs)
        let videoUrl = null;
        if (fileList && fileList.length > 0) {
            // Find MP4 file or use first available file
            const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
            const targetFile = mp4File || fileList[0];
            videoUrl = targetFile ? targetFile.fileName : null; // Agora provides download URL
        }

        // Update database with video URL and set status to transcribing
        await db.query(
            'UPDATE recorded_sessions SET video_url = $1, processing_status = $2, updated_at = NOW() WHERE id = $3',
            [videoUrl, 'transcribing', recording.id]
        );

        // Add transcription job to the queue
        if (videoUrl) {
            const { processingQueue } = require('../services/processingService');
            await processingQueue.add('transcribe-recording', {
                recordingId: recording.id,
                videoUrl: videoUrl,
                courseId: recording.course_id,
                teacherId: recording.teacher_id
            });
        }

        console.log(`[RECORDING WEBHOOK] Recording ${recording.id} processed and transcription job queued`);
        
        res.status(200).json({ success: true, message: 'Recording processed' });
        
    } catch (error) {
        console.error('[RECORDING WEBHOOK] Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recordings for a course (teacher view - shows teacher's own live session recordings)
router.get('/course/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req.user; // From auth middleware
        
        console.log(`[RECORDINGS] Teacher recordings request for teacher: "${userId}"`);
        
        // Show all recordings created by this teacher (from live tutoring sessions)
        const recordings = await db.query(`
            SELECT 
                id,
                title,
                description,
                video_url,
                ai_summary,
                ai_topics,
                processing_status,
                recorded_at,
                created_at,
                course_id
            FROM recorded_sessions 
            WHERE teacher_id = $1
            ORDER BY recorded_at DESC
        `, [userId]);

        console.log(`[RECORDINGS] Found ${recordings.rows.length} recordings created by teacher ${userId}`);
        res.json({ recordings: recordings.rows });
        
    } catch (error) {
        console.error('[RECORDINGS] Error fetching recordings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recordings for students (filtered by course)
router.get('/course/:courseId/student', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        console.log(`[RECORDINGS] Student recordings request for courseId: "${courseId}"`);
        
        // Handle both UUID and integer course IDs for backward compatibility
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(courseId);
        const isInteger = /^\d+$/.test(courseId);
        
        if (!isUuid && !isInteger) {
            console.error(`[RECORDINGS] Invalid course ID format: "${courseId}"`);
            return res.status(400).json({ 
                error: 'Invalid course ID format. Expected UUID or integer.',
                details: `Received courseId: "${courseId}". This should be either a UUID format or an integer.`,
                suggestion: 'Check that you are using the correct course ID from the course data.'
            });
        }
        
        // If it's an integer, convert it to look up the course by its integer ID first, then get the UUID
        let actualCourseId = courseId;
        if (isInteger) {
            console.log(`[RECORDINGS] Converting integer courseId "${courseId}" to UUID`);
            // Look up the course by integer ID to get the UUID
            const courseResult = await db.query(
                'SELECT id FROM courses WHERE id::text = $1 OR title ILIKE $2',
                [courseId, `%Course ${courseId}%`]
            );
            
            if (courseResult.rows.length === 0) {
                console.log(`[RECORDINGS] No course found for integer ID: "${courseId}"`);
                return res.json({ recordings: [] }); // Return empty array instead of error for better UX
            }
            
            actualCourseId = courseResult.rows[0].id;
            console.log(`[RECORDINGS] Found course UUID: "${actualCourseId}" for integer ID: "${courseId}"`);
        }
        
        // Show recordings for this specific course only
        const recordings = await db.query(`
            SELECT 
                id,
                title,
                description,
                video_url,
                ai_summary,
                ai_topics,
                recorded_at,
                processing_status
            FROM recorded_sessions 
            WHERE course_id = $1 AND processing_status IN ('completed', 'processing', 'transcribing', 'enriching')
            ORDER BY recorded_at DESC
        `, [actualCourseId]);

        console.log(`[RECORDINGS] Found ${recordings.rows.length} recordings for course ${courseId}`);
        res.json({ recordings: recordings.rows });
        
    } catch (error) {
        console.error('[RECORDINGS] Error fetching student recordings:', {
            error: error.message,
            stack: error.stack,
            courseId: req.params.courseId,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update recording metadata (teacher only)
router.put('/:recordingId', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const { title, description } = req.body;
        const { userId } = req.user;

        // Verify ownership
        const recording = await db.query(
            'SELECT teacher_id FROM recorded_sessions WHERE id = $1',
            [recordingId]
        );

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        if (recording.rows[0].teacher_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Update recording
        await db.query(
            'UPDATE recorded_sessions SET title = $1, description = $2, updated_at = NOW() WHERE id = $3',
            [title, description, recordingId]
        );

        res.json({ success: true, message: 'Recording updated' });
        
    } catch (error) {
        console.error('[RECORDINGS] Error updating recording:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete recording (teacher only)
router.delete('/:recordingId', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const { userId } = req.user;

        // Verify ownership
        const recording = await db.query(
            'SELECT teacher_id FROM recorded_sessions WHERE id = $1',
            [recordingId]
        );

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        if (recording.rows[0].teacher_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Delete recording
        await db.query('DELETE FROM recorded_sessions WHERE id = $1', [recordingId]);

        res.json({ success: true, message: 'Recording deleted' });
        
    } catch (error) {
        console.error('[RECORDINGS] Error deleting recording:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Intelligent search endpoint for students
router.post('/course/:courseId/search', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { query } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const result = await intelligentRecordingService.searchRecordingsByQuery(courseId, query);
        res.json(result);
        
    } catch (error) {
        console.error('[RECORDINGS] Error in intelligent search:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get suggested recordings based on topics
router.get('/course/:courseId/suggestions', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { topics } = req.query;
        
        const topicsArray = topics ? topics.split(',').map(t => t.trim()) : [];
        const suggestions = await intelligentRecordingService.getSuggestedRecordings(courseId, topicsArray);
        
        res.json({ suggestions });
        
    } catch (error) {
        console.error('[RECORDINGS] Error getting suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate personalized study plan
router.post('/course/:courseId/study-plan', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { goals } = req.body;
        
        const studyPlan = await intelligentRecordingService.generateStudyPlan(courseId, goals);
        res.json(studyPlan);
        
    } catch (error) {
        console.error('[RECORDINGS] Error generating study plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Translation endpoints

// Get supported languages
router.get('/translations/languages', (req, res) => {
    res.json({ 
        languages: translationService.getSupportedLanguages() 
    });
});

// Translate a single recording
router.post('/:recordingId/translate/:languageCode', async (req, res) => {
    try {
        const { recordingId, languageCode } = req.params;
        const { userId } = req.user; // From auth middleware

        // Verify user has access to this recording (either teacher or student in course)
        const recording = await db.query(`
            SELECT rs.*, c.teacher_id 
            FROM recorded_sessions rs 
            JOIN courses c ON rs.course_id = c.id 
            LEFT JOIN enrollments e ON c.id = e.course_id 
            WHERE rs.id = $1 AND (c.teacher_id = $2 OR e.student_id = $2)
        `, [recordingId, userId]);

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found or access denied' });
        }

        const translation = await translationService.translateRecording(recordingId, languageCode);
        res.json({ translation });

    } catch (error) {
        console.error('[RECORDINGS] Error translating recording:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get translation for a recording
router.get('/:recordingId/translate/:languageCode', async (req, res) => {
    try {
        const { recordingId, languageCode } = req.params;
        const { userId } = req.user;

        // Verify access
        const recording = await db.query(`
            SELECT rs.*, c.teacher_id 
            FROM recorded_sessions rs 
            JOIN courses c ON rs.course_id = c.id 
            LEFT JOIN enrollments e ON c.id = e.course_id 
            WHERE rs.id = $1 AND (c.teacher_id = $2 OR e.student_id = $2)
        `, [recordingId, userId]);

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found or access denied' });
        }

        const translation = await translationService.getTranslation(recordingId, languageCode);
        
        if (!translation) {
            return res.status(404).json({ error: 'Translation not found' });
        }

        res.json({ translation });

    } catch (error) {
        console.error('[RECORDINGS] Error getting translation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all available translations for a recording
router.get('/:recordingId/translations', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const { userId } = req.user;

        // Verify access
        const recording = await db.query(`
            SELECT rs.*, c.teacher_id 
            FROM recorded_sessions rs 
            JOIN courses c ON rs.course_id = c.id 
            LEFT JOIN enrollments e ON c.id = e.course_id 
            WHERE rs.id = $1 AND (c.teacher_id = $2 OR e.student_id = $2)
        `, [recordingId, userId]);

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found or access denied' });
        }

        const translations = await translationService.getRecordingTranslations(recordingId);
        res.json({ translations });

    } catch (error) {
        console.error('[RECORDINGS] Error getting translations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Batch translate all recordings in a course (teacher only)
router.post('/course/:courseId/batch-translate/:languageCode', async (req, res) => {
    try {
        const { courseId, languageCode } = req.params;
        const { userId } = req.user;

        // Verify teacher access
        const course = await db.query(
            'SELECT * FROM courses WHERE id = $1 AND teacher_id = $2',
            [courseId, userId]
        );

        if (course.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied. Only course teachers can batch translate.' });
        }

        const results = await translationService.batchTranslateRecordings(courseId, languageCode);
        res.json({ results });

    } catch (error) {
        console.error('[RECORDINGS] Error in batch translation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Delete translation (teacher only)
router.delete('/:recordingId/translate/:languageCode', async (req, res) => {
    try {
        const { recordingId, languageCode } = req.params;
        const { userId } = req.user;

        // Verify teacher access to the recording
        const recording = await db.query(`
            SELECT rs.*, c.teacher_id 
            FROM recorded_sessions rs 
            JOIN courses c ON rs.course_id = c.id 
            WHERE rs.id = $1 AND c.teacher_id = $2
        `, [recordingId, userId]);

        if (recording.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found or access denied' });
        }

        await translationService.deleteTranslation(recordingId, languageCode);
        res.json({ success: true, message: 'Translation deleted' });

    } catch (error) {
        console.error('[RECORDINGS] Error deleting translation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get individual recording by ID
router.get('/:recordingId', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const { userId } = req.user;

        // Get recording and verify access (students can access all recordings, teachers can access their own)
        const result = await db.query(`
            SELECT rs.*, c.teacher_id, c.title as course_title
            FROM recorded_sessions rs 
            JOIN courses c ON rs.course_id = c.id 
            WHERE rs.id = $1
        `, [recordingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        const recording = result.rows[0];

        // Check if user has access (either teacher who owns it or any authenticated user for student view)
        if (recording.teacher_id !== userId) {
            // For students, we allow access to all completed recordings
            if (recording.processing_status !== 'completed') {
                return res.status(403).json({ error: 'Recording not yet available' });
            }
        }

        res.json(recording);

    } catch (error) {
        console.error('[RECORDINGS] Error fetching individual recording:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;