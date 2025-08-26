// services/websocketHandler.js

const jwt = require('jsonwebtoken');
const url = require('url');
const { addSession, removeSession } = require('./sessionStore');
const { executeCode } = require('../services/executionService'); // For running code

const log = (msg) => console.log(`[WSS] ${msg}`);
const sessions = new Map();

// --- Helper Functions ---
function broadcast(session, message) {
    if (!session || !session.clients) return;
    session.clients.forEach(client => {
        if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastToAll(session, message) {
    if (!session || !session.clients) return;
    session.clients.forEach(client => {
        if (client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function sendToClient(session, userId, message) {
    if (!session || !session.clients) return;
    const client = Array.from(session.clients).find(c => c.id === userId);
    if (client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify(message));
    } else {
        console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
    }
}

function getTeacher(session) {
    if (!session || !session.clients) return null;
    return Array.from(session.clients).find(c => c.role === 'teacher');
}

function getStudents(session) {
    if (!session || !session.clients) return [];
    return Array.from(session.clients).filter(c => c.role === 'student');
}

// --- Main WebSocket Initializer ---
function initializeWebSocket(wss) {
    wss.on('connection', async (ws, req) => {
        console.log('[WS DEBUG] New connection attempt');
        
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const sessionId = urlParams.get('sessionId');
        const token = urlParams.get('token');
        const teacherSessionId = urlParams.get('teacherSessionId');
        const lessonId = urlParams.get('lessonId');

        console.log('[WS DEBUG] Connection params:', { 
            sessionId, 
            hasToken: !!token, 
            teacherSessionId, 
            lessonId 
        });

        if (!sessionId || !token) {
            console.log('[WS ERROR] Missing sessionId or token');
            return ws.close(4001, "Session ID and token are required");
        }

        let user;
        try {
            console.log('[WS DEBUG] Verifying JWT with secret:', process.env.JWT_SECRET ? 'Present' : 'Missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = decoded.user;
            console.log('[WS DEBUG] JWT verified for user:', user.username, user.role);
        } catch (err) {
            console.error('[WS Auth] Connection rejected due to invalid token:', err.message);
            return ws.close(4001, "Invalid or expired authentication token");
        }

        const isHomeworkSession = !!teacherSessionId && !!lessonId;
        const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;

        console.log('[WS DEBUG] Session key:', sessionKey, 'isHomework:', isHomeworkSession);

        if (!sessions.has(sessionKey)) {
            if (isHomeworkSession) {
                console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
                return ws.close(1011, "Cannot join homework for a session that does not exist.");
            }
            
            log(`Creating new session: ${sessionKey}`);
            sessions.set(sessionKey, {
                clients: new Set(),
                files: [],
                activeFile: '',
                terminalOutput: `CoreZenith Virtual Terminal for session ${sessionKey}\n$ `,
                terminalInputBuffer: '',
                assignments: new Map(),
                handsRaised: new Set(),
                spotlightedStudentId: null,
                studentWorkspaces: new Map(),
                controlledStudentId: null,
                isFrozen: false,
                whiteboardLines: [],
                isWhiteboardVisible: false,
                videoConnections: new Map(),
            });
        }
        const session = sessions.get(sessionKey);
        
        const existingClient = Array.from(session.clients).find(c => c.id === user.id && c.isHomework === isHomeworkSession);
        if (existingClient) {
            log(`Found existing client for ${user.username}. Terminating old connection.`);
            existingClient.ws.terminate(); 
            session.clients.delete(existingClient);
        }

        const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
        session.clients.add(clientInfo);

        if (clientInfo.role === 'teacher' && !isHomeworkSession) {
            addSession(sessionId, {
                sessionId,
                teacherId: user.id,
                teacherName: user.username,
                courseId: 'default_course',
                courseName: 'General Session',
            });
        }

        log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey} (Homework: ${isHomeworkSession}). Total clients: ${session.clients.size}`);
        const teacher = getTeacher(session);

        if (isHomeworkSession) {
            if (teacher) {
                sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
            }
             ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
             ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
        } else {
            // Send initial state to the client
            ws.send(JSON.stringify({ 
                type: 'ROLE_ASSIGNED', 
                payload: { 
                    role: clientInfo.role,
                    files: session.files,
                    activeFile: session.activeFile,
                    terminalOutput: session.terminalOutput,
                    spotlightedStudentId: session.spotlightedStudentId,
                    controlledStudentId: session.controlledStudentId,
                    isFrozen: session.isFrozen,
                    whiteboardLines: session.whiteboardLines,
                    isWhiteboardVisible: session.isWhiteboardVisible,
                    teacherId: teacher ? teacher.id : null,
                } 
            }));

            if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
                ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
            }
            
            ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));

            const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
            broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
        }

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                const fromId = clientInfo.id;
                
                console.log(`[WS] Received message from ${clientInfo.username}: ${data.type}`);
                
                if (data.type === 'PRIVATE_MESSAGE') {
                    const { to, text } = data.payload;
                    sendToClient(session, to, {
                        type: 'PRIVATE_MESSAGE',
                        payload: { from: fromId, text, timestamp: new Date().toISOString() }
                    });
                    return;
                }

                if (clientInfo.isHomework) {
                    if (!teacher) return;
                    switch(data.type) {
                        case 'HOMEWORK_CODE_UPDATE':
                            session.studentWorkspaces?.set(user.id, data.payload);
                            sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
                            break;
                        case 'HOMEWORK_TERMINAL_IN':
                            sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
                            break;
                    }
                    return;
                }

                // Handle student actions first
                if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
                    session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
                    broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
                    return;
                }

                // Teacher-only actions
                if (clientInfo.role !== 'teacher') return;

                switch (data.type) {
                    case 'TOGGLE_WHITEBOARD':
                        session.isWhiteboardVisible = !session.isWhiteboardVisible;
                        broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
                        break;
                    case 'WHITEBOARD_DRAW':
                        session.whiteboardLines.push(data.payload.line);
                        broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
                        break;
                    case 'WHITEBOARD_CLEAR':
                        session.whiteboardLines = [];
                        broadcast(session, { type: 'WHITEBOARD_CLEAR' });
                        break;
                    case 'TAKE_CONTROL':
                        session.controlledStudentId = data.payload.studentId;
                        broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
                        break;
                    case 'TOGGLE_FREEZE':
                        session.isFrozen = !session.isFrozen;
                        broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
                        break;
                    case 'TEACHER_DIRECT_EDIT':
                        const { studentId, workspace } = data.payload;
                        session.studentWorkspaces?.set(studentId, workspace);
                        const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
                        if (studentClient) {
                            studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
                        }
                        broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
                        break;
                    case 'SPOTLIGHT_STUDENT':
                        session.spotlightedStudentId = data.payload.studentId;
                        const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
                        broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
                        break;
                    case 'TEACHER_CODE_UPDATE':
                        session.files = data.payload.files;
                        session.activeFile = data.payload.activeFileName;
                        broadcast(session, { type: 'TEACHER_CODE_DID_UPDATE', payload: { files: session.files, activeFileName: session.activeFile } });
                        break;
                    case 'ASSIGN_HOMEWORK':
                        sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
                        session.assignments.set(data.payload.studentId, data.payload);
                        break;

                    case 'TERMINAL_IN':
                        const input = data.payload.data;
                        if (input === '\r') { // User pressed Enter
                            const command = session.terminalInputBuffer.trim();
                            session.terminalInputBuffer = '';
                            session.terminalOutput += '\n';
                            broadcast(session, { type: 'TERMINAL_OUT', payload: '\n' });

                            const runCommandMatch = command.match(/^(node|python3|ruby|go run|java)\s+([\w\.-]+)/);
                            if (runCommandMatch) {
                                const activeFileInSession = session.files.find(f => f.name === session.activeFile);
                                const language = activeFileInSession?.language || 'unknown';
                                const code = activeFileInSession?.content || '';

                                try {
                                    const executionResult = await executeCode(code, language);
                                    const output = executionResult.output || (executionResult.success ? '' : 'Execution failed.');
                                    session.terminalOutput += output + '\n$ ';
                                    broadcast(session, { type: 'TERMINAL_OUT', payload: output + '\n$ ' });
                                } catch (err) {
                                    const errorMessage = `Execution failed: ${err.message}\n$ `;
                                    session.terminalOutput += errorMessage;
                                    broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
                                }
                            } else if (command.startsWith('pip install') || command.startsWith('npm install')) {
                                const helpMessage = `[CoreZenith] Package installation is not supported in this terminal. Please ask your instructor to add libraries to the environment.\n$ `;
                                session.terminalOutput += helpMessage;
                                broadcast(session, { type: 'TERMINAL_OUT', payload: helpMessage });
                            } else if (command) {
                                const errorMessage = `/bin/sh: command not found: ${command}\n$ `;
                                session.terminalOutput += errorMessage;
                                broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
                            } else {
                                session.terminalOutput += '$ ';
                                broadcast(session, { type: 'TERMINAL_OUT', payload: '$ ' });
                            }
                        } else {
                            session.terminalInputBuffer += input;
                            session.terminalOutput += input;
                            broadcast(session, { type: 'TERMINAL_OUT', payload: input });
                        }
                        break;

                    case 'RUN_CODE':
                         const { language, code } = data.payload;
                         try {
                             const executionResult = await executeCode(code, language);
                             const output = executionResult.output || (executionResult.success ? 'Execution complete.' : 'Execution finished with errors.');
                             session.terminalOutput += `\n${output}\n$ `;
                             broadcast(session, { type: 'TERMINAL_OUT', payload: `\n${output}\n$ ` });
                         } catch (err) {
                             console.error("Error during remote code execution:", err);
                             const errorMessage = `\nExecution failed: ${err.message}\n$ `;
                             session.terminalOutput += errorMessage;
                             broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
                         }
                         break;
                }
            } catch (error) {
                console.error('[WS] Error parsing message:', error);
            }
        });

        ws.on('close', async () => {
            session.clients.delete(clientInfo);
            log(`${clientInfo.role} ${clientInfo.username} disconnected. Total clients left: ${session.clients.size}`);

            if (session.handsRaised.has(clientInfo.id)) {
                session.handsRaised.delete(clientInfo.id);
                broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
            }

            if (session.spotlightedStudentId === clientInfo.id) {
                session.spotlightedStudentId = null;
                broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
            }
            if (session.controlledStudentId === clientInfo.id) {
                session.controlledStudentId = null;
                broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
            }
            
            if (isHomeworkSession) {
                if (teacher) {
                    sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
                }
            } else if (session.clients.size === 0) {
                log(`Last client left. Deleting session ${sessionId}`);
                sessions.delete(sessionId);
                removeSession(sessionId);
            } else {
                 const updatedStudentList = Array.from(session.clients)
                    .filter(c => c.role === 'student' && !c.isHomework)
                    .map(c => ({ id: c.id, username: c.username }));
                broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
            }
        });

        ws.on('error', (error) => {
            console.error(`[WS] WebSocket error for ${clientInfo.username}:`, error);
        });
    });
}

module.exports = initializeWebSocket;
// // services/websocketHandler.js

// const jwt = require('jsonwebtoken');
// const url = require('url');
// const { addSession, removeSession } = require('./sessionStore');
// const { executeCode } = require('../services/executionService'); // For running code

// const log = (msg) => console.log(`[WSS] ${msg}`);
// const sessions = new Map();

// // --- Helper Functions ---
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function getStudents(session) {
//     if (!session || !session.clients) return [];
//     return Array.from(session.clients).filter(c => c.role === 'student');
// }

// function initiateVideoConnectionsForNewUser(session, newClient) {
//     const teacher = getTeacher(session);
//     const students = getStudents(session);
    
//     if (newClient.role === 'teacher') {
//         students.forEach(student => {
//             console.log(`[VIDEO] Teacher initiating connection to student ${student.username}`);
//             sendToClient(session, teacher.id, { 
//                 type: 'INITIATE_VIDEO_CONNECTION', 
//                 payload: { targetId: student.id, targetUsername: student.username, isInitiator: true }
//             });
//         });
//     } else if (newClient.role === 'student' && teacher) {
//         console.log(`[VIDEO] Auto-initiating video connection: Teacher -> Student ${newClient.username}`);
//         sendToClient(session, teacher.id, { 
//             type: 'INITIATE_VIDEO_CONNECTION', 
//             payload: { targetId: newClient.id, targetUsername: newClient.username, isInitiator: true }
//         });
//     }
// }


// // --- Main WebSocket Initializer ---
// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(4001, "Session ID and token are required");
//         }

//         let user;
//         try {
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             user = decoded.user;
//         } catch (err) {
//             console.error('[WS Auth] Connection rejected due to invalid token:', err.message);
//             return ws.close(4001, "Invalid or expired authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;

//         if (!sessions.has(sessionKey)) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             }
            
//             log(`Creating new session: ${sessionKey}`);
//             sessions.set(sessionKey, {
//                 clients: new Set(),
//                 files: [],
//                 activeFile: '',
//                 terminalOutput: `CoreZenith Virtual Terminal for session ${sessionKey}\n$ `,
//                 terminalInputBuffer: '', // Buffer for the pseudo-interactive terminal
//                 assignments: new Map(),
//                 handsRaised: new Set(),
//                 spotlightedStudentId: null,
//                 studentWorkspaces: new Map(),
//                 controlledStudentId: null,
//                 isFrozen: false,
//                 whiteboardLines: [],
//                 isWhiteboardVisible: false,
//                 videoConnections: new Map(),
//             });
//         }
//         const session = sessions.get(sessionKey);
        
//         const existingClient = Array.from(session.clients).find(c => c.id === user.id && c.isHomework === isHomeworkSession);
//         if (existingClient) {
//             log(`Found existing client for ${user.username}. Terminating old connection.`);
//             existingClient.ws.terminate(); 
//             session.clients.delete(existingClient);
//         }

//         const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
//         session.clients.add(clientInfo);

//         if (clientInfo.role === 'teacher' && !isHomeworkSession) {
//             addSession(sessionId, {
//                 sessionId,
//                 teacherId: user.id,
//                 teacherName: user.username,
//                 courseId: 'default_course',
//                 courseName: 'General Session',
//             });
//         }

//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey} (Homework: ${isHomeworkSession}). Total clients: ${session.clients.size}`);
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     terminalOutput: session.terminalOutput,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     teacherId: teacher ? teacher.id : null,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
//             }
            
//             if (teacher) {
//                  ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));
//             }

//             const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});

//             setTimeout(() => {
//                 initiateVideoConnectionsForNewUser(session, clientInfo);
//             }, 1000);
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
            
//             if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: { from: fromId, text, timestamp: new Date().toISOString() }
//                 });
//                 return;
//             }

//             switch (data.type) {
//                 case 'INITIATE_VIDEO_CONNECTION':
//                     const targetId = data.payload.targetId;
//                     sendToClient(session, targetId, { 
//                         type: 'AUTO_ACCEPT_VIDEO_CALL', 
//                         payload: { from: fromId, username: clientInfo.username }
//                     });
//                     break;
//                 case 'WEBRTC_OFFER':
//                     sendToClient(session, data.payload.to, { 
//                         type: 'WEBRTC_OFFER', 
//                         payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username, isAutoCall: data.payload.isAutoCall || false }
//                     });
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                     return;
//                 case 'VIDEO_CONNECTION_ESTABLISHED':
//                     const connectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.set(connectionKey, { participants: [fromId, data.payload.peerId], establishedAt: new Date() });
//                     break;
//                 case 'VIDEO_CONNECTION_ENDED':
//                     const endConnectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.delete(endConnectionKey);
//                     break;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }
//             if (data.type === 'STUDENT_RETURN_TO_CLASSROOM') {
//                 sendToClient(session, clientInfo.id, {
//                     type: 'TEACHER_WORKSPACE_UPDATE',
//                     payload: { files: session.files, activeFileName: session.activeFile, terminalOutput: session.terminalOutput }
//                 });
                
//                 if (teacher && clientInfo.role === 'student') {
//                     setTimeout(() => {
//                         sendToClient(session, teacher.id, { 
//                             type: 'INITIATE_VIDEO_CONNECTION', 
//                             payload: { targetId: clientInfo.id, targetUsername: clientInfo.username, isInitiator: true }
//                         });
//                     }, 500);
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') return;

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 case 'WHITEBOARD_DRAW':
//                     session.whiteboardLines.push(data.payload.line);
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_CODE_DID_UPDATE', payload: { files: session.files, activeFileName: session.activeFile } });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;

//                 case 'TERMINAL_IN':
//                     const input = data.payload.data;
//                     if (input === '\r') { // User pressed Enter
//                         const command = session.terminalInputBuffer.trim();
//                         session.terminalInputBuffer = '';
//                         session.terminalOutput += '\n';
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: '\n' });

//                         const runCommandMatch = command.match(/^(node|python3|ruby|go run|java)\s+([\w\.-]+)/);
//                         if (runCommandMatch) {
//                             const activeFileInSession = session.files.find(f => f.name === session.activeFile);
//                             const language = activeFileInSession?.language || 'unknown';
//                             const code = activeFileInSession?.content || '';

//                             try {
//                                 const executionResult = await executeCode(code, language);
//                                 const output = executionResult.output || (executionResult.success ? '' : 'Execution failed.');
//                                 session.terminalOutput += output + '\n$ ';
//                                 broadcast(session, { type: 'TERMINAL_OUT', payload: output + '\n$ ' });
//                             } catch (err) {
//                                 const errorMessage = `Execution failed: ${err.message}\n$ `;
//                                 session.terminalOutput += errorMessage;
//                                 broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
//                             }
//                         } else if (command.startsWith('pip install') || command.startsWith('npm install')) {
//                             const helpMessage = `[CoreZenith] Package installation is not supported in this terminal. Please ask your instructor to add libraries to the environment.\n$ `;
//                             session.terminalOutput += helpMessage;
//                             broadcast(session, { type: 'TERMINAL_OUT', payload: helpMessage });
//                         } else if (command) {
//                             const errorMessage = `/bin/sh: command not found: ${command}\n$ `;
//                             session.terminalOutput += errorMessage;
//                             broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
//                         } else {
//                             session.terminalOutput += '$ ';
//                             broadcast(session, { type: 'TERMINAL_OUT', payload: '$ ' });
//                         }
//                     } else {
//                         session.terminalInputBuffer += input;
//                         session.terminalOutput += input;
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: input });
//                     }
//                     break;

//                 case 'RUN_CODE':
//                      const { language, code } = data.payload;
//                      try {
//                          const executionResult = await executeCode(code, language);
//                          const output = executionResult.output || (executionResult.success ? 'Execution complete.' : 'Execution finished with errors.');
//                          session.terminalOutput += `\n${output}\n$ `;
//                          broadcast(session, { type: 'TERMINAL_OUT', payload: `\n${output}\n$ ` });
//                      } catch (err) {
//                          console.error("Error during remote code execution:", err);
//                          const errorMessage = `\nExecution failed: ${err.message}\n$ `;
//                          session.terminalOutput += errorMessage;
//                          broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
//                      }
//                      break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             log(`${clientInfo.role} ${clientInfo.username} disconnected. Total clients left: ${session.clients.size}`);

//             for (const [connectionKey, connection] of session.videoConnections) {
//                 if (connection.participants.includes(clientInfo.id)) {
//                     session.videoConnections.delete(connectionKey);
//                     const otherParticipant = connection.participants.find(id => id !== clientInfo.id);
//                     if (otherParticipant) {
//                         sendToClient(session, otherParticipant, {
//                             type: 'PEER_DISCONNECTED',
//                             payload: { disconnectedUserId: clientInfo.id }
//                         });
//                     }
//                 }
//             }

//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 log(`Last client left. Deleting session ${sessionId}`);
//                 sessions.delete(sessionId);
//                 removeSession(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
                
//                 if (clientInfo.role === 'teacher') {
//                     const students = getStudents(session);
//                     students.forEach(student => {
//                         sendToClient(session, student.id, {
//                             type: 'TEACHER_DISCONNECTED',
//                             payload: {}
//                         });
//                     });
//                 } else if (clientInfo.role === 'student') {
//                     const remainingTeacher = getTeacher(session);
//                     if (remainingTeacher) {
//                         sendToClient(session, remainingTeacher.id, {
//                             type: 'STUDENT_DISCONNECTED',
//                             payload: { studentId: clientInfo.id, studentUsername: clientInfo.username }
//                         });
//                     }
//                 }
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// // services/websocketHandler.js

// const jwt = require('jsonwebtoken');
// const url = require('url');
// const { addSession, removeSession } = require('./sessionStore');
// const { executeCode } = require('../services/executionService'); // For running code

// const log = (msg) => console.log(`[WSS] ${msg}`);
// const sessions = new Map();

// // --- Helper Functions ---
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function getStudents(session) {
//     if (!session || !session.clients) return [];
//     return Array.from(session.clients).filter(c => c.role === 'student');
// }

// function initiateVideoConnectionsForNewUser(session, newClient) {
//     const teacher = getTeacher(session);
//     const students = getStudents(session);
    
//     if (newClient.role === 'teacher') {
//         students.forEach(student => {
//             console.log(`[VIDEO] Teacher initiating connection to student ${student.username}`);
//             sendToClient(session, teacher.id, { 
//                 type: 'INITIATE_VIDEO_CONNECTION', 
//                 payload: { targetId: student.id, targetUsername: student.username, isInitiator: true }
//             });
//         });
//     } else if (newClient.role === 'student' && teacher) {
//         console.log(`[VIDEO] Auto-initiating video connection: Teacher -> Student ${newClient.username}`);
//         sendToClient(session, teacher.id, { 
//             type: 'INITIATE_VIDEO_CONNECTION', 
//             payload: { targetId: newClient.id, targetUsername: newClient.username, isInitiator: true }
//         });
//     }
// }


// // --- Main WebSocket Initializer ---
// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(4001, "Session ID and token are required");
//         }

//         let user;
//         try {
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             user = decoded.user;
//         } catch (err) {
//             console.error('[WS Auth] Connection rejected due to invalid token:', err.message);
//             return ws.close(4001, "Invalid or expired authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;

//         // Create the session in memory if it doesn't exist
//         if (!sessions.has(sessionKey)) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             }
            
//             log(`Creating new session: ${sessionKey}`);
//             sessions.set(sessionKey, {
//                 clients: new Set(),
//                 files: [],
//                 activeFile: '',
//                 terminalOutput: `CoreZenith Virtual Terminal for session ${sessionKey}\n$ `,
//                 assignments: new Map(),
//                 handsRaised: new Set(),
//                 spotlightedStudentId: null,
//                 studentWorkspaces: new Map(),
//                 controlledStudentId: null,
//                 isFrozen: false,
//                 whiteboardLines: [],
//                 isWhiteboardVisible: false,
//                 videoConnections: new Map(),
//             });
//         }
//         const session = sessions.get(sessionKey);
        
//         const existingClient = Array.from(session.clients).find(c => c.id === user.id && c.isHomework === isHomeworkSession);
//         if (existingClient) {
//             log(`Found existing client for ${user.username}. Terminating old connection.`);
//             existingClient.ws.terminate(); 
//             session.clients.delete(existingClient);
//         }

//         const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
//         session.clients.add(clientInfo);

//         if (clientInfo.role === 'teacher' && !isHomeworkSession) {
//             addSession(sessionId, {
//                 sessionId,
//                 teacherId: user.id,
//                 teacherName: user.username,
//                 courseId: 'default_course',
//                 courseName: 'General Session',
//             });
//         }

//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey} (Homework: ${isHomeworkSession}). Total clients: ${session.clients.size}`);
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     terminalOutput: session.terminalOutput,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     teacherId: teacher ? teacher.id : null,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
//             }
            
//             if (teacher) {
//                  ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));
//             }

//             const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});

//             setTimeout(() => {
//                 initiateVideoConnectionsForNewUser(session, clientInfo);
//             }, 1000);
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
            
//             if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: { from: fromId, text, timestamp: new Date().toISOString() }
//                 });
//                 return;
//             }

//             switch (data.type) {
//                 case 'INITIATE_VIDEO_CONNECTION':
//                     const targetId = data.payload.targetId;
//                     sendToClient(session, targetId, { 
//                         type: 'AUTO_ACCEPT_VIDEO_CALL', 
//                         payload: { from: fromId, username: clientInfo.username }
//                     });
//                     break;
//                 case 'WEBRTC_OFFER':
//                     sendToClient(session, data.payload.to, { 
//                         type: 'WEBRTC_OFFER', 
//                         payload: { 
//                             from: fromId, 
//                             offer: data.payload.offer, 
//                             username: clientInfo.username,
//                             isAutoCall: data.payload.isAutoCall || false
//                         }
//                     });
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                     return;
//                 case 'VIDEO_CONNECTION_ESTABLISHED':
//                     const connectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.set(connectionKey, {
//                         participants: [fromId, data.payload.peerId],
//                         establishedAt: new Date()
//                     });
//                     break;
//                 case 'VIDEO_CONNECTION_ENDED':
//                     const endConnectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.delete(endConnectionKey);
//                     break;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }
//             if (data.type === 'STUDENT_RETURN_TO_CLASSROOM') {
//                 sendToClient(session, clientInfo.id, {
//                     type: 'TEACHER_WORKSPACE_UPDATE',
//                     payload: {
//                         files: session.files,
//                         activeFileName: session.activeFile,
//                         terminalOutput: session.terminalOutput,
//                     }
//                 });
                
//                 if (teacher && clientInfo.role === 'student') {
//                     setTimeout(() => {
//                         sendToClient(session, teacher.id, { 
//                             type: 'INITIATE_VIDEO_CONNECTION', 
//                             payload: { targetId: clientInfo.id, targetUsername: clientInfo.username, isInitiator: true }
//                         });
//                     }, 500);
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') return;

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 case 'WHITEBOARD_DRAW':
//                     session.whiteboardLines.push(data.payload.line);
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_CODE_DID_UPDATE',
//                        payload: {
//                        files: session.files,
//                        activeFileName: session.activeFile
//                     }
//                         });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;
//                 case 'TERMINAL_IN':
//                     const command = data.payload.data;
//                     session.terminalOutput += command;
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: command });
//                     if (command.includes('\r')) {
//                         session.terminalOutput += '$ ';
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: '\n$ ' });
//                     }
//                     break;
//                 case 'RUN_CODE':
//                      const { language, code } = data.payload;
//                      try {
//                          const executionResult = await executeCode(code, language);
//                          const output = executionResult.output || (executionResult.success ? 'Execution complete.' : 'Execution finished with errors.');
//                          session.terminalOutput += output + '\n$ ';
//                          broadcast(session, { type: 'TERMINAL_OUT', payload: output + '\n$ ' });
//                      } catch (err) {
//                          console.error("Error during remote code execution:", err);
//                          const errorMessage = `Execution failed: ${err.message}\n$ `;
//                          session.terminalOutput += errorMessage;
//                          broadcast(session, { type: 'TERMINAL_OUT', payload: errorMessage });
//                      }
//                      break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             log(`${clientInfo.role} ${clientInfo.username} disconnected. Total clients left: ${session.clients.size}`);

//             for (const [connectionKey, connection] of session.videoConnections) {
//                 if (connection.participants.includes(clientInfo.id)) {
//                     session.videoConnections.delete(connectionKey);
//                     const otherParticipant = connection.participants.find(id => id !== clientInfo.id);
//                     if (otherParticipant) {
//                         sendToClient(session, otherParticipant, {
//                             type: 'PEER_DISCONNECTED',
//                             payload: { disconnectedUserId: clientInfo.id }
//                         });
//                     }
//                 }
//             }

//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 log(`Last client left. Deleting session ${sessionId}`);
//                 sessions.delete(sessionId);
//                 removeSession(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
                
//                 if (clientInfo.role === 'teacher') {
//                     const students = getStudents(session);
//                     students.forEach(student => {
//                         sendToClient(session, student.id, {
//                             type: 'TEACHER_DISCONNECTED',
//                             payload: {}
//                         });
//                     });
//                 } else if (clientInfo.role === 'student') {
//                     const remainingTeacher = getTeacher(session);
//                     if (remainingTeacher) {
//                         sendToClient(session, remainingTeacher.id, {
//                             type: 'STUDENT_DISCONNECTED',
//                             payload: { studentId: clientInfo.id, studentUsername: clientInfo.username }
//                         });
//                     }
//                 }
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// // perfect with refresh
// // const Docker = require('dockerode');
// const jwt = require('jsonwebtoken');
// const url = require('url');
// const { addSession, removeSession } = require('./sessionStore');

// const log = (msg) => console.log(`[WSS] ${msg}`);



// const sessions = new Map();

// // Helper functions
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }
// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function getStudents(session) {
//     if (!session || !session.clients) return [];
//     return Array.from(session.clients).filter(c => c.role === 'student');
// }

