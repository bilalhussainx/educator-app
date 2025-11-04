/**
 * =================================================================
 * SESSION NOTIFICATION HANDLER
 * =================================================================
 * Handles real-time notifications for live session events
 * Broadcasts session creation to enrolled students
 * =================================================================
 */

const db = require('../../db');

class SessionNotificationHandler {
    constructor(io) {
        this.io = io;
        this.userSocketMap = new Map(); // userId -> Set of socket IDs
        this.activeSessions = new Map(); // sessionId -> session notification data
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[Session Notifications] Client connected: ${socket.id}`);

            // User registers for notifications
            socket.on('register:notifications', async (userId) => {
                if (!userId) {
                    console.error('[Session Notifications] Missing userId in registration');
                    return;
                }

                // Track this socket for the user
                if (!this.userSocketMap.has(userId)) {
                    this.userSocketMap.set(userId, new Set());
                }
                this.userSocketMap.get(userId).add(socket.id);

                // Store userId on socket for cleanup
                socket.userId = userId;

                console.log(`[Session Notifications] User ${userId} registered for notifications (socket: ${socket.id})`);
                console.log(`[Session Notifications] Total sockets for user ${userId}: ${this.userSocketMap.get(userId).size}`);

                // Get active sessions for user's enrolled courses
                try {
                    const activeSessions = await this.getActiveSessionsForUser(userId);
                    console.log(`[Session Notifications] Found ${activeSessions.length} active sessions for user ${userId}`);

                    // Send confirmation with active sessions
                    socket.emit('notifications:registered', {
                        success: true,
                        userId,
                        message: 'Successfully registered for live session notifications',
                        activeSessions // Include active sessions
                    });
                } catch (error) {
                    console.error('[Session Notifications] Error fetching active sessions:', error);
                    // Still send confirmation even if active sessions fetch fails
                    socket.emit('notifications:registered', {
                        success: true,
                        userId,
                        message: 'Successfully registered for live session notifications',
                        activeSessions: []
                    });
                }
            });

            // User unregisters from notifications
            socket.on('unregister:notifications', () => {
                this.removeSocket(socket);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`[Session Notifications] Client disconnected: ${socket.id}`);
                this.removeSocket(socket);
            });
        });

        console.log('[Session Notifications] ✅ Handler initialized');
    }

    /**
     * Remove a socket from tracking
     */
    removeSocket(socket) {
        if (socket.userId) {
            const userSockets = this.userSocketMap.get(socket.userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    this.userSocketMap.delete(socket.userId);
                }
                console.log(`[Session Notifications] User ${socket.userId} unregistered socket ${socket.id}`);
            }
        }
    }

    /**
     * Broadcast live session creation to all enrolled students in a course
     */
    async broadcastSessionCreated(sessionData) {
        try {
            const { courseId, sessionId, teacherId, teacherName, title, mode } = sessionData;

            console.log('[Session Notifications] ========================================');
            console.log('[Session Notifications] BROADCAST SESSION CREATED');
            console.log('[Session Notifications] Session Data:', JSON.stringify(sessionData, null, 2));
            console.log('[Session Notifications] ========================================');

            if (!courseId) {
                console.warn('[Session Notifications] ❌ No courseId provided, skipping broadcast');
                console.warn('[Session Notifications] Full sessionData:', sessionData);
                return;
            }

            console.log(`[Session Notifications] 📡 Broadcasting session creation for course: ${courseId}`);
            console.log(`[Session Notifications] Session ID: ${sessionId}, Mode: ${mode}, Teacher: ${teacherName}`);

            // Get all enrolled students for this course
            // Try enhanced_course_enrollments first, fallback to enrollments
            let enrolledStudents;
            try {
                enrolledStudents = await db.query(
                    `SELECT student_id
                     FROM enrollments
                     WHERE course_id = $1`,
                    [courseId]
                );
            } catch (error) {
                console.warn('[Session Notifications] Fallback: trying enhanced_course_enrollments');
                enrolledStudents = await db.query(
                    `SELECT student_id
                     FROM enhanced_course_enrollments
                     WHERE course_id = $1`,
                    [courseId]
                );
            }

            if (enrolledStudents.rows.length === 0) {
                console.log(`[Session Notifications] No enrolled students found for course ${courseId}`);
                return;
            }

            const studentIds = enrolledStudents.rows.map(row => row.student_id);
            console.log(`[Session Notifications] Found ${studentIds.length} enrolled students`);

            // Prepare notification payload
            const notification = {
                type: 'live_session_created',
                sessionId,
                courseId,
                teacherId,
                teacherName,
                title: title || 'Live Session',
                mode: mode || 'coding',
                timestamp: new Date().toISOString(),
                message: `${teacherName} has started a live ${mode === 'essay' ? 'essay editing' : 'coding'} session!`,
                joinUrl: mode === 'essay'
                    ? `/urgent-session/${sessionId}/essay?session=${sessionId}&mentor=teacher&type=live&role=student`
                    : `/session/${sessionId}`,
                priority: 'high'
            };

            // Store active session in memory
            this.activeSessions.set(sessionId, notification);
            console.log(`[Session Notifications] 💾 Stored active session: ${sessionId}`);

            // Send notification to each enrolled student
            let notificationsSent = 0;
            for (const studentId of studentIds) {
                const socketIds = this.userSocketMap.get(studentId);
                if (socketIds && socketIds.size > 0) {
                    socketIds.forEach(socketId => {
                        const socket = this.io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.emit('session:created', notification);
                            notificationsSent++;
                        }
                    });
                    console.log(`[Session Notifications] ✅ Sent notification to student ${studentId} (${socketIds.size} connections)`);
                } else {
                    console.log(`[Session Notifications] ⏭️ Student ${studentId} not connected`);
                }
            }

            console.log(`[Session Notifications] 📢 Broadcast complete: ${notificationsSent} notifications sent to ${studentIds.length} students`);

            return {
                success: true,
                studentsNotified: studentIds.length,
                notificationsSent
            };

        } catch (error) {
            console.error('[Session Notifications] ❌ Error broadcasting session:', error);
            throw error;
        }
    }

    /**
     * Get active sessions for a specific user based on their course enrollments
     */
    async getActiveSessionsForUser(userId) {
        try {
            // Get courses the user is enrolled in
            // Try enrollments first, fallback to enhanced_course_enrollments
            let enrolledCourses;
            try {
                enrolledCourses = await db.query(
                    `SELECT course_id FROM enrollments WHERE student_id = $1`,
                    [userId]
                );
            } catch (error) {
                console.warn('[Session Notifications] Fallback: trying enhanced_course_enrollments for user');
                enrolledCourses = await db.query(
                    `SELECT course_id FROM enhanced_course_enrollments WHERE student_id = $1`,
                    [userId]
                );
            }

            if (enrolledCourses.rows.length === 0) {
                return [];
            }

            const courseIds = enrolledCourses.rows.map(row => row.course_id);
            console.log(`[Session Notifications] User ${userId} is enrolled in ${courseIds.length} courses`);

            // Filter active sessions by user's enrolled courses
            const userActiveSessions = [];
            for (const [sessionId, notification] of this.activeSessions.entries()) {
                if (courseIds.includes(notification.courseId)) {
                    userActiveSessions.push(notification);
                }
            }

            console.log(`[Session Notifications] Found ${userActiveSessions.length} active sessions for user ${userId}`);
            return userActiveSessions;

        } catch (error) {
            console.error('[Session Notifications] Error getting active sessions for user:', error);
            return [];
        }
    }

    /**
     * Remove a session from active sessions (call when session ends)
     */
    removeActiveSession(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            this.activeSessions.delete(sessionId);
            console.log(`[Session Notifications] 🗑️  Removed active session: ${sessionId}`);
            return true;
        }
        return false;
    }

    /**
     * Get all active sessions
     */
    getAllActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Notify specific students about a session update
     */
    async notifyStudents(studentIds, notification) {
        let notificationsSent = 0;

        for (const studentId of studentIds) {
            const socketIds = this.userSocketMap.get(studentId);
            if (socketIds && socketIds.size > 0) {
                socketIds.forEach(socketId => {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('session:notification', notification);
                        notificationsSent++;
                    }
                });
            }
        }

        console.log(`[Session Notifications] Sent ${notificationsSent} notifications to ${studentIds.length} students`);
        return notificationsSent;
    }

    /**
     * Notify a single student about session acceptance
     * Used for direct teacher-student sessions (no course required)
     */
    async notifyStudentSessionAccepted(studentId, sessionData) {
        try {
            const { sessionId, teacherId, teacherName, scheduledTime, sessionType, description } = sessionData;

            console.log(`[Session Notifications] Notifying student ${studentId} about accepted session ${sessionId}`);

            const notification = {
                type: 'session_accepted',
                sessionId,
                teacherId,
                teacherName,
                scheduledTime,
                sessionType,
                description: description || 'Session',
                timestamp: new Date().toISOString(),
                message: `${teacherName} has accepted your session request! ${scheduledTime ? 'Scheduled for ' + new Date(scheduledTime).toLocaleString() : 'They will start it soon.'}`,
                priority: 'high'
            };

            // Send to student's connected sockets
            const socketIds = this.userSocketMap.get(studentId);
            let notificationsSent = 0;

            if (socketIds && socketIds.size > 0) {
                socketIds.forEach(socketId => {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('session:accepted', notification);
                        notificationsSent++;
                    }
                });
                console.log(`[Session Notifications] ✅ Sent acceptance notification to student ${studentId} (${notificationsSent} connections)`);
            } else {
                console.log(`[Session Notifications] ⏭️  Student ${studentId} not connected`);
            }

            return { success: true, notificationsSent };

        } catch (error) {
            console.error('[Session Notifications] ❌ Error notifying student about acceptance:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify a single student when teacher starts a direct session
     * Used when there's no course (direct student-teacher session)
     */
    async notifyStudentSessionStarted(studentId, sessionData) {
        try {
            const { sessionId, teacherId, teacherName, mode, sessionType, description } = sessionData;

            console.log(`[Session Notifications] Notifying student ${studentId} about started session ${sessionId}`);

            const joinUrl = mode === 'essay'
                ? `/urgent-session/${sessionId}/essay?session=${sessionId}&mentor=teacher&type=live&role=student`
                : `/session/${sessionId}`;

            const notification = {
                type: 'session_started_direct',
                sessionId,
                teacherId,
                teacherName,
                mode: mode || 'code',
                sessionType,
                description: description || 'Session',
                timestamp: new Date().toISOString(),
                message: `${teacherName} has started your ${mode === 'essay' ? 'essay editing' : 'coding'} session!`,
                joinUrl,
                priority: 'high'
            };

            // Store in active sessions for this student
            this.activeSessions.set(sessionId, {
                ...notification,
                studentId,
                isDirect: true
            });

            // Send to student's connected sockets
            const socketIds = this.userSocketMap.get(studentId);
            let notificationsSent = 0;

            if (socketIds && socketIds.size > 0) {
                socketIds.forEach(socketId => {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('session:created', notification);
                        notificationsSent++;
                    }
                });
                console.log(`[Session Notifications] ✅ Sent session start notification to student ${studentId} (${notificationsSent} connections)`);
            } else {
                console.log(`[Session Notifications] ⏭️  Student ${studentId} not connected`);
            }

            // Also emit via general session_started event for backward compatibility
            this.io.emit('session_started', {
                sessionId,
                sessionMode: mode,
                sessionType,
                studentId,
                mentorId: teacherId,
                message: notification.message
            });

            return { success: true, notificationsSent };

        } catch (error) {
            console.error('[Session Notifications] ❌ Error notifying student about session start:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.userSocketMap.size;
    }

    /**
     * Check if a user is connected
     */
    isUserConnected(userId) {
        return this.userSocketMap.has(userId) && this.userSocketMap.get(userId).size > 0;
    }
}

// Export singleton initializer
let sessionNotificationHandler = null;

const initializeSessionNotificationHandler = (io) => {
    if (!sessionNotificationHandler) {
        sessionNotificationHandler = new SessionNotificationHandler(io);
        console.log('[Session Notifications] Handler initialized');
    }
    return sessionNotificationHandler;
};

const getSessionNotificationHandler = () => {
    if (!sessionNotificationHandler) {
        throw new Error('[Session Notifications] Handler not initialized. Call initializeSessionNotificationHandler first.');
    }
    return sessionNotificationHandler;
};

module.exports = {
    initializeSessionNotificationHandler,
    getSessionNotificationHandler,
    SessionNotificationHandler
};
