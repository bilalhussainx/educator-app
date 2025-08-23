// A simple in-memory store for active sessions.
// In a production environment, this would be replaced with Redis or a database.

const activeSessions = new Map();

/**
 * @typedef {Object} SessionInfo
 * @property {string} sessionId
 * @property {string} teacherId
 * @property {string} teacherName
 * @property {string} courseId
 * @property {string} courseName
 * @property {Date} createdAt
 */

/**
 * Adds or updates an active session.
 * @param {string} sessionId
 * @param {SessionInfo} sessionInfo
 */
const addSession = (sessionId, sessionInfo) => {
    console.log(`[SESSION STORE] Adding session: ${sessionId}`);
    activeSessions.set(sessionId, { ...sessionInfo, createdAt: new Date() });
};

/**
 * Removes an active session.
 * @param {string} sessionId
 */
const removeSession = (sessionId) => {
    console.log(`[SESSION STORE] Removing session: ${sessionId}`);
    activeSessions.delete(sessionId);
};

/**
 * Gets all active sessions.
 * @returns {SessionInfo[]}
 */
const getActiveSessions = () => {
    return Array.from(activeSessions.values());
};

module.exports = {
    addSession,
    removeSession,
    getActiveSessions,
};