// function initiateVideoConnectionsForNewUser(session, newClient) {
//     const teacher = getTeacher(session);
//     const students = getStudents(session);
    
//     if (newClient.role === 'teacher') {
//         // Teacher joined - initiate connections to all students
//         students.forEach(student => {
//             console.log(`[VIDEO] Teacher initiating connection to student ${student.username}`);
//             sendToClient(session, teacher.id, { 
//                 type: 'INITIATE_VIDEO_CONNECTION', 
//                 payload: { targetId: student.id, targetUsername: student.username, isInitiator: true }
//             });
//         });
//     } else if (newClient.role === 'student') {
//         // Student joined - teacher initiates connection if present
//         if (teacher) {
//             console.log(`[VIDEO] Auto-initiating video connection: Teacher -> Student ${newClient.username}`);
//             sendToClient(session, teacher.id, { 
//                 type: 'INITIATE_VIDEO_CONNECTION', 
//                 payload: { targetId: newClient.id, targetUsername: newClient.username, isInitiator: true }
//             });
//         }
//     }
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(4001, "Session ID and token are required");
//         }

//         // --- THIS IS THE DEFINITIVE SECURITY FIX ---
//         let user;
//         try {
//             // Use jwt.verify to securely validate the token against your secret key.
//             // This checks the signature, expiration, and decodes the payload in one step.
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             user = decoded.user;
//         } catch (err) {
//             console.error('[WS Auth] Connection rejected due to invalid token:', err.message);
//             // Use a custom error code so the frontend can handle it gracefully.
//             return ws.close(4001, "Invalid or expired authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         if (!sessions.has(sessionKey)) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             }
            
//             log(`Creating new session: ${sessionKey}`);
//             sessions.set(sessionKey, {
//                 // We remove the container and terminalStream properties
//                 clients: new Set(),
//                 files: [],
//                 activeFile: '',
//                 terminalOutput: `CoreZenith Virtual Terminal for session ${sessionKey}\n$ `, // Default output
//                 assignments: new Map(),
//                 handsRaised: new Set(),
//                 spotlightedStudentId: null,
//                 studentWorkspaces: new Map(),
//                 controlledStudentId: null,
//                 isFrozen: false,
//                 whiteboardLines: [],
//                 isWhiteboardVisible: false,
//                 videoConnections: new Map(),
//             });
//         }
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     const container = await docker.createContainer({ Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }});
//                     await container.start();
//                     const exec = await container.exec({ Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         terminalOutput: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                         whiteboardLines: [],
//                         isWhiteboardVisible: false,
//                         videoConnections: new Map(),
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         const output = chunk.toString('utf8');
//                         session.terminalOutput += output;
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: output });
//                     });
//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }
        
//         const existingClient = Array.from(session.clients).find(c => c.id === user.id && c.isHomework === isHomeworkSession);
//         if (existingClient) {
//             log(`Found existing client for ${user.username}. Terminating old connection.`);
//             existingClient.ws.terminate(); 
//             session.clients.delete(existingClient);
//         }

//         const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
//         session.clients.add(clientInfo);

//         if (clientInfo.role === 'teacher' && !isHomeworkSession) {
//             addSession(sessionId, {
//                 sessionId,
//                 teacherId: user.id,
//                 teacherName: user.username,
//                 courseId: 'default_course',
//                 courseName: 'General Session',
//             });
//         }

//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);
//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey} (Homework: ${isHomeworkSession}). Total clients: ${session.clients.size}`);
//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Total clients: ${session.clients.size}`);
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     terminalOutput: session.terminalOutput,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     teacherId: teacher ? teacher.id : null,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
//             }
            
//             if (teacher) {
//                  ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));
//             }

//             const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});

//             // Auto-initiate video connections for new users
//             setTimeout(() => {
//                 initiateVideoConnectionsForNewUser(session, clientInfo);
//             }, 1000); // Small delay to ensure client is ready
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
            
//             if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 console.log(`[CHAT] Relaying message from ${fromId} to ${to}`);
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: { from: fromId, text, timestamp: new Date().toISOString() }
//                 });
//                 return;
//             }

//             switch (data.type) {
//                 case 'INITIATE_VIDEO_CONNECTION':
//                     // Teacher is initiating connection to a student
//                     const targetId = data.payload.targetId;
//                     console.log(`[VIDEO] Initiating connection from ${fromId} to ${targetId}`);
//                     sendToClient(session, targetId, { 
//                         type: 'AUTO_ACCEPT_VIDEO_CALL', 
//                         payload: { from: fromId, username: clientInfo.username }
//                     });
//                     break;
//                 case 'WEBRTC_OFFER':
//                     console.log(`[VIDEO] Relaying offer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, { 
//                         type: 'WEBRTC_OFFER', 
//                         payload: { 
//                             from: fromId, 
//                             offer: data.payload.offer, 
//                             username: clientInfo.username,
//                             isAutoCall: data.payload.isAutoCall || false
//                         }
//                     });
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     console.log(`[VIDEO] Relaying answer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                     return;
//                 case 'VIDEO_CONNECTION_ESTABLISHED':
//                     // Track successful connections
//                     const connectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.set(connectionKey, {
//                         participants: [fromId, data.payload.peerId],
//                         establishedAt: new Date()
//                     });
//                     console.log(`[VIDEO] Connection established between ${fromId} and ${data.payload.peerId}`);
//                     break;
//                 case 'VIDEO_CONNECTION_ENDED':
//                     // Remove from tracking
//                     const endConnectionKey = `${Math.min(fromId, data.payload.peerId)}_${Math.max(fromId, data.payload.peerId)}`;
//                     session.videoConnections.delete(endConnectionKey);
//                     console.log(`[VIDEO] Connection ended between ${fromId} and ${data.payload.peerId}`);
//                     break;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }
//             if (data.type === 'STUDENT_RETURN_TO_CLASSROOM') {
//                 console.log(`[STATE_SYNC] Student ${clientInfo.username} returned to classroom. Sending full workspace.`);
//                 sendToClient(session, clientInfo.id, {
//                     type: 'TEACHER_WORKSPACE_UPDATE',
//                     payload: {
//                         files: session.files,
//                         activeFileName: session.activeFile,
//                         terminalOutput: session.terminalOutput,
//                     }
//                 });
                
//                 // Re-establish video connection with teacher
//                 if (teacher && clientInfo.role === 'student') {
//                     console.log(`[VIDEO] Re-establishing video connection for student ${clientInfo.username} returning from homework`);
//                     setTimeout(() => {
//                         sendToClient(session, teacher.id, { 
//                             type: 'INITIATE_VIDEO_CONNECTION', 
//                             payload: { targetId: clientInfo.id, targetUsername: clientInfo.username, isInitiator: true }
//                         });
//                     }, 500);
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') return;

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 case 'WHITEBOARD_DRAW':
//                     session.whiteboardLines.push(data.payload.line);
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_CODE_DID_UPDATE',
//                        payload: {
//                        files: session.files,
//                        activeFileName: session.activeFile
//                     }
//                         });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;
//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;
//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         session.terminalOutput = '';
//                         // broadcast(session, {
//                         //     type: 'TEACHER_WORKSPACE_UPDATE',
//                         //     payload: {
//                         //         files: session.files,
//                         //         activeFileName: session.activeFile,
//                         //         terminalOutput: session.terminalOutput
//                         //     }
//                         // });
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         let command;
//                         switch (language) {
//                             case 'javascript':
//                                 command = `echo '${escapedCode}' > temp_run_file.js && node temp_run_file.js`;
//                                 break;
//                             case 'python':
//                                 command = `echo '${escapedCode}' > temp_run_file.py && python3 temp_run_file.py`;
//                                 break;
//                             case 'java':
//                                 command = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                                 break;
//                             default:
//                                 command = `echo "Unsupported language: ${language}"`;
//                         }
//                         session.terminalStream.write(`clear && ${command}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
//             log(`${clientInfo.role} ${clientInfo.username} disconnected. Total clients left: ${session.clients.size}`);

//             // Clean up video connections involving this user
//             for (const [connectionKey, connection] of session.videoConnections) {
//                 if (connection.participants.includes(clientInfo.id)) {
//                     session.videoConnections.delete(connectionKey);
//                     console.log(`[VIDEO] Removed connection ${connectionKey} due to user disconnect`);
                    
//                     // Notify the other participant
//                     const otherParticipant = connection.participants.find(id => id !== clientInfo.id);
//                     if (otherParticipant) {
//                         sendToClient(session, otherParticipant, {
//                             type: 'PEER_DISCONNECTED',
//                             payload: { disconnectedUserId: clientInfo.id }
//                         });
//                     }
//                 }
//             }

//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     if (session.container) await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
                
//                 // Re-establish connections for remaining users if teacher disconnected
//                 if (clientInfo.role === 'teacher') {
//                     // Teacher disconnected, students should be notified
//                     const students = getStudents(session);
//                     students.forEach(student => {
//                         sendToClient(session, student.id, {
//                             type: 'TEACHER_DISCONNECTED',
//                             payload: {}
//                         });
//                     });
//                 } else if (clientInfo.role === 'student') {
//                     // Student disconnected, notify teacher if present
//                     const remainingTeacher = getTeacher(session);
//                     if (remainingTeacher) {
//                         sendToClient(session, remainingTeacher.id, {
//                             type: 'STUDENT_DISCONNECTED',
//                             payload: { studentId: clientInfo.id, studentUsername: clientInfo.username }
//                         });
//                     }
//                 }
//             }
//              if (clientInfo.role === 'teacher' && session.clients.size === 0) {
//                 removeSession(sessionId);
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// // perfect with refresh
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');
// const { addSession, removeSession } = require('./sessionStore');
// const log = (msg) => console.log(`[WSS] ${msg}`);


// const sessions = new Map();

// // Helper functions
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }
// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     const container = await docker.createContainer({ Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }});
//                     await container.start();
//                     const exec = await container.exec({ Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         terminalOutput: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                         whiteboardLines: [],
//                         isWhiteboardVisible: false,
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         const output = chunk.toString('utf8');
//                         session.terminalOutput += output;
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: output });
//                     });
//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }
//         const existingClient = Array.from(session.clients).find(c => 
//             c.id === user.id && c.isHomework === isHomeworkSession
//         );
//         if (existingClient) {
//             log(`Found existing ${isHomeworkSession ? 'homework' : 'main'} client for user ${user.username}. Terminating old connection and replacing.`);
//             // Terminate the old connection to prevent ghost clients.
//             existingClient.ws.terminate(); 
//             // Remove the old client object from the set.
//             session.clients.delete(existingClient);
//         }

//         const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
//         session.clients.add(clientInfo);

        

//         if (clientInfo.role === 'teacher' && !isHomeworkSession) {
//             addSession(sessionId, {
//                 sessionId,
//                 teacherId: user.id,
//                 teacherName: user.username,
//                 courseId: 'default_course',
//                 courseName: 'General Session',
//             });
//         }

//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);
//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey} (Homework: ${isHomeworkSession}). Total clients: ${session.clients.size}`);
//         log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Total clients: ${session.clients.size}`);
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     terminalOutput: session.terminalOutput,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     teacherId: teacher ? teacher.id : null,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
//             }
            
//             if (teacher) {
//                  ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));
//             }

//             const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
            
//             if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 console.log(`[CHAT] Relaying message from ${fromId} to ${to}`);
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: { from: fromId, text, timestamp: new Date().toISOString() }
//                 });
//                 return;
//             }

//             switch (data.type) {
//                 case 'WEBRTC_OFFER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_OFFER', payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username }});
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                     return;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }
//             if (data.type === 'STUDENT_RETURN_TO_CLASSROOM') {
//                 console.log(`[STATE_SYNC] Student ${clientInfo.username} returned to classroom. Sending full workspace.`);
//                 sendToClient(session, clientInfo.id, {
//                     type: 'TEACHER_WORKSPACE_UPDATE',
//                     payload: {
//                         files: session.files,
//                         activeFileName: session.activeFile,
//                         terminalOutput: session.terminalOutput,
//                     }
//                 });
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') return;

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 case 'WHITEBOARD_DRAW':
//                     session.whiteboardLines.push(data.payload.line);
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_CODE_DID_UPDATE',
//                        payload: {
//                        files: session.files,
//                        activeFileName: session.activeFile
//                     }
//                         });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;
//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;
//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         session.terminalOutput = '';
//                         // broadcast(session, {
//                         //     type: 'TEACHER_WORKSPACE_UPDATE',
//                         //     payload: {
//                         //         files: session.files,
//                         //         activeFileName: session.activeFile,
//                         //         terminalOutput: session.terminalOutput
//                         //     }
//                         // });
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         let command;
//                         switch (language) {
//                             case 'javascript':
//                                 command = `echo '${escapedCode}' > temp_run_file.js && node temp_run_file.js`;
//                                 break;
//                             case 'python':
//                                 command = `echo '${escapedCode}' > temp_run_file.py && python3 temp_run_file.py`;
//                                 break;
//                             case 'java':
//                                 command = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                                 break;
//                             default:
//                                 command = `echo "Unsupported language: ${language}"`;
//                         }
//                         session.terminalStream.write(`clear && ${command}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
//             log(`${clientInfo.role} ${clientInfo.username} disconnected. Total clients left: ${session.clients.size}`);

//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     if (session.container) await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//              if (clientInfo.role === 'teacher' && session.clients.size === 0) {
//                 removeSession(sessionId);
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');
// const { addSession, removeSession } = require('./sessionStore'); // <-- NEW IMPORT
// const sessions = new Map();

// // Helper to broadcast a message to all clients in the main session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // This function can find any client, regardless of their homework status.
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }
// function getTeacher(session) {
// if (!session || !session.clients) return null;
// return Array.from(session.clients).find(c => c.role === 'teacher');
// }
// function initializeWebSocket(wss) {
// wss.on('connection', async (ws, req) => {
// const urlParams = new URLSearchParams(req.url.split('?')[1]);
// const sessionId = urlParams.get('sessionId');
// const token = urlParams.get('token');
// const teacherSessionId = urlParams.get('teacherSessionId');
// const lessonId = urlParams.get('lessonId');
// if (!sessionId || !token) {
//         return ws.close(1008, "Session ID and token are required");
//     }

//     let user;
//     try {
//         user = jwtDecode(token).user;
//     } catch (e) {
//         return ws.close(1008, "Invalid authentication token");
//     }

//     const isHomeworkSession = !!teacherSessionId && !!lessonId;
//     const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//     let session = sessions.get(sessionKey);

//     if (!session) {
//         if (isHomeworkSession) {
//             console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         } else {
//             try {
//                 const container = await docker.createContainer({ Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }});
//                 await container.start();
//                 const exec = await container.exec({ Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                     terminalOutput: '',
//                     assignments: new Map(),
//                     handsRaised: new Set(),
//                     spotlightedStudentId: null, 
//                     studentWorkspaces: new Map(),
//                     controlledStudentId: null,
//                     isFrozen: false,
//                     whiteboardLines: [],
//                     isWhiteboardVisible: false,
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     const output = chunk.toString('utf8');
//                     session.terminalOutput += output; // <-- ADD THIS LINE to accumulate output
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: output });
//                 });
//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }
//     }

//     const clientInfo = { id: user.id, username: user.username, role: user.role || 'student', ws: ws, isHomework: isHomeworkSession };
//     session.clients.add(clientInfo);

//     // Register session when teacher connects
//     if (clientInfo.role === 'teacher' && !isHomeworkSession) {
//         // In a real app, you'd fetch course details from the DB based on a course ID
//         // passed in the connection URL. For now, we'll use placeholder data.
//         addSession(sessionId, {
//             sessionId,
//             teacherId: user.id,
//             teacherName: user.username,
//             courseId: 'default_course', // Placeholder
//             courseName: 'General Session', // Placeholder
//         });
//     }

//     console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//     const teacher = getTeacher(session);

//     if (isHomeworkSession) {
//         if (teacher) {
//             sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//         }
//          ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//          ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));
//     } else {
//         ws.send(JSON.stringify({ 
//             type: 'ROLE_ASSIGNED', 
//             payload: { 
//                 role: clientInfo.role,
//                 files: session.files,
//                 activeFile: session.activeFile,
//                 terminalOutput: session.terminalOutput,
//                 spotlightedStudentId: session.spotlightedStudentId,
//                 controlledStudentId: session.controlledStudentId,
//                 isFrozen: session.isFrozen,
//                 whiteboardLines: session.whiteboardLines,
//                 isWhiteboardVisible: session.isWhiteboardVisible,
//                 teacherId: teacher ? teacher.id : null,
//             } 
//         }));

//         if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//             ws.send(JSON.stringify({ type: 'HOMEWORK_ASSIGNED', payload: session.assignments.get(user.id) }));
//         }
        
//         if (teacher) {
//              ws.send(JSON.stringify({ type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } }));
//         }

//         const studentList = Array.from(session.clients).filter(c => c.role === 'student' && !c.isHomework).map(c => ({ id: c.id, username: c.username }));
//         broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//     }

//     ws.on('message', async (message) => {
//         const data = JSON.parse(message.toString());
//         const fromId = clientInfo.id;
        
//         // --- FIX: Handle PRIVATE_MESSAGE first to ensure it's always processed ---
//         if (data.type === 'PRIVATE_MESSAGE') {
//             const { to, text } = data.payload;
//             console.log(`[CHAT] Relaying message from ${fromId} to ${to}`);
//             sendToClient(session, to, {
//                 type: 'PRIVATE_MESSAGE',
//                 payload: { from: fromId, text, timestamp: new Date().toISOString() }
//             });
//             return; // Stop further processing
//         }

//         switch (data.type) {
//             case 'WEBRTC_OFFER':
//                 sendToClient(session, data.payload.to, { type: 'WEBRTC_OFFER', payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username }});
//                 return;
//             case 'WEBRTC_ANSWER':
//                 sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                 return;
//             case 'WEBRTC_ICE_CANDIDATE':
//                 sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                 return;
//         }

//         if (clientInfo.isHomework) {
//             if (!teacher) return;
//             switch(data.type) {
//                 case 'HOMEWORK_CODE_UPDATE':
//                     session.studentWorkspaces?.set(user.id, data.payload);
//                     sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                     break;
//                 case 'HOMEWORK_TERMINAL_IN':
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                     break;
//             }
//             return;
//         }
//         if (data.type === 'STUDENT_RETURN_TO_CLASSROOM') {
//             console.log(`[STATE_SYNC] Student ${clientInfo.username} returned to classroom. Sending full workspace.`);
//             sendToClient(session, clientInfo.id, {
//                 type: 'TEACHER_WORKSPACE_UPDATE',
//                 payload: {
//                     files: session.files,
//                     activeFileName: session.activeFile,
//                     terminalOutput: session.terminalOutput, // The crucial piece
//                 }
//             });
//             return; // Stop further processing
//         }

//         if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//             session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//             broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//             return;
//         }

//         if (clientInfo.role !== 'teacher') return;

//         // Teacher-only actions
//         switch (data.type) {
//             case 'TOGGLE_WHITEBOARD':
//                 session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                 broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                 break;
//             case 'WHITEBOARD_DRAW':
//                 session.whiteboardLines.push(data.payload.line);
//                 broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                 break;
//             case 'WHITEBOARD_CLEAR':
//                 session.whiteboardLines = [];
//                 broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                 break;
//             case 'TAKE_CONTROL':
//                 session.controlledStudentId = data.payload.studentId;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                 break;
//             case 'TOGGLE_FREEZE':
//                 session.isFrozen = !session.isFrozen;
//                 broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                 break;
//             case 'TEACHER_DIRECT_EDIT':
//                 const { studentId, workspace } = data.payload;
//                 session.studentWorkspaces?.set(studentId, workspace);
//                 const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                 if (studentClient) {
//                     studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                 }
//                 broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                 break;
//             case 'SPOTLIGHT_STUDENT':
//                 session.spotlightedStudentId = data.payload.studentId;
//                 const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                 break;
//             case 'TEACHER_CODE_UPDATE':
//                 session.files = data.payload.files;
//                 session.activeFile = data.payload.activeFileName;
//                 broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE',payload: {
//                        ...data.payload,
//                        terminalOutput: session.terminalOutput }
//                     });
//                 break;
//             case 'ASSIGN_HOMEWORK':
//                 sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                 session.assignments.set(data.payload.studentId, data.payload);
//                 break;
//             case 'TERMINAL_IN':
//                 if (session.terminalStream) {
//                     session.terminalStream.write(data.payload);
//                 }
//                 break;
//             case 'RUN_CODE':
//                  if (session.terminalStream) {
//                     session.terminalOutput = '';
//                      // 2. Broadcast a full workspace update to sync everyone.
//                     //    This explicitly tells every client's frontend to clear
//                     //    its terminal by providing the new, empty terminalOutput.
//                     broadcast(session, {
//                         type: 'TEACHER_WORKSPACE_UPDATE',
//                         payload: {
//                             files: session.files,
//                             activeFileName: session.activeFile,
//                             terminalOutput: session.terminalOutput // This is now an empty string
//                         }
//                     });
//                     const { language, code } = data.payload;
//                     const escapedCode = code.replace(/'/g, "'\\''");
//                     let command;
//                     switch (language) {
//                         case 'javascript':
//                             command = `echo '${escapedCode}' > temp_run_file.js && node temp_run_file.js`;
//                             break;
//                         case 'python':
//                             command = `echo '${escapedCode}' > temp_run_file.py && python3 temp_run_file.py`;
//                             break;
//                         case 'java':
//                             command = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                             break;
//                         default:
//                             command = `echo "Unsupported language: ${language}"`;
//                     }
//                     session.terminalStream.write(`clear && ${command}\n`);
//                 }
//                 break;
//         }
//     });

//     ws.on('close', async () => {
//         session.clients.delete(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
        
//         if (session.handsRaised.has(clientInfo.id)) {
//             session.handsRaised.delete(clientInfo.id);
//             broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//         }

//         if (session.spotlightedStudentId === clientInfo.id) {
//             session.spotlightedStudentId = null;
//             broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//         }
//         if (session.controlledStudentId === clientInfo.id) {
//             session.controlledStudentId = null;
//             broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//         }
        
//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//             }
//         } else if (session.clients.size === 0) {
//             console.log(`Last client left. Stopping container for session ${sessionId}`);
//             try {
//                 if (session.container) await session.container.stop();
//             } catch (err) {
//                 if (err.statusCode !== 404 && err.statusCode !== 304) {
//                     console.error("Error stopping container:", err);
//                 }
//             }
//             sessions.delete(sessionId);
//         } else {
//              const updatedStudentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//         }
//          if (clientInfo.role === 'teacher' && session.clients.size === 0) {
//             removeSession(sessionId);
//         }
//     });
// });
// }

// module.exports = initializeWebSocket;
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in the main session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // This function can find any client, regardless of their homework status.
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                         whiteboardLines: [],
//                         isWhiteboardVisible: false,
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         // --- FIX: Declare the 'teacher' variable once and before it is used ---
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));

//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     // Now 'teacher' is guaranteed to be defined here
//                     teacherId: teacher ? teacher.id : null,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
            
//             if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 console.log(`[CHAT] Relaying message from ${fromId} to ${to}`);
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: { from: fromId, text, timestamp: new Date().toISOString() }
//                 });
//                 return;
//             }

//             switch (data.type) {
//                 case 'WEBRTC_OFFER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_OFFER', payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username }});
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ANSWER', payload: { from: fromId, answer: data.payload.answer }});
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     sendToClient(session, data.payload.to, { type: 'WEBRTC_ICE_CANDIDATE', payload: { from: fromId, candidate: data.payload.candidate }});
//                     return;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) } });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') return;

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 case 'WHITEBOARD_DRAW':
//                     session.whiteboardLines.push(data.payload.line);
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line: data.payload.line } });
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId }});
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, { type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen }});
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }});
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;
//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;
//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         let command;
//                         switch (language) {
//                             case 'javascript':
//                                 command = `echo '${escapedCode}' > temp_run_file.js && node temp_run_file.js`;
//                                 break;
//                             case 'python':
//                                 command = `echo '${escapedCode}' > temp_run_file.py && python3 temp_run_file.py`;
//                                 break;
//                             case 'java':
//                                 command = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                                 break;
//                             default:
//                                 command = `echo "Unsupported language: ${language}"`;
//                         }
//                         session.terminalStream.write(`clear && ${command}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     if (session.container) await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in the main session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // This function can find any client, regardless of their homework status.
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);


//         if (!session) {
//             const teacher = getTeacher(session);

//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                         // --- NEW: Add whiteboard state to the session ---
//                         whiteboardLines: [],
//                         isWhiteboardVisible: false,
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);
//         const teacher = getTeacher(session);

//         if (isHomeworkSession) {
//             // const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));

//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                     // --- NEW: Send existing whiteboard lines to newly connected users ---
//                     whiteboardLines: session.whiteboardLines,
//                     isWhiteboardVisible: session.isWhiteboardVisible,
//                     teacherId: teacher ? teacher.id : null,

//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
//             const teacher = getTeacher(session);
//              if (data.type === 'PRIVATE_MESSAGE') {
//                 const { to, text } = data.payload;
//                 console.log(`[CHAT] Relaying message from ${fromId} to ${to}`);
//                 // Forward the message to the recipient with the original sender's ID
//                 sendToClient(session, to, {
//                     type: 'PRIVATE_MESSAGE',
//                     payload: {
//                         from: fromId,
//                         text,
//                         timestamp: new Date().toISOString(),
//                     }
//                 });
//                 return; // Stop further processing for this message type
//             }
//             // WebRTC signaling is handled first as it's a direct relay
//             switch (data.type) {
//                 case 'WEBRTC_OFFER':
//                     console.log(`[SIGNALING] Relaying offer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_OFFER',
//                         payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username }
//                     });
//                     return;
//                 case 'WEBRTC_ANSWER':
//                     console.log(`[SIGNALING] Relaying answer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_ANSWER',
//                         payload: { from: fromId, answer: data.payload.answer }
//                     });
//                     return;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     console.log(`[SIGNALING] Relaying ICE candidate from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_ICE_CANDIDATE',
//                         payload: { from: fromId, candidate: data.payload.candidate }
//                     });
//                     return;
//             }

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 return;
//             }

//             // Teacher-only actions
//             switch (data.type) {
//                 case 'TOGGLE_WHITEBOARD':
//                     session.isWhiteboardVisible = !session.isWhiteboardVisible;
//                     broadcast(session, { type: 'WHITEBOARD_VISIBILITY_UPDATE', payload: { isVisible: session.isWhiteboardVisible } });
//                     break;
//                 // --- NEW: Whiteboard Message Handlers ---
//                 case 'WHITEBOARD_DRAW':
//                     const { line } = data.payload;
//                     session.whiteboardLines.push(line);
//                     // Broadcast the new line to everyone in the main session
//                     broadcast(session, { type: 'WHITEBOARD_UPDATE', payload: { line } });
//                     break;
                
//                 case 'WHITEBOARD_CLEAR':
//                     session.whiteboardLines = [];
//                     // Tell everyone to clear their whiteboards
//                     broadcast(session, { type: 'WHITEBOARD_CLEAR' });
//                     break;
//                 // --- All other teacher actions are preserved ---
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, {
//                         type: 'CONTROL_STATE_UPDATE',
//                         payload: { controlledStudentId: session.controlledStudentId }
//                     });
//                     break;
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, {
//                         type: 'FREEZE_STATE_UPDATE',
//                         payload: { isFrozen: session.isFrozen }
//                     });
//                     break;
//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
//                 case 'SPOTLIGHT_STUDENT':
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, {
//                         type: 'SPOTLIGHT_UPDATE',
//                         payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }
//                     });
//                     break;
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;
//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;
//                 // case 'RUN_CODE':
//                 //      if (session.terminalStream) {
//                 //         const { language, code } = data.payload;
//                 //         const escapedCode = code.replace(/'/g, "'\\''");
//                 //         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                 //         let executeCommand;
//                 //         switch (language) {
//                 //             case 'javascript': executeCommand = `node temp_run_file`; break;
//                 //             case 'python': executeCommand = `python3 temp_run_file`; break;
//                 //             case 'java':
//                 //             executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                 //                 break;
//                 //             default: executeCommand = `echo "Unsupported language"`;
//                 //         }
//                 //         const fullCommand = `${writeFileCommand} && ${executeCommand}\n`;
//                 //         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                 //     }
//                 //     break;
//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         let command;
//                         switch (language) {
//                             case 'javascript':
//                                 command = `echo '${escapedCode}' > temp_run_file.js && node temp_run_file.js`;
//                                 break;
//                             case 'python':
//                                 command = `echo '${escapedCode}' > temp_run_file.py && python3 temp_run_file.py`;
//                                 break;
//                             // --- NEW: Added Java execution case ---
//                             case 'java':
//                                 // This assumes the public class name is Main for simplicity
//                                 command = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                                 break;
//                             default:
//                                 command = `echo "Unsupported language: ${language}"`;
//                         }
//                         session.terminalStream.write(`clear && ${command}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (role == teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     if (session.container) await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// perfect mvp 7.2 webcam added
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in the main session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // FIX: Renamed 'sendToUser' to 'sendToClient' for clarity and broader use.
// // This function can find any client, regardless of their homework status.
// function sendToClient(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     } else {
//         console.log(`[WEBSOCKET] Could not find or send to client ID: ${userId}`);
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 // Use the generic sendToClient for consistency
//                 sendToClient(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));

//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const fromId = clientInfo.id;
//             const teacher = getTeacher(session);

//             // --- START: NEW WebRTC Signaling Handlers ---
//             // These messages are simply relayed to the correct recipient.
//             switch (data.type) {
//                 case 'WEBRTC_OFFER':
//                     console.log(`[SIGNALING] Relaying offer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_OFFER',
//                         payload: { from: fromId, offer: data.payload.offer, username: clientInfo.username }
//                     });
//                     return;

//                 case 'WEBRTC_ANSWER':
//                     console.log(`[SIGNALING] Relaying answer from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_ANSWER',
//                         payload: { from: fromId, answer: data.payload.answer }
//                     });
//                     return;
                
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     console.log(`[SIGNALING] Relaying ICE candidate from ${fromId} to ${data.payload.to}`);
//                     sendToClient(session, data.payload.to, {
//                         type: 'WEBRTC_ICE_CANDIDATE',
//                         payload: { from: fromId, candidate: data.payload.candidate }
//                     });
//                     return;
//             }
//             // --- END: NEW WebRTC Signaling Handlers ---


//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         session.studentWorkspaces?.set(user.id, data.payload);
//                         // Use the generic sendToClient for consistency
//                         sendToClient(session, teacher.id, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToClient(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 session.handsRaised.has(clientInfo.id) ? session.handsRaised.delete(clientInfo.id) : session.handsRaised.add(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored:", data.type);
//                 return;
//             }

//             switch (data.type) {
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, {
//                         type: 'CONTROL_STATE_UPDATE',
//                         payload: { controlledStudentId: session.controlledStudentId }
//                     });
//                     break;
                
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, {
//                         type: 'FREEZE_STATE_UPDATE',
//                         payload: { isFrozen: session.isFrozen }
//                     });
//                     break;

//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;
//                     session.studentWorkspaces?.set(studentId, workspace);
//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({ type: 'HOMEWORK_CODE_UPDATE', payload: workspace }));
//                     }
//                     broadcast(session, { type: 'STUDENT_WORKSPACE_UPDATED', payload: { studentId, workspace } });
//                     break;
                
//                 case 'SPOTLIGHT_STUDENT':
//                     // This logic is preserved but may be unused on the frontend now
//                     session.spotlightedStudentId = data.payload.studentId;
//                     const spotlightWorkspace = data.payload.studentId ? session.studentWorkspaces?.get(data.payload.studentId) || null : null;
//                     broadcast(session, {
//                         type: 'SPOTLIGHT_UPDATE',
//                         payload: { studentId: session.spotlightedStudentId, workspace: spotlightWorkspace }
//                     });
//                     break;

//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     sendToClient(session, data.payload.studentId, { type: 'HOMEWORK_ASSIGNED', payload: data.payload });
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;
//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
//                         const fullCommand = `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, { type: 'HAND_RAISED_LIST_UPDATE', payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }});
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, { type: 'SPOTLIGHT_UPDATE', payload: { studentId: null, workspace: null }});
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, { type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: null }});
//             }
            
//             if (isHomeworkSession) {
//                 if (teacher) {
//                     sendToClient(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// PERFECT MVP 7.1
// // correct take control and freeze but not spotlight
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         controlledStudentId: null,
//                         isFrozen: false,
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));

//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         if (session.studentWorkspaces) {
//                             session.studentWorkspaces.set(user.id, data.payload);
//                         }
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 if (session.handsRaised.has(clientInfo.id)) {
//                     session.handsRaised.delete(clientInfo.id);
//                 } else {
//                     session.handsRaised.add(clientInfo.id);
//                 }
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored:", data.type);
//                 return;
//             }

//             switch (data.type) {
//                 case 'TAKE_CONTROL':
//                     session.controlledStudentId = data.payload.studentId;
//                     broadcastToAll(session, {
//                         type: 'CONTROL_STATE_UPDATE',
//                         payload: { controlledStudentId: session.controlledStudentId }
//                     });
//                     break;
                
//                 case 'TOGGLE_FREEZE':
//                     session.isFrozen = !session.isFrozen;
//                     broadcastToAll(session, {
//                         type: 'FREEZE_STATE_UPDATE',
//                         payload: { isFrozen: session.isFrozen }
//                     });
//                     break;

//                 case 'TEACHER_DIRECT_EDIT':
//                     const { studentId, workspace } = data.payload;

//                     if (session.studentWorkspaces) {
//                         session.studentWorkspaces.set(studentId, workspace);
//                     }
                    
//                     broadcast(session, {
//                         type: 'HOMEWORK_CODE_UPDATE',
//                         payload: { studentId, workspace }
//                     });

//                     const studentClient = Array.from(session.clients).find(c => c.id === studentId && c.isHomework);
//                     if (studentClient) {
//                         studentClient.ws.send(JSON.stringify({
//                             type: 'HOMEWORK_CODE_UPDATE',
//                             payload: workspace
//                         }));
//                     }

//                     if (session.spotlightedStudentId === studentId) {
//                         broadcast(session, {
//                             type: 'SPOTLIGHT_UPDATE',
//                             payload: { 
//                                 studentId: session.spotlightedStudentId,
//                                 workspace: workspace
//                             }
//                         });
//                     }
//                     break;
                
//                 case 'SPOTLIGHT_STUDENT':
//                     const studentIdToSpotlight = data.payload.studentId;
//                     session.spotlightedStudentId = studentIdToSpotlight;

//                     let spotlightWorkspace = null;
//                     if (studentIdToSpotlight && session.studentWorkspaces.has(studentIdToSpotlight)) {
//                         spotlightWorkspace = session.studentWorkspaces.get(studentIdToSpotlight);
//                     }

//                     broadcast(session, {
//                         type: 'SPOTLIGHT_UPDATE',
//                         payload: { 
//                             studentId: session.spotlightedStudentId,
//                             workspace: spotlightWorkspace
//                         }
//                     });
//                     break;

//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { lessonId, teacherSessionId, title } = data.payload;
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     sendToUser(session, data.payload.studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                      if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, {
//                     type: 'SPOTLIGHT_UPDATE',
//                     payload: { studentId: null, workspace: null }
//                 });
//             }
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, {
//                     type: 'CONTROL_STATE_UPDATE',
//                     payload: { controlledStudentId: null }
//                 });
//             }
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;



// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         // Homework clients don't get general session broadcasts, they get updates through their own logic
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to broadcast to ALL clients, including those in homework sessions
// // Useful for global commands like 'freeze'
// function broadcastToAll(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }


// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         studentWorkspaces: new Map(),
//                         // --- NEW STATE PROPERTIES ---
//                         controlledStudentId: null, // ID of student whose editor is controlled by teacher
//                         isFrozen: false,           // True if "pencils down" is active
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//             // Send current freeze/control state to joining student
//              ws.send(JSON.stringify({ type: 'FREEZE_STATE_UPDATE', payload: { isFrozen: session.isFrozen } }));
//              ws.send(JSON.stringify({ type: 'CONTROL_STATE_UPDATE', payload: { controlledStudentId: session.controlledStudentId } }));

//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId,
//                     // Send initial state for new features
//                     controlledStudentId: session.controlledStudentId,
//                     isFrozen: session.isFrozen,
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             // Homework session messages
//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         if (session.studentWorkspaces) {
//                             session.studentWorkspaces.set(user.id, data.payload);
//                         }
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             // Main session messages
//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 if (session.handsRaised.has(clientInfo.id)) {
//                     session.handsRaised.delete(clientInfo.id);
//                 } else {
//                     session.handsRaised.add(clientInfo.id);
//                 }
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored:", data.type);
//                 return;
//             }

//             // --- Teacher-only actions ---
//             switch (data.type) {
//                 // --- START: NEW AND MODIFIED CASES ---
//                 case 'TAKE_CONTROL': // New case
//                     session.controlledStudentId = data.payload.studentId;
//                     // Broadcast to ALL clients (teacher and students in homework view)
//                     broadcastToAll(session, {
//                         type: 'CONTROL_STATE_UPDATE',
//                         payload: { controlledStudentId: session.controlledStudentId }
//                     });
//                     break;
                
//                 case 'TOGGLE_FREEZE': // New case
//                     session.isFrozen = !session.isFrozen;
//                     // Broadcast to ALL clients (teacher and students in homework view)
//                     broadcastToAll(session, {
//                         type: 'FREEZE_STATE_UPDATE',
//                         payload: { isFrozen: session.isFrozen }
//                     });
//                     break;

//                 case 'TEACHER_DIRECT_EDIT': // New case for when teacher types in student's editor
//                     const { studentId, workspace } = data.payload;
//                     if (session.studentWorkspaces) {
//                         session.studentWorkspaces.set(studentId, workspace);
//                     }
//                     // Forward the update to the teacher's own UI and any other observers
//                     broadcast(session, {
//                         type: 'HOMEWORK_CODE_UPDATE',
//                         payload: { studentId, workspace }
//                     });
//                     break;

//                 // --- END: NEW AND MODIFIED CASES ---
                
//                 case 'SPOTLIGHT_STUDENT':
//                     const studentIdToSpotlight = data.payload.studentId;
//                     session.spotlightedStudentId = studentIdToSpotlight;

//                     let spotlightWorkspace = null;
//                     if (studentIdToSpotlight && session.studentWorkspaces.has(studentIdToSpotlight)) {
//                         spotlightWorkspace = session.studentWorkspaces.get(studentIdToSpotlight);
//                     }

//                     broadcast(session, {
//                         type: 'SPOTLIGHT_UPDATE',
//                         payload: { 
//                             studentId: session.spotlightedStudentId,
//                             workspace: spotlightWorkspace
//                         }
//                     });
//                     break;

//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { lessonId, teacherSessionId, title } = data.payload;
//                     session.assignments.set(data.payload.studentId, data.payload);
//                     sendToUser(session, data.payload.studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, {
//                     type: 'SPOTLIGHT_UPDATE',
//                     payload: { studentId: null, workspace: null }
//                 });
//             }
//              // If the controlled student disconnects, release control
//             if (session.controlledStudentId === clientInfo.id) {
//                 session.controlledStudentId = null;
//                 broadcastToAll(session, {
//                     type: 'CONTROL_STATE_UPDATE',
//                     payload: { controlledStudentId: null }
//                 });
//             }
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// /**
//  * @file websocketHandler.js
//  * @description This version fixes the Teacher Spotlight feature by making the server
//  * the central source of truth for all student homework states.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session) {
//             if (isHomeworkSession) {
//                 console.error(`[ERROR] Student tried to join homework for a non-existent session: ${sessionKey}`);
//                 return ws.close(1011, "Cannot join homework for a session that does not exist.");
//             } else {
//                 try {
//                     console.log(`Creating container for new session: ${sessionId}`);
//                     const container = await docker.createContainer({
//                         Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                     });
//                     await container.start();
//                     const exec = await container.exec({
//                         Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                     });
//                     const terminalStream = await exec.start({ hijack: true, stdin: true });
                    
//                     session = {
//                         container,
//                         terminalStream,
//                         clients: new Set(),
//                         files: [],
//                         activeFile: '',
//                         assignments: new Map(),
//                         handsRaised: new Set(),
//                         spotlightedStudentId: null, 
//                         // NEW: Central store for all student homework code
//                         studentWorkspaces: new Map(),
//                     };
//                     sessions.set(sessionId, session);

//                     session.terminalStream.on('data', (chunk) => {
//                         broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                     });

//                 } catch (err) {
//                     console.error("Failed to create container:", err);
//                     return ws.close(1011, "Failed to initialize session environment.");
//                 }
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile,
//                     spotlightedStudentId: session.spotlightedStudentId 
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         // FIX: Update the central store on the main session object first.
//                         if (session.studentWorkspaces) {
//                             session.studentWorkspaces.set(user.id, data.payload);
//                         }
//                         // Then, forward the update to the teacher for live viewing.
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 if (session.handsRaised.has(clientInfo.id)) {
//                     session.handsRaised.delete(clientInfo.id);
//                 } else {
//                     session.handsRaised.add(clientInfo.id);
//                 }
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored:", data.type);
//                 return;
//             }

//             // --- Teacher-only actions ---
//             switch (data.type) {
//                 case 'SPOTLIGHT_STUDENT':
//                     const studentIdToSpotlight = data.payload.studentId;
//                     session.spotlightedStudentId = studentIdToSpotlight;

//                     // FIX: Retrieve the spotlighted student's code from the central store.
//                     let spotlightWorkspace = null;
//                     if (studentIdToSpotlight && session.studentWorkspaces.has(studentIdToSpotlight)) {
//                         spotlightWorkspace = session.studentWorkspaces.get(studentIdToSpotlight);
//                     }

//                     broadcast(session, {
//                         type: 'SPOTLIGHT_UPDATE',
//                         payload: { 
//                             studentId: session.spotlightedStudentId,
//                             workspace: spotlightWorkspace // Send the actual code to all clients.
//                         }
//                     });
//                     break;

//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     session.assignments.set(studentId, data.payload);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//             }

//             if (session.spotlightedStudentId === clientInfo.id) {
//                 session.spotlightedStudentId = null;
//                 broadcast(session, {
//                     type: 'SPOTLIGHT_UPDATE',
//                     payload: { studentId: null, workspace: null }
//                 });
//             }
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;


// /**
//  * @file websocketHandler.js
//  * @description This version adds teacher-initiated, one-to-one student webcam viewing.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && !isHomeworkSession) {
//             try {
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                     assignments: new Map(),
//                     handsRaised: new Set(),
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 // ... (homework logic remains the same)
//                 return;
//             }

//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 if (session.handsRaised.has(clientInfo.id)) {
//                     session.handsRaised.delete(clientInfo.id);
//                 } else {
//                     session.handsRaised.add(clientInfo.id);
//                 }
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return;
//             }

//             // --- MODIFIED: Route WebRTC signals based on role ---
//             if (clientInfo.role === 'teacher') {
//                 switch (data.type) {
//                     case 'TEACHER_REQUEST_STUDENT_STREAM':
//                         sendToUser(session, data.payload.studentId, { type: 'TEACHER_REQUEST_STREAM', payload: { teacherId: clientInfo.id } });
//                         break;
//                     case 'TEACHER_ANSWER_STREAM':
//                         sendToUser(session, data.payload.studentId, { type: 'TEACHER_ANSWER_STREAM', payload: { answer: data.payload.answer } });
//                         break;
//                     case 'ICE_CANDIDATE':
//                         sendToUser(session, data.payload.studentId, { type: 'ICE_CANDIDATE', payload: { from: clientInfo.id, candidate: data.payload.candidate } });
//                         break;
//                     // ... other teacher cases
//                 }
//             } else { // Student signaling
//                 switch (data.type) {
//                     case 'STUDENT_OFFER_STREAM':
//                         sendToUser(session, data.payload.teacherId, { type: 'STUDENT_OFFER_STREAM', payload: { studentId: clientInfo.id, offer: data.payload.offer } });
//                         break;
//                     case 'ICE_CANDIDATE':
//                         sendToUser(session, data.payload.teacherId, { type: 'ICE_CANDIDATE', payload: { from: clientInfo.id, candidate: data.payload.candidate } });
//                         break;
//                 }
//             }


//             if (clientInfo.role !== 'teacher') {
//                 return; // Students cannot perform actions below this line
//             }

//             // --- Teacher-only actions ---
//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     session.assignments.set(studentId, data.payload);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//             }
            
//             if (isHomeworkSession) {
//                 // ... (homework logic remains the same)
//             } else if (session.clients.size === 0) {
//                 // ... (session cleanup logic remains the same)
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// LATEST with hand signaling
// /**
//  * @file websocketHandler.js
//  * @description This version adds the "Raise Hand" feature while preserving all
//  * existing logic for code execution, terminal streaming, and homework assignments.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && !isHomeworkSession) {
//             try {
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                     assignments: new Map(),
//                     // NEW: Set to store IDs of students with hands raised
//                     handsRaised: new Set(),
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}.`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             if (clientInfo.role === 'student' && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }
            
//             const teacher = getTeacher(session);
//             if (teacher) {
//                  ws.send(JSON.stringify({
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             // --- Handle RAISE_HAND event from students ---
//             if (data.type === 'RAISE_HAND' && clientInfo.role === 'student') {
//                 if (session.handsRaised.has(clientInfo.id)) {
//                     session.handsRaised.delete(clientInfo.id); // Lower hand
//                 } else {
//                     session.handsRaised.add(clientInfo.id); // Raise hand
//                 }
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//                 return; // Stop further processing for this message type
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from non-teacher in main session ignored:", data.type);
//                 return;
//             }

//             // --- Teacher-only actions ---
//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     session.assignments.set(studentId, data.payload);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected.`);
            
//             if (session.handsRaised.has(clientInfo.id)) {
//                 session.handsRaised.delete(clientInfo.id);
//                 broadcast(session, {
//                     type: 'HAND_RAISED_LIST_UPDATE',
//                     payload: { studentsWithHandsRaised: Array.from(session.handsRaised) }
//                 });
//             }
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// MVP 6 LATEST
// /**
//  * @file websocketHandler.js
//  * @description This version fixes the role assignment logic to be based on the
//  * user's authenticated role from the JWT, not the connection order.
//  * It also persists homework assignments within the session to handle student refreshes.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         // Broadcast only to clients in the main session
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             // The decoded token contains the user object, including the role
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && isHomeworkSession) {
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         }
        
//         if (!session && !isHomeworkSession) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                     // NEW: Add a map to track assignments within the session.
//                     assignments: new Map(),
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Is Homework: ${isHomeworkSession}`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             // --- NEW LOGIC for handling refreshes ---
//             // Check if this connecting student has a pending assignment stored in the session.
//             if (clientInfo.role === 'student' && session.assignments && session.assignments.has(user.id)) {
//                 const assignment = session.assignments.get(user.id);
//                 console.log(`[SERVER] Re-sending assignment for lesson ${assignment.lessonId} to reconnecting student ${user.id}`);
//                 // Send the HOMEWORK_ASSIGNED message again, only to this user.
//                 ws.send(JSON.stringify({
//                     type: 'HOMEWORK_ASSIGNED',
//                     payload: assignment
//                 }));
//             }

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored.");
//                 return;
//             }

//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     console.log("[SERVER] Teacher updated workspace. Broadcasting...");
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     console.log(`[SERVER] Teacher assigning homework (Lesson ID: ${lessonId}) to student ${studentId}`);
                    
//                     // --- NEW LOGIC for persisting assignments ---
//                     // Store the assignment details in the session's assignment map.
//                     if (session.assignments) {
//                         session.assignments.set(studentId, data.payload);
//                     }

//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected from session ${sessionKey}.`);
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// /**
//  * @file websocketHandler.js
//  * @description This version fixes the role assignment logic to be based on the
//  * user's authenticated role from the JWT, not the connection order.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         // Broadcast only to clients in the main session
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             // The decoded token contains the user object, including the role
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && isHomeworkSession) {
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         }
        
//         if (!session && !isHomeworkSession) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             // --- THIS IS THE FIX ---
//             // The role is now taken directly from the authenticated user's token,
//             // which is the reliable source of truth. Defaults to 'student' if not present.
//             role: user.role || 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Is Homework: ${isHomeworkSession}`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             // Actions are restricted to the teacher. This check is now reliable.
//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored.");
//                 return;
//             }

//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     console.log("[SERVER] Teacher updated workspace. Broadcasting...");
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     console.log(`[SERVER] Teacher assigning homework (Lesson ID: ${lessonId}) to student ${studentId}`);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected from session ${sessionKey}.`);
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// PERFECT except user role handling
// /**
//  * @file websocketHandler.js
//  * @description This version re-integrates multi-student and homework features
//  * onto the stable, broadcasting MVP base, with added authentication and message routing.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode'); // Re-added for user identification

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         // Broadcast only to clients in the main session
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         // **MODIFIED**: Re-added token for authentication
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && isHomeworkSession) {
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         }
        
//         if (!session && !isHomeworkSession) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });
//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             // **FIX**: Role is determined by the main session's client list, not just the order of connection
//             role: session.clients.size === 0 ? 'teacher' : 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Is Homework: ${isHomeworkSession}`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             // **FIX**: The original logic correctly restricted actions to the teacher. This is restored.
//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored.");
//                 return;
//             }

//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     console.log("[SERVER] Teacher updated workspace. Broadcasting...");
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     console.log(`[SERVER] Teacher assigning homework (Lesson ID: ${lessonId}) to student ${studentId}`);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected from session ${sessionKey}.`);
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// /**
//  * @file websocketHandler.js
//  * @description This version re-integrates multi-student and homework features
//  * onto the stable, broadcasting MVP base.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');
// const db = require('../db');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     // **FIX**: Ensure we only broadcast to clients in the main session, not homework sessions
//     session.clients.forEach(client => {
//         if (!client.isHomework && client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user in a session
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId && !c.isHomework);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId');
//         const lessonId = urlParams.get('lessonId');

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         if (!session && isHomeworkSession) {
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         }
        
//         if (!session && !isHomeworkSession) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env', Tty: true, Cmd: ['/bin/bash'], OpenStdin: true, HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();

//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
//                 });

//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     files: [],
//                     activeFile: '',
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: session.clients.size === 0 ? 'teacher' : 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Is Homework: ${isHomeworkSession}`);

//         if (isHomeworkSession) {
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         } else {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     files: session.files,
//                     activeFile: session.activeFile
//                 } 
//             }));

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         }

//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             if (clientInfo.isHomework) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return;
//             }

//             if (clientInfo.role !== 'teacher') {
//                 console.log("Message from student in main session ignored.");
//                 return;
//             }

//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     console.log("[SERVER] Teacher updated workspace. Broadcasting...");
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFileName;
//                     broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                     console.log(`[SERVER] Teacher assigning homework (Lesson ID: ${lessonId}) to student ${studentId}`);
//                     sendToUser(session, studentId, { 
//                         type: 'HOMEWORK_ASSIGNED', 
//                         payload: { lessonId, teacherSessionId, title }
//                     });
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream) {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream) {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}\n`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected from session ${sessionKey}.`);
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// _________________________________________________________________
// // PERFECT MVP
// /**
//  * @file websocketHandler.js
//  * @description This is a corrected and simplified version focusing on a robust,
//  * real-time, one-to-many broadcast from the teacher to all students.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         // Initialize a new session if it doesn't exist
//         if (!session) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env',
//                     Tty: true,
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'],
//                     AttachStdin: true,
//                     AttachStdout: true,
//                     AttachStderr: true,
//                     Tty: true,
//                 });

//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     clients: new Set(),
//                     terminalStream,
//                     // **FIX**: Initialize with a default file structure for new sessions
//                     files: [
//                         { name: 'script.js', language: 'javascript', content: 'console.log("Hello, World!");' }
//                     ],
//                     activeFile: 'script.js'
//                 };
//                 sessions.set(sessionId, session);

//                 // Pipe terminal output to all clients in the session
//                 session.terminalStream.on('data', (chunk) => {
//                     const output = chunk.toString('utf8');
//                     session.clients.forEach(client => {
//                         if (client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output }));
//                         }
//                     });
//                 });

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         const isTeacher = Array.from(session.clients).findIndex(c => c === ws) === 0;
        
//         // Send the current session state to the newly connected client
//         ws.send(JSON.stringify({ 
//             type: 'ROLE_ASSIGNED', 
//             payload: { 
//                 role: isTeacher ? 'teacher' : 'student',
//                 files: session.files,
//                 activeFile: session.activeFile
//             } 
//         }));

//         // Handle incoming messages
//         ws.on('message', async (message) => {
//             try {
//                 const data = JSON.parse(message.toString());
//                 const isSenderTeacher = Array.from(session.clients).findIndex(c => c === ws) === 0;

//                 // **FIX**: Only allow the teacher to make changes
//                 if (!isSenderTeacher) {
//                     console.log("Message from student ignored.");
//                     return;
//                 }

//                 console.log("Received message from teacher:", data.type);

//                 switch (data.type) {
//                     case 'TERMINAL_IN':
//                         session.terminalStream.write(data.payload);
//                         break;
                    
//                     case 'RUN_CODE': {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language: ${language}"`;
//                         }
                        
//                         const commandPrefix = (language === 'java') ? '' : `${writeFileCommand} && `;
//                         const fullCommand = `clear && ${commandPrefix}${executeCommand}\n`;
                        
//                         session.terminalStream.write(fullCommand);
//                         break;
//                     }

//                     // **FIX**: For any workspace change, update the session state and broadcast it to ALL clients.
//                     case 'FILE_STRUCTURE_UPDATE':
//                     case 'CODE_UPDATE':
//                     case 'LANGUAGE_UPDATE':
//                         session.files = data.payload.files;
//                         session.activeFile = data.payload.activeFile;
//                         session.clients.forEach(client => {
//                             if (client.readyState === ws.OPEN) {
//                                 client.send(JSON.stringify(data));
//                             }
//                         });
//                         break;
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             session.clients.delete(ws);

//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// /**
//  * @file websocketHandler.js
//  * @description This version correctly merges Docker terminal logic with the multi-student
//  * classroom architecture, ensuring real-time synchronization and proper message routing for
//  * both the main session and individual homework monitoring.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();
// const { jwtDecode } = require('jwt-decode');
// const db = require('../db');

// const sessions = new Map();

// // Helper to broadcast a message to all clients in a session
// function broadcast(session, message) {
//     if (!session || !session.clients) return;
//     session.clients.forEach(client => {
//         if (client.ws.readyState === client.ws.OPEN) {
//             client.ws.send(JSON.stringify(message));
//         }
//     });
// }

// // Helper to send a message to a specific user
// function sendToUser(session, userId, message) {
//     if (!session || !session.clients) return;
//     const client = Array.from(session.clients).find(c => c.id === userId);
//     if (client && client.ws.readyState === client.ws.OPEN) {
//         client.ws.send(JSON.stringify(message));
//     }
// }

// function getTeacher(session) {
//     if (!session || !session.clients) return null;
//     return Array.from(session.clients).find(c => c.role === 'teacher');
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');
//         const token = urlParams.get('token');
//         const teacherSessionId = urlParams.get('teacherSessionId'); // For homework sessions
//         const lessonId = urlParams.get('lessonId'); // For homework sessions

//         if (!sessionId || !token) {
//             return ws.close(1008, "Session ID and token are required");
//         }

//         let user;
//         try {
//             user = jwtDecode(token).user;
//         } catch (e) {
//             return ws.close(1008, "Invalid authentication token");
//         }

//         const isHomeworkSession = !!teacherSessionId && !!lessonId;
//         const sessionKey = isHomeworkSession ? teacherSessionId : sessionId;
//         let session = sessions.get(sessionKey);

//         // If the main session doesn't exist, something is wrong.
//         if (!session && isHomeworkSession) {
//             return ws.close(1011, "Cannot join homework for a session that does not exist.");
//         }
        
//         // Create a new main session if it doesn't exist
//         if (!session && !isHomeworkSession) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env',
//                     Tty: true,
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();

//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'],
//                     AttachStdin: true,
//                     AttachStdout: true,
//                     AttachStderr: true,
//                     Tty: true,
//                 });

//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     terminalStream,
//                     clients: new Set(),
//                     teacherFiles: [],
//                     activeTeacherFile: '',
//                     studentWorkspaces: new Map(),
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     broadcast(session, { type: 'TERMINAL_OUT', payload: chunk.toString('utf8') });
//                 });

//             } catch (err) {
//                 console.error("Failed to create container:", err);
//                 return ws.close(1011, "Failed to initialize session environment.");
//             }
//         }

//         const clientInfo = {
//             id: user.id,
//             username: user.username,
//             role: session.clients.size === 0 ? 'teacher' : 'student',
//             ws: ws,
//             isHomework: isHomeworkSession,
//         };
//         session.clients.add(clientInfo);
//         console.log(`${clientInfo.role} ${clientInfo.username} connected to session ${sessionKey}. Is Homework: ${isHomeworkSession}`);

//         if (!isHomeworkSession) {
//             ws.send(JSON.stringify({ 
//                 type: 'ROLE_ASSIGNED', 
//                 payload: { 
//                     role: clientInfo.role,
//                     teacherFiles: session.teacherFiles,
//                     activeTeacherFile: session.activeTeacherFile
//                 } 
//             }));

//             const studentList = Array.from(session.clients)
//                 .filter(c => c.role === 'student' && !c.isHomework)
//                 .map(c => ({ id: c.id, username: c.username }));
            
//             broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: studentList }});
//         } else {
//             // Announce that a student has joined a homework session
//             const teacher = getTeacher(session);
//             if (teacher) {
//                 sendToUser(session, teacher.id, { type: 'HOMEWORK_JOIN', payload: { studentId: user.id } });
//             }
//         }


//         ws.on('message', async (message) => {
//             const data = JSON.parse(message.toString());
//             const teacher = getTeacher(session);

//             // Route messages based on whether they come from a homework session
//             if (isHomeworkSession) {
//                 if (!teacher) return;
//                 switch(data.type) {
//                     case 'HOMEWORK_CODE_UPDATE':
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_CODE_UPDATE', payload: { studentId: user.id, workspace: data.payload } });
//                         break;
//                     case 'HOMEWORK_TERMINAL_IN':
//                         // This would require a separate container per student, which is a larger architectural change.
//                         // For now, we'll just echo it back to the teacher's view of that student.
//                         sendToUser(session, teacher.id, { type: 'HOMEWORK_TERMINAL_UPDATE', payload: { studentId: user.id, output: data.payload } });
//                         break;
//                 }
//                 return; // Stop processing for homework clients
//             }

//             // --- Main Session Message Handling ---
//             switch (data.type) {
//                 case 'TEACHER_CODE_UPDATE':
//                     if (clientInfo.role === 'teacher') {
//                         console.log("[SERVER] Teacher updated workspace. Broadcasting...");
//                         session.teacherFiles = data.payload.files;
//                         session.activeTeacherFile = data.payload.activeFileName;
//                         broadcast(session, { type: 'TEACHER_WORKSPACE_UPDATE', payload: data.payload });
//                     }
//                     break;
                
//                 case 'ASSIGN_HOMEWORK':
//                     if (clientInfo.role === 'teacher') {
//                         const { studentId, lessonId, teacherSessionId, title } = data.payload;
//                         console.log(`[SERVER] Teacher assigning homework (Lesson ID: ${lessonId}) to student ${studentId}`);
//                         sendToUser(session, studentId, { 
//                             type: 'HOMEWORK_ASSIGNED', 
//                             payload: { lessonId, teacherSessionId, title }
//                         });
//                     }
//                     break;

//                 case 'TERMINAL_IN':
//                     if (session.terminalStream && clientInfo.role === 'teacher') {
//                         session.terminalStream.write(data.payload);
//                     }
//                     break;

//                 case 'RUN_CODE':
//                     if (session.terminalStream && clientInfo.role === 'teacher') {
//                         const { language, code } = data.payload;
//                         const escapedCode = code.replace(/'/g, "'\\''");
//                         const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;
//                         let executeCommand;

//                         switch (language) {
//                             case 'javascript': executeCommand = `node temp_run_file`; break;
//                             case 'python': executeCommand = `python3 temp_run_file`; break;
//                             case 'java': executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`; break;
//                             default: executeCommand = `echo "Unsupported language"`;
//                         }
                        
//                         const fullCommand = (language === 'java') ? `${executeCommand}\n` : `${writeFileCommand} && ${executeCommand}\n`;
//                         session.terminalStream.write(`clear && ${fullCommand}`);
//                     }
//                     break;
//             }
//         });

//         ws.on('close', async () => {
//             session.clients.delete(clientInfo);
//             console.log(`${clientInfo.role} ${clientInfo.username} disconnected from session ${sessionKey}.`);
            
//             if (isHomeworkSession) {
//                 const teacher = getTeacher(session);
//                 if (teacher) {
//                     sendToUser(session, teacher.id, { type: 'HOMEWORK_LEAVE', payload: { studentId: user.id } });
//                 }
//             } else if (session.clients.size === 0) {
//                 console.log(`Last client left. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                  const updatedStudentList = Array.from(session.clients)
//                     .filter(c => c.role === 'student' && !c.isHomework)
//                     .map(c => ({ id: c.id, username: c.username }));
//                 broadcast(session, { type: 'STUDENT_LIST_UPDATE', payload: { students: updatedStudentList }});
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;




// ______________________________________________________________


// perfect mvp
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         if (!session) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env',
//                     Tty: true,
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'],
//                     AttachStdin: true,
//                     AttachStdout: true,
//                     AttachStderr: true,
//                     Tty: true,
//                 });

//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     clients: new Set(),
//                     terminalStream,
//                     files: [{ name: 'script.js', language: 'javascript', content: 'console.log("Hello, World!");' }],
//                     activeFile: 'script.js'
//                 };
//                 sessions.set(sessionId, session);

//                 session.terminalStream.on('data', (chunk) => {
//                     const output = chunk.toString('utf8');
//                     session.clients.forEach(client => {
//                         if (client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output }));
//                         }
//                     });
//                 });

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         const isTeacher = Array.from(session.clients).findIndex(c => c === ws) === 0;
//         ws.send(JSON.stringify({ 
//             type: 'ROLE_ASSIGNED', 
//             payload: { 
//                 role: isTeacher ? 'teacher' : 'student',
//                 files: session.files,
//                 activeFile: session.activeFile
//             } 
//         }));

//         if (!isTeacher) {
//             const teacherWs = Array.from(session.clients)[0];
//             if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//                 teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//             }
//         }

//         ws.on('message', async (message) => {
//             try {
//                 const data = JSON.parse(message.toString());

//                 if (data.type === 'TERMINAL_IN') {
//                     session.terminalStream.write(data.payload);
//                 } else if (data.type === 'RUN_CODE') {
//                     // *** CHANGE HERE: Send a 'clear' command to the terminal before execution. ***
//                     const { language, code } = data.payload;
//                     let executeCommand;
//                     const escapedCode = code.replace(/'/g, "'\\''"); // Basic escaping for single quotes

//                     // Define the command to write the code to a file
//                     const writeFileCommand = `echo '${escapedCode}' > temp_run_file`;

//                     // Define the execution command based on the language
//                     switch (language) {
//                         case 'javascript':
//                             executeCommand = `node temp_run_file`;
//                             break;
//                         case 'python':
//                             executeCommand = `python3 temp_run_file`;
//                             break;
//                         case 'java':
//                             // For Java, the class name must match the file name.
//                             // This assumes the main class is named 'Main'.
//                             executeCommand = `echo '${escapedCode}' > Main.java && javac Main.java && java Main`;
//                             break;
//                         default:
//                             executeCommand = `echo "Unsupported language: ${language}"`;
//                     }
                    
//                     // Combine commands: clear the screen, run the code, then add a newline for the prompt.
//                     // For Java, the writeFileCommand is part of the executeCommand.
//                     const commandPrefix = (language === 'java') ? '' : `${writeFileCommand} && `;
//                     const fullCommand = `clear && ${commandPrefix}${executeCommand}\n`;
                    
//                     // Write the full command to the interactive terminal stream.
//                     if (session.terminalStream) {
//                         session.terminalStream.write(fullCommand);
//                     }

//                 } else if (data.type === 'FILE_STRUCTURE_UPDATE') {
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFile;
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 } else {
//                     // Broadcast other collaboration messages
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             if (!session) return;
//             session.clients.delete(ws);

//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                 session.clients.forEach(client => {
//                     client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//                 });
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;


// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// // This function remains the same, used for the "Run Code" button.
// async function executeCodeInContainer(container, command) {
//     try {
//         const exec = await container.exec({
//             Cmd: ['/bin/bash', '-c', command],
//             AttachStdout: true,
//             AttachStderr: true,
//             Tty: false
//         });

//         return new Promise((resolve, reject) => {
//             exec.start({ hijack: true, stdin: true }, (err, stream) => {
//                 if (err) return reject(err);
//                 let output = '';
//                 stream.on('data', chunk => output += chunk.toString('utf8'));
//                 stream.on('end', () => resolve(output));
//                 stream.on('error', err => reject(err));
//             });
//         });
//     } catch (error) {
//         console.error('Error executing command in container:', error);
//         return `Error: ${error.message}`;
//     }
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         if (!session) {
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 const container = await docker.createContainer({
//                     Image: 'code-execution-env',
//                     Tty: true, // Tty is important for an interactive shell
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 // *** CHANGE 1: Create a long-lived interactive shell for the terminal ***
//                 const exec = await container.exec({
//                     Cmd: ['/bin/bash'],
//                     AttachStdin: true,
//                     AttachStdout: true,
//                     AttachStderr: true,
//                     Tty: true,
//                 });

//                 const terminalStream = await exec.start({ hijack: true, stdin: true });
                
//                 session = {
//                     container,
//                     clients: new Set(),
//                     terminalStream, // Store the stream in the session
//                     files: [{ name: 'script.js', language: 'javascript', content: 'console.log("Hello, World!");' }],
//                     activeFile: 'script.js'
//                 };
//                 sessions.set(sessionId, session);

//                 // *** CHANGE 2: Pipe container output back to all clients ***
//                 session.terminalStream.on('data', (chunk) => {
//                     const output = chunk.toString('utf8');
//                     session.clients.forEach(client => {
//                         if (client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output }));
//                         }
//                     });
//                 });

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         const isTeacher = Array.from(session.clients).findIndex(c => c === ws) === 0;
//         ws.send(JSON.stringify({ 
//             type: 'ROLE_ASSIGNED', 
//             payload: { 
//                 role: isTeacher ? 'teacher' : 'student',
//                 files: session.files,
//                 activeFile: session.activeFile
//             } 
//         }));

//         if (!isTeacher) {
//             const teacherWs = Array.from(session.clients)[0];
//             if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//                 teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//             }
//         }

//         ws.on('message', async (message) => {
//             try {
//                 const data = JSON.parse(message.toString());

//                 // *** CHANGE 3: Handle terminal input by writing to the container's shell ***
//                 if (data.type === 'TERMINAL_IN') {
//                     session.terminalStream.write(data.payload);
//                 } else if (data.type === 'RUN_CODE') {
//                     // This functionality remains the same
//                     const { language, code } = data.payload;
//                     let executeCommand;
//                     const escapedCode = code.replace(/'/g, "'\\''");
//                     const writeFileCommand = `echo '${escapedCode}' > temp_script`;

//                     switch (language) {
//                         case 'javascript': executeCommand = `node temp_script`; break;
//                         case 'python': executeCommand = `python3 temp_script`; break;
//                         case 'java': executeCommand = `mv temp_script Main.java && javac Main.java && java Main`; break;
//                         default: executeCommand = 'echo "Unsupported language."';
//                     }
                    
//                     const fullCommand = `${writeFileCommand} && ${executeCommand}`;
//                     const output = await executeCodeInContainer(session.container, fullCommand);
//                     session.clients.forEach(client => {
//                         if (client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output + '\n' }));
//                         }
//                     });

//                 } else if (data.type === 'FILE_STRUCTURE_UPDATE') {
//                     session.files = data.payload.files;
//                     session.activeFile = data.payload.activeFile;
//                     // Broadcast the change to other clients
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 } else {
//                     // Broadcast other collaboration messages
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             session.clients.delete(ws);

//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                 session.clients.forEach(client => {
//                     client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//                 });
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// async function executeCodeInContainer(container, command) {
//     try {
//         const exec = await container.exec({
//             Cmd: ['/bin/bash', '-c', command],
//             AttachStdout: true,
//             AttachStderr: true,
//             Tty: false
//         });

//         return new Promise((resolve, reject) => {
//             exec.start((err, stream) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 let output = '';
//                 stream.on('data', (chunk) => {
//                     output += chunk.toString('utf8');
//                 });
//                 stream.on('end', () => {
//                     resolve(output);
//                 });
//                 stream.on('error', (err) => {
//                     reject(err);
//                 });
//             });
//         });
//     } catch (error) {
//         console.error('Error executing command in container:', error);
//         return `Error: ${error.message}`;
//     }
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         // If this is the first client, create the session and container.
//         if (!session) {
//             let container;
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 // *** CHANGE HERE: Use the new custom Docker image ***
//                 container = await docker.createContainer({
//                     Image: 'code-execution-env', // Use the image we built
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 session = {
//                     container,
//                     clients: new Set()
//                 };
//                 sessions.set(sessionId, session);

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         // Add the new client to the session.
//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         // Assign role to the connecting client
//         const isTeacher = session.clients.size === 1;
//         ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//         // If a student joins, notify the teacher to initiate the WebRTC call
//         if (!isTeacher) {
//             const teacherWs = Array.from(session.clients)[0];
//             if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//                 teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//             }
//         }

//         // Handle incoming messages from this specific client.
//         ws.on('message', async (message) => {
//             try {
//                 const data = JSON.parse(message.toString());

//                 if (data.type === 'TERMINAL_IN') {
//                     console.log('Received (but ignoring) terminal input:', data.payload);
//                 } else if (data.type === 'RUN_CODE') {
//                     const { language, code } = data.payload;
//                     let filename;
//                     let executeCommand;

//                     const filenameMap = {
//                         javascript: 'script.js',
//                         python: 'script.py',
//                         java: 'Main.java'
//                     };
//                     filename = filenameMap[language];

//                     // Properly escape the code to be written to a file
//                     const escapedCode = code.replace(/'/g, "'\\''");
//                     const writeFileCommand = `echo '${escapedCode}' > ${filename}`;

//                     switch (language) {
//                         case 'javascript':
//                             executeCommand = `node ${filename}`;
//                             break;
//                         case 'python':
//                             executeCommand = `python3 ${filename}`;
//                             break;
//                         case 'java':
//                             // For Java, we compile first, then run.
//                             executeCommand = `javac ${filename} && java Main`;
//                             break;
//                         default:
//                             executeCommand = '';
//                     }

//                     if (executeCommand) {
//                         const fullCommand = `${writeFileCommand} && ${executeCommand}`;
//                         console.log('Executing command:', fullCommand);
//                         const output = await executeCodeInContainer(session.container, fullCommand);
//                         console.log('Command output:', output);
//                         session.clients.forEach(client => {
//                             if (client.readyState === ws.OPEN) {
//                                 client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output }));
//                             }
//                         });
//                     } else {
//                         session.clients.forEach(client => {
//                             if (client.readyState === ws.OPEN) {
//                                 client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: `Execution for ${language} is not supported.\n` }));
//                             }
//                         });
//                     }
//                 } else {
//                     // Broadcast other collaboration messages
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === client.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             if (!session) return;
//             session.clients.delete(ws);

//             // If the last client leaves, stop and remove the container.
//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     // Ignore errors if container is already gone (e.g., 404 Not Found, 304 Not Modified)
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                 // Notify remaining clients that a peer has left.
//                 session.clients.forEach(client => {
//                     client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//                 });
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;


// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// async function executeCodeInContainer(container, command) {
//     try {
//         const exec = await container.exec({
//             Cmd: ['/bin/bash', '-c', command],
//             AttachStdout: true,
//             AttachStderr: true,
//             Tty: false
//         });

//         return new Promise((resolve, reject) => {
//             exec.start((err, stream) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 let output = '';
//                 stream.on('data', (chunk) => {
//                     output += chunk.toString('utf8');
//                 });
//                 stream.on('end', () => {
//                     resolve(output);
//                 });
//                 stream.on('error', (err) => {
//                     reject(err);
//                 });
//             });
//         });
//     } catch (error) {
//         console.error('Error executing command in container:', error);
//         return `Error: ${error.message}`;
//     }
// }

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         // If this is the first client for the session, create the session object and container.
//         if (!session) {
//             let container;
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 container = await docker.createContainer({
//                     Image: 'node:18-slim',
//                     // Tty: true, // Removed TTY
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 session = {
//                     container,
//                     clients: new Set()
//                 };
//                 sessions.set(sessionId, session);

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         // Add the new client to the session.
//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         // Assign role to the connecting client
//         const isTeacher = session.clients.size === 1;
//         ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//         // If a student joins, notify the teacher to initiate the WebRTC call
//         if (!isTeacher) {
//             const teacherWs = Array.from(session.clients)[0];
//             if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//                 teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//             }
//         }

//         // Handle incoming messages from this specific client.
//         ws.on('message', async (message) => {
//             try {
//                 const data = JSON.parse(message.toString());

//                 if (data.type === 'TERMINAL_IN') {
//                     // We are no longer directly piping terminal input
//                     console.log('Received (but ignoring) terminal input:', data.payload);
//                 } else if (data.type === 'RUN_CODE') {
//                     const { language, code } = data.payload;
//                     let filename;
//                     let executeCommand;

//                     const filenameMap = {
//                         javascript: 'script.js',
//                         python: 'script.py',
//                         java: 'Main.java'
//                     };
//                     filename = filenameMap[language];

//                     const escapedCode = code.replace(/'/g, "'\\''");
//                     const writeFileCommand = `echo '${escapedCode}' > ${filename}`;

//                     switch (language) {
//                         case 'javascript':
//                             executeCommand = `node ${filename}`;
//                             break;
//                         case 'python':
//                             executeCommand = `python3 ${filename}`;
//                             break;
//                         case 'java':
//                             executeCommand = `javac ${filename} && java Main`;
//                             break;
//                         default:
//                             executeCommand = '';
//                     }

//                     if (executeCommand) {
//                         const fullCommand = `${writeFileCommand} && ${executeCommand}`;
//                         console.log('Executing command:', fullCommand);
//                         const output = await executeCodeInContainer(session.container, fullCommand);
//                         console.log('Command output:', output);
//                         session.clients.forEach(client => {
//                             if (client.readyState === ws.OPEN) {
//                                 client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: output }));
//                             }
//                         });
//                     } else {
//                         session.clients.forEach(client => {
//                             if (client.readyState === ws.OPEN) {
//                                 client.send(JSON.stringify({ type: 'TERMINAL_OUT', payload: `Execution for ${language} is not supported.\n` }));
//                             }
//                         });
//                     }
//                 } else {
//                     // Collaboration messages are broadcast to other clients.
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === client.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             session.clients.delete(ws);

//             // If the last client leaves, stop and remove the container.
//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                 // Notify remaining clients
//                 session.clients.forEach(client => {
//                     client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//                 });
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//     wss.on('connection', async (ws, req) => {
//         const urlParams = new URLSearchParams(req.url.split('?')[1]);
//         const sessionId = urlParams.get('sessionId');

//         if (!sessionId) {
//             return ws.close(1008, "Session ID required");
//         }

//         let session = sessions.get(sessionId);

//         // If this is the first client for the session, create the session object and container.
//         if (!session) {
//             let container;
//             try {
//                 console.log(`Creating container for new session: ${sessionId}`);
//                 container = await docker.createContainer({
//                     Image: 'node:18-slim',
//                     Tty: true,
//                     Cmd: ['/bin/bash'],
//                     OpenStdin: true,
//                     StdinOnce: false,
//                     HostConfig: { AutoRemove: true }
//                 });
//                 await container.start();
//                 console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//                 const attachOptions = { stream: true, stdin: true, stdout: true, stderr: true };
//                 const stream = await container.attach(attachOptions);

//                 session = {
//                     container,
//                     stream,
//                     clients: new Set(),
//                     initialDataReceived: false // Flag to track if initial data has been processed
//                 };
//                 sessions.set(sessionId, session);

//                 // Attach the main data handler for the container's output stream ONCE.
//                 session.stream.on('data', (chunk) => {
//                     const dataStr = chunk.toString('utf8');
//                     console.log('Container output chunk:', dataStr);

//                     // Ignore the first chunk if it's the attach options object (as a string)
//                     if (!session.initialDataReceived) {
//                         try {
//                             const parsedData = JSON.parse(dataStr);
//                             if (JSON.stringify(parsedData) === JSON.stringify(attachOptions)) {
//                                 console.log('Ignoring initial attach options data.');
//                                 session.initialDataReceived = true;
//                                 return;
//                             }
//                         } catch (e) {
//                             // If it's not a JSON we can't compare, so we'll process it
//                         }
//                         session.initialDataReceived = true;
//                     }

//                     // Broadcast terminal output to ALL clients in the session.
//                     session.clients.forEach(client => {
//                         if (client.readyState === ws.OPEN) {
//                             client.send(JSON.stringify({
//                                 type: 'TERMINAL_OUT',
//                                 payload: dataStr
//                             }));
//                         }
//                     });
//                 });

//             } catch (err) {
//                 console.error("Failed to create or start container:", err);
//                 return ws.close(1011, "Failed to initialize terminal environment.");
//             }
//         }

//         // Add the new client to the session.
//         session.clients.add(ws);
//         console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//         // Assign role to the connecting client
//         const isTeacher = session.clients.size === 1;
//         ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//         // If a student joins, notify the teacher to initiate the WebRTC call
//         if (!isTeacher) {
//             const teacherWs = Array.from(session.clients)[0];
//             if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//                 teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//             }
//         }

//         // Handle incoming messages from this specific client.
//         ws.on('message', (message) => {
//             try {
//                 const data = JSON.parse(message.toString());

//                 if (data.type === 'TERMINAL_IN') {
//                     console.log('Received terminal input:', data.payload);
//                     session.stream.write(data.payload, (err) => {
//                         if (err) {
//                             console.error('Error writing to container stream:', err);
//                         }
//                     });
//                 } else {
//                     // Collaboration messages are broadcast to other clients.
//                     session.clients.forEach(client => {
//                         if (client !== ws && client.readyState === client.OPEN) {
//                             client.send(JSON.stringify(data));
//                         }
//                     });
//                 }
//             } catch (e) {
//                 console.error("Error handling message:", e);
//             }
//         });

//         ws.on('close', async () => {
//             console.log(`Client disconnected from session: ${sessionId}`);
//             session.clients.delete(ws);

//             // If the last client leaves, stop and remove the container.
//             if (session.clients.size === 0) {
//                 console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//                 try {
//                     await session.container.stop();
//                     console.log(`Container for session ${sessionId} stopped.`);
//                 } catch (err) {
//                     if (err.statusCode !== 404 && err.statusCode !== 304) {
//                         console.error("Error stopping container:", err);
//                     }
//                 }
//                 sessions.delete(sessionId);
//             } else {
//                 // Notify remaining clients
//                 session.clients.forEach(client => {
//                     client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//                 });
//             }
//         });
//     });
// }

// module.exports = initializeWebSocket;

// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', async (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       return ws.close(1008, "Session ID required");
//     }

//     let session = sessions.get(sessionId);

//     // If this is the first client for the session, create the session object and container.
//     if (!session) {
//       let container;
//       try {
//         console.log(`Creating container for new session: ${sessionId}`);
//         container = await docker.createContainer({
//             Image: 'node:18-slim',
//             Tty: true,
//             Cmd: ['/bin/bash'],
//             OpenStdin: true,
//             StdinOnce: false,
//             HostConfig: { AutoRemove: true }
//         });
//         await container.start();
//         console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);

//         const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });

//         session = {
//             container,
//             stream,
//             clients: new Set()
//         };
//         sessions.set(sessionId, session);

//         // Attach the main data handler for the container's output stream ONCE.
//         session.stream.on('data', (chunk) => {
//             console.log('Container output chunk:', chunk.toString('utf8')); // Added logging
//             // Broadcast terminal output to ALL clients in the session.
//             session.clients.forEach(client => {
//                 if (client.readyState === ws.OPEN) {
//                     client.send(JSON.stringify({
//                         type: 'TERMINAL_OUT',
//                         payload: chunk.toString('utf8')
//                     }));
//                 }
//             });
//         });

//       } catch (err) {
//         console.error("Failed to create or start container:", err);
//         return ws.close(1011, "Failed to initialize terminal environment.");
//       }
//     }

//     // Add the new client to the session.
//     session.clients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//     // Assign role to the connecting client
//     const isTeacher = session.clients.size === 1;
//     ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//     // If a student joins, notify the teacher to initiate the WebRTC call
//     if (!isTeacher) {
//         const teacherWs = Array.from(session.clients)[0];
//         if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//             teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//         }
//     }

//     // Handle incoming messages from this specific client.
//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message.toString());

//             if (data.type === 'TERMINAL_IN') {
//                 console.log('Received terminal input:', data.payload); // Added logging
//                 session.stream.write(data.payload, (err) => { // Added callback for error handling
//                     if (err) {
//                         console.error('Error writing to container stream:', err);
//                     }
//                 });
//             } else {
//                 // Collaboration messages are broadcast to other clients.
//                 session.clients.forEach(client => {
//                     if (client !== ws && client.readyState === client.OPEN) {
//                         client.send(JSON.stringify(data));
//                     }
//                 });
//             }
//         } catch (e) {
//             console.error("Error handling message:", e);
//         }
//     });

//     ws.on('close', async () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
//       session.clients.delete(ws);

//       // If the last client leaves, stop and remove the container.
//       if (session.clients.size === 0) {
//         console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//         try {
//             await session.container.stop();
//             console.log(`Container for session ${sessionId} stopped.`);
//         } catch (err) {
//             if (err.statusCode !== 404 && err.statusCode !== 304) {
//                 console.error("Error stopping container:", err);
//             }
//         }
//         sessions.delete(sessionId);
//       } else {
//         // Notify remaining clients
//         session.clients.forEach(client => {
//             client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//         });
//       }
//     });
//   });
// }

// module.exports = initializeWebSocket;
// /*
//  * =================================================================
//  * FOLDER: educators-edge-backend/services/
//  * FILE:   websocketHandler.js (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This is a complete rewrite to be more robust. It now
//  * correctly manages one container per session and properly handles the
//  * Docker I/O stream to prevent garbled output.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', async (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       return ws.close(1008, "Session ID required");
//     }

//     let session = sessions.get(sessionId);

//     // If this is the first client for the session, create the session object and container.
//     if (!session) {
//       let container;
//       try {
//         console.log(`Creating container for new session: ${sessionId}`);
//         container = await docker.createContainer({
//             Image: 'node:18-slim',
//             Tty: true,
//             Cmd: ['/bin/bash'],
//             OpenStdin: true,
//             StdinOnce: false,
//             HostConfig: { AutoRemove: true }
//         });
//         await container.start();
//         console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);
        
//         const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
        
//         session = {
//             container,
//             stream,
//             clients: new Set()
//         };
//         sessions.set(sessionId, session);

//         // Attach the main data handler for the container's output stream ONCE.
//         session.stream.on('data', (chunk) => {
//             // Broadcast terminal output to ALL clients in the session.
//             session.clients.forEach(client => {
//                 if (client.readyState === ws.OPEN) {
//                     client.send(JSON.stringify({
//                         type: 'TERMINAL_OUT',
//                         payload: chunk.toString('utf8')
//                     }));
//                 }
//             });
//         });

//       } catch (err) {
//         console.error("Failed to create or start container:", err);
//         return ws.close(1011, "Failed to initialize terminal environment.");
//       }
//     }

//     // Add the new client to the session.
//     session.clients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//     // Assign role to the connecting client
//     const isTeacher = session.clients.size === 1;
//     ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//     // If a student joins, notify the teacher to initiate the WebRTC call
//     if (!isTeacher) {
//         const teacherWs = Array.from(session.clients)[0];
//         if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//             teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//         }
//     }

//     // Handle incoming messages from this specific client.
//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message.toString());

//             if (data.type === 'TERMINAL_IN') {
//                 // Terminal input goes directly to the container's stream.
//                 session.stream.write(data.payload);
//             } else {
//                 // Collaboration messages are broadcast to other clients.
//                 session.clients.forEach(client => {
//                     if (client !== ws && client.readyState === client.OPEN) {
//                         client.send(JSON.stringify(data));
//                     }
//                 });
//             }
//         } catch (e) {
//             console.error("Error handling message:", e);
//         }
//     });

//     ws.on('close', async () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
//       session.clients.delete(ws);
      
//       // If the last client leaves, stop and remove the container.
//       if (session.clients.size === 0) {
//         console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//         try {
//             await session.container.stop();
//             console.log(`Container for session ${sessionId} stopped.`);
//         } catch (err) {
//             if (err.statusCode !== 404 && err.statusCode !== 304) {
//                  console.error("Error stopping container:", err);
//             }
//         }
//         sessions.delete(sessionId);
//       } else {
//         // Notify remaining clients
//         session.clients.forEach(client => {
//             client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//         });
//       }
//     });
//   });
// }

// module.exports = initializeWebSocket;
// /*
//  * =================================================================
//  * FOLDER: educators-edge-backend/services/
//  * FILE:   websocketHandler.js (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This is a complete rewrite to be more robust. It now
//  * correctly manages one container per session and properly handles the
//  * Docker I/O stream to prevent garbled output.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', async (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       return ws.close(1008, "Session ID required");
//     }

//     let session = sessions.get(sessionId);

//     // If this is the first client for the session, create the session object and container.
//     if (!session) {
//       let container;
//       try {
//         console.log(`Creating container for new session: ${sessionId}`);
//         container = await docker.createContainer({
//             Image: 'node:18-slim',
//             Tty: true,
//             Cmd: ['/bin/bash'],
//             OpenStdin: true,
//             StdinOnce: false,
//             HostConfig: { AutoRemove: true }
//         });
//         await container.start();
//         console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);
        
//         const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
        
//         session = {
//             container,
//             stream,
//             clients: new Set()
//         };
//         sessions.set(sessionId, session);

//         // Attach the main data handler for the container's output stream ONCE.
//         session.stream.on('data', (chunk) => {
//             // Broadcast terminal output to ALL clients in the session.
//             session.clients.forEach(client => {
//                 if (client.readyState === ws.OPEN) {
//                     client.send(JSON.stringify({
//                         type: 'TERMINAL_OUT',
//                         payload: chunk.toString('utf8')
//                     }));
//                 }
//             });
//         });

//       } catch (err) {
//         console.error("Failed to create or start container:", err);
//         return ws.close(1011, "Failed to initialize terminal environment.");
//       }
//     }

//     // Add the new client to the session.
//     session.clients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//     // Assign role to the connecting client
//     const isTeacher = session.clients.size === 1;
//     ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//     // If a student joins, notify the teacher to initiate the WebRTC call
//     if (!isTeacher) {
//         const teacherWs = Array.from(session.clients)[0];
//         if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//             teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//         }
//     }

//     // Handle incoming messages from this specific client.
//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message.toString());

//             if (data.type === 'TERMINAL_IN') {
//                 // Terminal input goes directly to the container's stream.
//                 session.stream.write(data.payload);
//             } else {
//                 // Collaboration messages are broadcast to other clients.
//                 session.clients.forEach(client => {
//                     if (client !== ws && client.readyState === client.OPEN) {
//                         client.send(JSON.stringify(data));
//                     }
//                 });
//             }
//         } catch (e) {
//             console.error("Error handling message:", e);
//         }
//     });

//     ws.on('close', async () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
//       session.clients.delete(ws);
      
//       // If the last client leaves, stop and remove the container.
//       if (session.clients.size === 0) {
//         console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//         try {
//             await session.container.stop();
//             console.log(`Container for session ${sessionId} stopped.`);
//         } catch (err) {
//             if (err.statusCode !== 404 && err.statusCode !== 304) {
//                  console.error("Error stopping container:", err);
//             }
//         }
//         sessions.delete(sessionId);
//       } else {
//         // Notify remaining clients
//         session.clients.forEach(client => {
//             client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//         });
//       }
//     });
//   });
// }

// module.exports = initializeWebSocket;
// /*
//  * =================================================================
//  * FOLDER: educators-edge-backend/services/
//  * FILE:   websocketHandler.js (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This is a complete rewrite to be more robust. It now
//  * correctly manages one container per session and properly handles the
//  * Docker I/O stream to prevent garbled output.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', async (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       return ws.close(1008, "Session ID required");
//     }

//     let session = sessions.get(sessionId);

//     // If this is the first client for the session, create the session object and container.
//     if (!session) {
//       let container;
//       try {
//         console.log(`Creating container for new session: ${sessionId}`);
//         container = await docker.createContainer({
//             Image: 'node:18-slim',
//             Tty: true,
//             Cmd: ['/bin/bash'],
//             OpenStdin: true,
//             StdinOnce: false,
//             HostConfig: { AutoRemove: true }
//         });
//         await container.start();
//         console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);
        
//         const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
        
//         session = {
//             container,
//             stream,
//             clients: new Set()
//         };
//         sessions.set(sessionId, session);

//         // Attach the main data handler for the container's output stream ONCE.
//         session.stream.on('data', (chunk) => {
//             // Broadcast terminal output to ALL clients in the session.
//             session.clients.forEach(client => {
//                 if (client.readyState === client.OPEN) {
//                     client.send(JSON.stringify({
//                         type: 'TERMINAL_OUT',
//                         payload: chunk.toString('utf8')
//                     }));
//                 }
//             });
//         });

//       } catch (err) {
//         console.error("Failed to create or start container:", err);
//         return ws.close(1011, "Failed to initialize terminal environment.");
//       }
//     }

//     // Add the new client to the session.
//     session.clients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${session.clients.size}`);

//     // Assign role to the connecting client
//     const isTeacher = session.clients.size === 1;
//     ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//     // If a student joins, notify the teacher to initiate the WebRTC call
//     if (!isTeacher) {
//         const teacherWs = Array.from(session.clients)[0];
//         if (teacherWs && teacherWs.readyState === teacherWs.OPEN) {
//             teacherWs.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//         }
//     }

//     // Handle incoming messages from this specific client.
//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message.toString());

//             if (data.type === 'TERMINAL_IN') {
//                 // Terminal input goes directly to the container's stream.
//                 session.stream.write(data.payload);
//             } else {
//                 // Collaboration messages are broadcast to other clients.
//                 session.clients.forEach(client => {
//                     if (client !== ws && client.readyState === client.OPEN) {
//                         client.send(JSON.stringify(data));
//                     }
//                 });
//             }
//         } catch (e) {
//             console.error("Error handling message:", e);
//         }
//     });

//     ws.on('close', async () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
//       session.clients.delete(ws);
      
//       // If the last client leaves, stop and remove the container.
//       if (session.clients.size === 0) {
//         console.log(`Last client disconnected. Stopping container for session ${sessionId}`);
//         try {
//             await session.container.stop();
//             console.log(`Container for session ${sessionId} stopped.`);
//         } catch (err) {
//             if (err.statusCode !== 404 && err.statusCode !== 304) {
//                  console.error("Error stopping container:", err);
//             }
//         }
//         sessions.delete(sessionId);
//       } else {
//         // Notify remaining clients
//         session.clients.forEach(client => {
//             client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//         });
//       }
//     });
//   });
// }

// module.exports = initializeWebSocket;
// /*
//  * =================================================================
//  * FOLDER: educators-edge-backend/services/
//  * FILE:   websocketHandler.js (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This handler now manages both collaboration messages
//  * (like code updates) and terminal data over the same WebSocket connection.
//  */
// const Docker = require('dockerode');
// const docker = new Docker();

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', async (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       ws.close(1008, "Session ID required");
//       return;
//     }

//     let container;
    
//     try {
//         console.log(`Creating container for session: ${sessionId}`);
//         container = await docker.createContainer({
//             Image: 'node:18-slim',
//             Tty: true,
//             Cmd: ['/bin/bash'],
//             OpenStdin: true,
//             StdinOnce: false,
//             HostConfig: { AutoRemove: true } 
//         });
//         await container.start();
//         console.log(`Container ${container.id.substring(0,12)} started for session ${sessionId}`);
//     } catch (err) {
//         console.error("Failed to create or start container:", err);
//         ws.close(1011, "Failed to initialize terminal environment.");
//         return;
//     }

//     // Attach to the container's streams for terminal I/O
//     const stream = await container.attach({
//         stream: true,
//         stdin: true,
//         stdout: true,
//         stderr: true
//     });

//     // When we receive data from the container's stdout/stderr, wrap it
//     // in a JSON object and send it to the user's browser.
//     stream.on('data', (chunk) => {
//         ws.send(JSON.stringify({
//             type: 'TERMINAL_OUT',
//             payload: chunk.toString('utf8')
//         }));
//     });

//     // Store the container and WebSocket connection for this session
//     if (!sessions.has(sessionId)) {
//       sessions.set(sessionId, new Set());
//     }
//     const sessionClients = sessions.get(sessionId);
//     sessionClients.add(ws);

//     // Handle incoming messages from the client
//     ws.on('message', (message) => {
//         const data = JSON.parse(message.toString());

//         // Multiplexing: Check the message type
//         if (data.type === 'TERMINAL_IN') {
//             // If it's a terminal command, write it to the container's stdin.
//             stream.write(data.payload);
//         } else {
//             // Otherwise, broadcast it as a collaboration message (e.g., code update).
//             sessionClients.forEach(client => {
//                 if (client !== ws && client.readyState === client.OPEN) {
//                     client.send(JSON.stringify(data));
//                 }
//             });
//         }
//     });

//     ws.on('close', async () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
//       sessionClients.delete(ws);
//       if (sessionClients.size === 0) {
//         // If the last client leaves, stop and remove the container.
//         try {
//             console.log(`Stopping container ${container.id.substring(0,12)}`);
//             await container.stop();
//             console.log(`Container for session ${sessionId} stopped.`);
//         } catch (err) {
//             if (err.statusCode !== 404 && err.statusCode !== 304) {
//                  console.error("Error stopping container:", err);
//             }
//         }
//         sessions.delete(sessionId);
//       }
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;


// /*
//   This handler now manages Teacher/Student roles.
//   The first client to join a session is designated the 'teacher'.
//   Only the teacher can broadcast code and language updates.
// */

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       ws.close(1008, "Session ID required");
//       return;
//     }

//     // --- Role-Based Session Management ---
//     let isTeacher = false;
//     if (!sessions.has(sessionId)) {
//       // First person to join is the teacher.
//       isTeacher = true;
//       sessions.set(sessionId, { clients: new Set(), teacher: ws });
//       console.log(`Client connected as TEACHER in session: ${sessionId}`);
//     }
    
//     const session = sessions.get(sessionId);
//     const sessionClients = session.clients;

//     // Reject connections if the session is full (teacher + 1 student for now).
//     // Note: We can increase this limit later for multiple students.
//     if (!isTeacher && sessionClients.size >= 2) {
//       console.log(`Connection rejected: Session ${sessionId} is full.`);
//       ws.close(1008, "Session is full");
//       return;
//     }
    
//     sessionClients.add(ws);
    
//     // Assign role to the connecting client.
//     ws.send(JSON.stringify({ type: 'ROLE_ASSIGNED', payload: { role: isTeacher ? 'teacher' : 'student' } }));

//     // If a student joins, tell the teacher to initiate the WebRTC call.
//     if (!isTeacher && session.teacher.readyState === session.teacher.OPEN) {
//       session.teacher.send(JSON.stringify({ type: 'INITIATE_CALL', payload: { peerId: 'student' } }));
//       console.log(`Sent INITIATE_CALL to the teacher for a new student.`);
//     }

//     ws.on('message', (message) => {
//       try {
//         const data = JSON.parse(message.toString());
        
//         // --- Permission Check ---
//         // Only the teacher can send code or language updates.
//         if ((data.type === 'CODE_UPDATE' || data.type === 'LANGUAGE_UPDATE') && session.teacher !== ws) {
//             console.log(`Student attempt to update code in session ${sessionId} was blocked.`);
//             return; // Block the message
//         }

//         // Broadcast the message to all other clients in the session.
//         sessionClients.forEach(client => {
//           if (client !== ws && client.readyState === client.OPEN) {
//             client.send(JSON.stringify(data));
//           }
//         });
//       } catch (error) {
//         console.error('Failed to parse or broadcast message:', error);
//       }
//     });

//     ws.on('close', () => {
//       sessionClients.delete(ws);
//       // If the teacher leaves, we could end the session for everyone.
//       // For now, we just notify the remaining peer.
//       sessionClients.forEach(client => {
//         if (client.readyState === client.OPEN) {
//           client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//         }
//       });

//       if (sessionClients.size === 0) {
//         sessions.delete(sessionId);
//         console.log(`Session ${sessionId} closed.`);
//       }
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;
// // -----------------------------------------------------------------
// // FILE: services/websocketHandler.js (UPDATED)
// // -----------------------------------------------------------------
// /*
//   This handler is now an "authoritative" signaling server.
//   It controls who initiates the call to prevent race conditions.
// */

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       ws.close(1008, "Session ID required");
//       return;
//     }

//     // --- Authoritative Session Management ---
//     if (!sessions.has(sessionId)) {
//       sessions.set(sessionId, new Set());
//     }

//     const sessionClients = sessions.get(sessionId);

//     // Enforce a two-person limit per session.
//     if (sessionClients.size >= 2) {
//       console.log(`Connection rejected: Session ${sessionId} is full.`);
//       ws.close(1008, "Session is full");
//       return;
//     }
    
//     sessionClients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${sessionClients.size}`);

//     // If the session now has two clients, tell the FIRST client to initiate the call.
//     if (sessionClients.size === 2) {
//       const firstClient = Array.from(sessionClients)[0];
//       if (firstClient.readyState === firstClient.OPEN) {
//         firstClient.send(JSON.stringify({ type: 'INITIATE_CALL' }));
//         console.log(`Sent INITIATE_CALL to the first client in session ${sessionId}`);
//       }
//     }

//     ws.on('message', (message) => {
//       try {
//         const data = JSON.parse(message.toString());
//         // Simple broadcast logic: send the message to the other client.
//         sessionClients.forEach(client => {
//           if (client !== ws && client.readyState === client.OPEN) {
//             client.send(JSON.stringify(data));
//           }
//         });
//       } catch (error) {
//         console.error('Failed to parse or broadcast message:', error);
//       }
//     });

//     ws.on('close', () => {
//       if (sessionClients) {
//         sessionClients.delete(ws);
//         // Notify the remaining peer that the other has left.
//         sessionClients.forEach(client => {
//           if (client.readyState === client.OPEN) {
//             client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//           }
//         });
//         if (sessionClients.size === 0) {
//           sessions.delete(sessionId);
//           console.log(`Session ${sessionId} closed.`);
//         }
//       }
//       console.log(`Client disconnected from session: ${sessionId}`);
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;

// // -----------------------------------------------------------------
// // FILE: services/websocketHandler.js (UPDATED)
// // -----------------------------------------------------------------
// /*
//   This handler is now a "signaling server". It doesn't understand WebRTC
//   messages, but it knows how to pass them to the correct client to
//   establish a peer-to-peer connection.
// */

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       ws.close();
//       return;
//     }

//     // --- Session and Peer Management ---
//     if (!sessions.has(sessionId)) {
//       sessions.set(sessionId, new Set());
//     }
//     const sessionClients = sessions.get(sessionId);
//     sessionClients.add(ws);
//     console.log(`Client connected to session: ${sessionId}. Total clients: ${sessionClients.size}`);

//     // If another client is already in the session, notify them that a peer has joined.
//     // This will trigger the first client to start the WebRTC "offer".
//     if (sessionClients.size > 1) {
//         sessionClients.forEach(client => {
//             if (client !== ws && client.readyState === client.OPEN) {
//                 client.send(JSON.stringify({ type: 'PEER_JOINED' }));
//             }
//         });
//     }

//     ws.on('message', (message) => {
//       try {
//         const data = JSON.parse(message.toString());
//         console.log(`Received message in session ${sessionId}: type=${data.type}`);

//         // Simply broadcast any message to the other clients in the session.
//         // This is how signaling messages (offers, answers, candidates) are exchanged.
//         sessionClients.forEach(client => {
//           if (client !== ws && client.readyState === client.OPEN) {
//             client.send(JSON.stringify(data));
//           }
//         });
//       } catch (error) {
//         console.error('Failed to parse message or broadcast:', error);
//       }
//     });

//     ws.on('close', () => {
//       sessionClients.delete(ws);
//       if (sessionClients.size === 0) {
//         sessions.delete(sessionId);
//         console.log(`Session ${sessionId} closed.`);
//       } else {
//         // Notify the remaining client that their peer has left.
//          sessionClients.forEach(client => {
//             if (client.readyState === client.OPEN) {
//                 client.send(JSON.stringify({ type: 'PEER_LEFT' }));
//             }
//         });
//       }
//       console.log(`Client disconnected from session: ${sessionId}`);
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;

// // -----------------------------------------------------------------
// // FILE: services/websocketHandler.js (UPDATED)
// // -----------------------------------------------------------------
// /*
//   This file is updated to handle structured JSON messages.
//   This allows us to send different types of real-time events,
//   not just code updates.
// */

// const sessions = new Map();

// function initializeWebSocket(wss) {
//   wss.on('connection', (ws, req) => {
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       ws.close();
//       return;
//     }

//     if (!sessions.has(sessionId)) {
//       sessions.set(sessionId, new Set());
//     }
//     sessions.get(sessionId).add(ws);
//     console.log(`Client connected to session: ${sessionId}`);

//     // The 'message' event handler is now more robust.
//     ws.on('message', (message) => {
//       try {
//         // We parse the incoming message as JSON.
//         const data = JSON.parse(message.toString());
//         console.log(`Received structured message in session ${sessionId}:`, data);

//         // Broadcast the parsed JSON data to other clients in the session.
//         const sessionClients = sessions.get(sessionId);
//         if (sessionClients) {
//           sessionClients.forEach(client => {
//             if (client !== ws && client.readyState === client.OPEN) {
//               // We stringify the data again before sending.
//               client.send(JSON.stringify(data));
//             }
//           });
//         }
//       } catch (error) {
//         console.error('Failed to parse message or broadcast:', error);
//       }
//     });

//     ws.on('close', () => {
//       const sessionClients = sessions.get(sessionId);
//       if (sessionClients) {
//         sessionClients.delete(ws);
//         if (sessionClients.size === 0) {
//           sessions.delete(sessionId);
//           console.log(`Session ${sessionId} closed.`);
//         }
//       }
//       console.log(`Client disconnected from session: ${sessionId}`);
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;
// // -----------------------------------------------------------------
// // FILE: services/websocketHandler.js (NEW FILE)
// // -----------------------------------------------------------------
// /*
//   This file contains the core logic for our real-time collaboration.

//   CONCEPT: Session Management
//   We can't just broadcast every message to every user. We need to create "rooms"
//   or "sessions" so that a teacher and student can communicate privately.

//   - We use a Map where the key is a `sessionId` and the value is a `Set` of
//     all clients connected to that session.
//   - A Set is used because it automatically handles duplicates and provides
//     efficient adding/deleting of clients.
// */

// // This map will store all active sessions.
// // Example: Map { 'session-123' => Set { wsClient1, wsClient2 } }
// const sessions = new Map();

// function initializeWebSocket(wss) {
//   // This event fires every time a new client (frontend) connects.
//   wss.on('connection', (ws, req) => {
//     // Extract the session ID from the connection URL (e.g., ws://localhost:5000?sessionId=abc)
//     const urlParams = new URLSearchParams(req.url.split('?')[1]);
//     const sessionId = urlParams.get('sessionId');

//     if (!sessionId) {
//       console.log('Connection rejected: No session ID provided.');
//       ws.close();
//       return;
//     }

//     console.log(`Client connected to session: ${sessionId}`);

//     // --- Add client to the session ---
//     // If the session doesn't exist yet, create it.
//     if (!sessions.has(sessionId)) {
//       sessions.set(sessionId, new Set());
//     }
//     // Add the new client's WebSocket connection to the session's Set.
//     sessions.get(sessionId).add(ws);


//     // This event fires when the server receives a message from this client.
//     ws.on('message', (message) => {
//       console.log(`Received message in session ${sessionId}: ${message}`);
      
//       // --- Broadcast the message to others in the same session ---
//       const sessionClients = sessions.get(sessionId);
//       if (sessionClients) {
//         sessionClients.forEach(client => {
//           // We only send the message to other clients, not back to the sender.
//           // And we ensure the client's connection is still open.
//           if (client !== ws && client.readyState === client.OPEN) {
//             client.send(message.toString());
//           }
//         });
//       }
//     });

//     // This event fires when a client disconnects.
//     ws.on('close', () => {
//       console.log(`Client disconnected from session: ${sessionId}`);
      
//       // --- Remove client from the session ---
//       const sessionClients = sessions.get(sessionId);
//       if (sessionClients) {
//         sessionClients.delete(ws);
//         // If the session is now empty, we can clean it up.
//         if (sessionClients.size === 0) {
//           sessions.delete(sessionId);
//           console.log(`Session ${sessionId} closed.`);
//         }
//       }
//     });

//     ws.on('error', (error) => {
//         console.error(`WebSocket error in session ${sessionId}:`, error);
//     });
//   });
// }

// module.exports = initializeWebSocket;
