import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

// Import existing components
import { SessionModeSelector, SessionMode } from '../components/classroom/SessionModeSelector';
import ModernEssayEditor from '../components/classroom/ModernEssayEditor';
import { EssayHomeworkView } from '../components/classroom/EssayHomeworkView';
import { EssayMonitoringPanel } from '../components/classroom/EssayMonitoringPanel';
import { EssayVideoPanel } from '../components/classroom/EssayVideoPanel';
import { ChatPanel } from '../components/classroom/ChatPanel';

// Import LiveTutorialPage components for code mode
import Editor from '@monaco-editor/react';
import DockerTerminal from '../components/DockerTerminal';
import { HomeworkView } from '../components/classroom/HomeworkView';
import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PhoneOff,
  ChevronRight,
  FilePlus,
  Play,
  File as FileIcon,
  Hand,
  Star,
  Lock,
  Brush,
  Trash2,
  MessageCircle,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  Circle,
  Square,
  Monitor,
  MonitorOff,
  Code2,
  FileText,
  Settings,
  Pen,
  Globe,
  X
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast, Toaster } from 'sonner';

// Import types and configs
import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';
import apiClient from '../services/apiClient';
import { getWebSocketUrl } from '../config/websocket';

// Import collaborative features for essay mode
import CollaborativeWhiteboard, { DrawingAction } from '../components/classroom/CollaborativeWhiteboard';
import WorkspaceManager, { Workspace, Participant } from '../components/classroom/WorkspaceManager';
import liveSessionService, { LiveSession } from '../services/liveSessionService';

// Type Definitions
interface Message { from: string; text: string; timestamp: string; }
interface CollaborationUser {
    id: string;
    name: string;
    color: string;
    isOnline: boolean;
    isTeacher?: boolean;
}

interface EssayHomeworkAssignment {
    id: string;
    title: string;
    description: string;
    instructions: string;
    dueDate?: string;
    referenceDocument?: {
        name: string;
        url: string;
        instructions?: string;
    };
    maxWords?: number;
    submissionStatus: 'not_started' | 'in_progress' | 'submitted' | 'graded';
    grade?: number;
    teacherFeedback?: string;
}

const simpleJwtDecode = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) { console.error("Invalid token:", error); return null; }
};

const DualModeLiveSession: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    console.log('[DualModeLiveSession] Component mounted with sessionId:', sessionId);

    // Check if this is an essay session from the URL
    const isEssaySession = window.location.pathname.includes('/essay');

    // Core session state - default to 'code' mode if not essay
    const [sessionMode, setSessionMode] = useState<SessionMode | null>(isEssaySession ? 'essay' : null);
    const [showModeSelector, setShowModeSelector] = useState(!isEssaySession);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [role, setRole] = useState<UserRole>('student');
    const [isInitialized, setIsInitialized] = useState(false);

    console.log('[DualModeLiveSession] Current state:', { sessionMode, isConnected, currentUserId, role });

    // Students and collaboration
    const [students, setStudents] = useState<Student[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());

    // Essay mode specific state
    const [essayContent, setEssayContent] = useState<string>('');
    const [collaborators, setCollaborators] = useState<CollaborationUser[]>([]);
    const [essayHomework, setEssayHomework] = useState<EssayHomeworkAssignment | null>(null);

    // Whiteboard and workspace state for essay mode
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
    const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
    const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('main');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);
    const [isDoingEssayHomework, setIsDoingEssayHomework] = useState(false);
    const [uploadedDocument, setUploadedDocument] = useState<{
        name: string;
        url: string;
        content?: string;
        instructions?: string;
    } | null>(null);

    // Code mode specific state (from LiveTutorialPage)
    const [files, setFiles] = useState<CodeFile[]>([
        { id: '1', name: 'main.py', content: 'print("Hello World")', language: 'python' }
    ]);
    const [activeFileId, setActiveFileId] = useState<string>('1');
    const [terminalOutput, setTerminalOutput] = useState<string>('');
    const [isDoingHomework, setIsDoingHomework] = useState(false);
    const [pendingHomework, setPendingHomework] = useState<any>(null);
    const [homeworkFiles, setHomeworkFiles] = useState<CodeFile[]>([]);

    // UI state
    const [showVideoPanel, setShowVideoPanel] = useState(false);
    const [showMonitoringPanel, setShowMonitoringPanel] = useState(false);
    const [showChatPanel, setShowChatPanel] = useState(true);
    const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);

    // WebSocket
    const wsRef = useRef<WebSocket | null>(null);
    const hasShownToastRef = useRef(false);

    // Initialize session - ONLY RUN ONCE on mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const decodedToken = token ? simpleJwtDecode(token) : null;

        console.log('[DualModeLiveSession] Initializing with decodedToken:', decodedToken);

        if (!decodedToken) {
            console.log('[DualModeLiveSession] No token, redirecting to login');
            navigate('/login');
            return;
        }

        const userId = decodedToken.userId?.toString() || decodedToken.user?.id?.toString() || '';
        const userName = decodedToken.username || decodedToken.user?.username || '';
        const userRole = decodedToken.role || decodedToken.user?.role || 'student';

        console.log('[DualModeLiveSession] Setting user state:', { userId, userName, userRole });

        setCurrentUserId(userId);
        setUsername(userName);
        setRole(userRole);
    }, [navigate]); // Only run once on mount

    // Fetch session details and determine mode
    useEffect(() => {
        const fetchSessionData = async () => {
            if (!sessionId) {
                console.log('[DualModeLiveSession] No sessionId provided');
                return;
            }

            try {
                console.log('[DualModeLiveSession] Fetching session data for ID:', sessionId);
                console.log('[DualModeLiveSession] Current user:', currentUserId, 'Role:', role);
                const response = await apiClient.get(`/api/sessions`);

                console.log('[DualModeLiveSession] API response:', response.data);

                if (response.data.success) {
                    // Find the specific session by ID
                    const session = response.data.sessions.find((s: any) => s.id.toString() === sessionId);

                    console.log('[DualModeLiveSession] Looking for session ID:', sessionId);
                    console.log('[DualModeLiveSession] Available sessions:', response.data.sessions.map((s: any) => ({ id: s.id, type: s.session_type })));

                    if (session) {
                        console.log('[DualModeLiveSession] ✅ Session found:', session);
                        console.log('[DualModeLiveSession] Session status:', session.status, 'mode:', session.session_mode);

                        // If session is active and has a mode already, redirect immediately
                        if (session.status === 'active' && session.session_mode) {
                            console.log('[DualModeLiveSession] Session is already active with mode:', session.session_mode);

                            if (session.session_mode === 'code') {
                                console.log('[DualModeLiveSession] Auto-redirecting to code editor');
                                navigate(`/session/${sessionId}`);
                                return;
                            } else if (session.session_mode === 'essay') {
                                console.log('[DualModeLiveSession] Auto-redirecting to essay editor');
                                navigate(`/urgent-session/${sessionId}/essay`);
                                return;
                            }
                        }

                        // If student joins inactive session, they should wait for teacher to select mode
                        // Only show toast once to prevent spam
                        if (!hasShownToastRef.current) {
                            if (role === 'student') {
                                toast.info('Waiting for teacher to start the session...');
                            } else if (role === 'teacher') {
                                toast.info('Please select a session mode to begin');
                                setShowModeSelector(true);
                            }
                            hasShownToastRef.current = true;
                        }
                    } else {
                        console.error('[DualModeLiveSession] ❌ Session not found with ID:', sessionId);
                        toast.error('Session not found. Redirecting...');
                        setTimeout(() => navigate('/sessions'), 2000);
                    }
                } else {
                    console.error('[DualModeLiveSession] ❌ API request failed');
                    toast.error('Failed to load session data');
                }
            } catch (error: any) {
                console.error('[DualModeLiveSession] ❌ Error fetching session:', error);
                console.error('[DualModeLiveSession] Error details:', error.response?.data);
                toast.error('Failed to load session data');
            }
        };

        // Only fetch if we have a userId (means user is authenticated)
        if (currentUserId) {
            fetchSessionData();
        } else {
            console.log('[DualModeLiveSession] Waiting for currentUserId to be set...');
        }
    }, [sessionId, currentUserId, navigate]);

    // WebSocket connection
    useEffect(() => {
        if (!sessionId || !currentUserId) return;

        const connectWebSocket = () => {
            try {
                const token = localStorage.getItem('authToken');
                const wsUrl = `${getWebSocketUrl()}/ws?sessionId=${sessionId}&token=${token}`;
                console.log(`[WEBSOCKET] Connecting to: ${wsUrl}`);
                wsRef.current = new WebSocket(wsUrl);

                wsRef.current.onopen = () => {
                    console.log(`[WEBSOCKET] Connected to session ${sessionId} as ${username} (${role})`);
                    setIsConnected(true);

                    // Join session - send directly as type with additional data (matching backend expectation)
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        const joinMessage = {
                            type: 'JOIN_SESSION',
                            sessionId,
                            userId: currentUserId,
                            username,
                            role,
                            sessionMode: sessionMode || 'code'
                        };
                        console.log(`[WEBSOCKET] Sending JOIN_SESSION:`, joinMessage);
                        wsRef.current.send(JSON.stringify(joinMessage));
                    }
                };

                wsRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                };

                wsRef.current.onclose = (event) => {
                    console.log(`[WEBSOCKET] Connection closed: ${event.code} - ${event.reason}`);
                    setIsConnected(false);

                    // Attempt to reconnect after 3 seconds
                    setTimeout(() => {
                        console.log('[WEBSOCKET] Attempting to reconnect...');
                        connectWebSocket();
                    }, 3000);
                };

                wsRef.current.onerror = (error) => {
                    console.error('[WEBSOCKET] Error:', error);
                };
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
            }
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [sessionId, currentUserId, sessionMode]);

    const sendMessage = (type: string, payload: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const message = { type, payload };
            console.log(`[WEBSOCKET] Sending message:`, message);
            console.log(`[WEBSOCKET] WebSocket state: OPEN (readyState=${wsRef.current.readyState})`);
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.error(`[WEBSOCKET] Cannot send message ${type} - connection not open. State:`, wsRef.current?.readyState);
        }
    };

    const handleWebSocketMessage = (data: any) => {
        console.log(`[WEBSOCKET] Received message:`, data.type, data);

        switch (data.type) {
            case 'SESSION_JOINED':
                console.log(`[SESSION] Successfully joined session. Participants:`, data.participants);
                setStudents(data.participants || []);
                break;

            case 'PARTICIPANT_JOINED':
                console.log(`[SESSION] ${data.participant.username} joined the session`);
                setStudents(prev => [...prev, data.participant]);
                setMessages(prev => [...prev, {
                    from: 'System',
                    text: `${data.participant.username} joined the session`,
                    timestamp: new Date().toISOString()
                }]);
                break;

            case 'PARTICIPANT_LEFT':
                console.log(`[SESSION] Participant ${data.participantId} left the session`);
                setStudents(prev => prev.filter(s => s.id !== data.participantId));
                break;

            case 'CHAT_MESSAGE':
                console.log(`[CHAT] Message received:`, data.payload?.message);
                const chatMessage = data.payload?.message || data.message;
                if (chatMessage) {
                    setMessages(prev => [...prev, chatMessage]);
                }
                break;

            case 'HAND_RAISED':
                setHandsRaised(prev => new Set([...prev, data.userId]));
                break;

            case 'HAND_LOWERED':
                setHandsRaised(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.userId);
                    return newSet;
                });
                break;

            // Essay mode specific messages
            case 'ESSAY_CONTENT_UPDATE':
                const contentUpdateUserId = data.payload?.userId || data.userId;
                const contentUpdateContent = data.payload?.content || data.content;
                console.log(`[ESSAY] Content update from user ${contentUpdateUserId}, length: ${contentUpdateContent?.length || 0}`);
                if (contentUpdateUserId !== currentUserId) {
                    console.log(`[ESSAY] Applying content update from ${contentUpdateUserId}`);
                    setEssayContent(contentUpdateContent);
                }
                break;

            case 'ESSAY_HOMEWORK_ASSIGNED':
                setEssayHomework(data.assignment);
                toast.success('New essay homework assigned!');
                break;

            case 'ESSAY_COLLABORATOR_UPDATE':
                setCollaborators(data.collaborators);
                break;

            case 'ESSAY_DOCUMENT_UPLOADED':
                console.log(`[ESSAY] Document uploaded:`, data.document);
                setUploadedDocument(data.document);
                if (data.document.content) {
                    setEssayContent(data.document.content);
                }
                toast.success(`Document "${data.document.name}" uploaded and loaded!`);
                break;

            case 'ESSAY_DOCUMENT_CONTENT_UPDATED':
                console.log(`[ESSAY] Document content updated by ${data.userId}`);
                if (data.userId !== currentUserId && data.content) {
                    setEssayContent(data.content);
                }
                break;

            case 'SESSION_MODE_SET':
                console.log('==== SESSION_MODE_SET RECEIVED ====');
                console.log('[SESSION] Full data object:', JSON.stringify(data, null, 2));
                console.log('[SESSION] data.type:', data.type);
                console.log('[SESSION] data.payload:', data.payload);

                const newMode = data.payload?.mode || data.mode;
                const senderId = data.payload?.userId || data.userId;

                console.log(`[SESSION] Extracted - Mode: ${newMode}, Sender: ${senderId}, Current user: ${currentUserId}, Role: ${role}`);

                if (senderId !== currentUserId) {
                    console.log('[SESSION] ✅ This is from another user, processing...');
                    setSessionMode(newMode);
                    setShowModeSelector(false);
                    toast.info(`Teacher changed session mode to ${newMode === 'code' ? 'Code Editor' : 'Essay Writing'}`);

                    // Redirect student to the same session page
                    console.log('[SESSION] Redirecting to session page...');
                    if (newMode === 'code') {
                        console.log('[SESSION] Navigating to /session/' + sessionId);
                        navigate(`/session/${sessionId}`);
                    } else if (newMode === 'essay') {
                        console.log('[SESSION] Navigating to /urgent-session/' + sessionId + '/essay');
                        navigate(`/urgent-session/${sessionId}/essay`);
                    }
                } else {
                    console.log('[SESSION] ⚠️ This is my own message, ignoring redirect');
                }
                console.log('==== SESSION_MODE_SET HANDLER END ====');
                break;

            // Code mode specific messages
            case 'CODE_UPDATE':
                const codeUserId = data.payload?.userId || data.userId;
                const codeFileId = data.payload?.fileId || data.fileId;
                const codeContent = data.payload?.content || data.content;

                console.log(`[CODE] Update from user ${codeUserId} for file ${codeFileId}`);

                if (codeUserId !== currentUserId && codeFileId && codeContent !== undefined) {
                    console.log(`[CODE] Applying code update from ${codeUserId}`);
                    setFiles(prev => prev.map(file =>
                        file.id === codeFileId
                            ? { ...file, content: codeContent }
                            : file
                    ));
                }
                break;

            case 'HOMEWORK_ASSIGNED':
                setPendingHomework(data.homework);
                toast.success('New homework assigned!');
                break;

            case 'ROLE_ASSIGNED':
                console.log(`[SESSION] Role assigned:`, data.payload?.role || data.role);
                // Role is already set from token, but backend confirms it
                break;

            case 'HAND_RAISED_LIST_UPDATE':
                console.log(`[SESSION] Hands raised update:`, data.payload?.studentsWithHandsRaised);
                const handsRaisedList = data.payload?.studentsWithHandsRaised || [];
                setHandsRaised(new Set(handsRaisedList));
                break;

            case 'STUDENT_LIST_UPDATE':
            case 'PARTICIPANT_LIST':
                console.log(`[SESSION] Participants update:`, data.payload?.students || data.participants);
                const participants = data.payload?.students || data.participants || [];
                setStudents(participants);
                break;

            case 'FILE_CREATED':
                console.log(`[CODE] New file created:`, data.payload?.file);
                const newFile = data.payload?.file;
                if (newFile && data.payload?.userId !== currentUserId) {
                    setFiles(prev => [...prev, newFile]);
                    toast.info(`${data.payload?.userId} created ${newFile.name}`);
                }
                break;

            case 'TERMINAL_OUTPUT':
                console.log(`[TERMINAL] Output from ${data.payload?.userId}`);
                // Optionally display remote terminal output
                break;

            default:
                console.log('Unhandled message type:', data.type);
        }
    };

    const handleModeSelect = async (mode: SessionMode) => {
        console.log('[DualModeLiveSession] Mode selected:', mode, 'by', username);
        console.log('[DualModeLiveSession] Current state:', {
            sessionId,
            currentUserId,
            username,
            role,
            isConnected
        });
        setSessionMode(mode);
        setShowModeSelector(false);

        // Call backend to start session and notify student via Socket.IO
        try {
            const response = await apiClient.post(`/api/sessions/${sessionId}/start`, {
                mode: mode
            });
            console.log('[DualModeLiveSession] Session started successfully via API:', response.data);
        } catch (error) {
            console.error('[DualModeLiveSession] Error calling start session API:', error);
        }

        // Send mode selection to other participants via WebSocket
        console.log('[DualModeLiveSession] Broadcasting SESSION_MODE_SET to all participants');
        const modePayload = {
            sessionId,
            mode,
            userId: currentUserId
        };
        console.log('[DualModeLiveSession] Payload:', modePayload);
        sendMessage('SESSION_MODE_SET', modePayload);

        toast.success(`Session mode set to ${mode === 'code' ? 'Code Editor' : 'Essay Writing'}`);

        // Redirect to the appropriate session page with full features
        console.log('[DualModeLiveSession] Redirecting to session page...');
        if (mode === 'code') {
            // Use LiveTutorialPage which has full Docker terminal + Agora
            console.log('[DualModeLiveSession] Navigating to /session/' + sessionId);
            navigate(`/session/${sessionId}`);
        } else if (mode === 'essay') {
            // Use UrgentEssaySessionPage which has full collaborative essay editor
            console.log('[DualModeLiveSession] Navigating to /urgent-session/' + sessionId + '/essay');
            navigate(`/urgent-session/${sessionId}/essay`);
        }
    };

    const handleEssayHomeworkAssignment = (assignment: EssayHomeworkAssignment) => {
        setEssayHomework(assignment);
    };

    const handleRaiseHand = () => {
        const isRaised = handsRaised.has(currentUserId);

        if (isRaised) {
            setHandsRaised(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentUserId);
                return newSet;
            });
            sendMessage('HAND_LOWERED', { userId: currentUserId });
        } else {
            setHandsRaised(prev => new Set([...prev, currentUserId]));
            sendMessage('HAND_RAISED', { userId: currentUserId });
        }
    };

    const handleLeaveSession = () => {
        sendMessage('LEAVE_SESSION', { sessionId, userId: currentUserId });
        navigate('/dashboard');
    };

    // Document upload handler
    const handleDocumentUpload = async (file: File) => {
        try {
            let content = '';

            // Handle different file types
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                content = await file.text();
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
                // For DOCX files, we'll need to extract text content
                // For now, set a placeholder - in production you'd use a library like mammoth.js
                content = `<h1>Document: ${file.name}</h1><p>Please paste the content from your document here...</p>`;
                toast.info('DOCX files require manual content copying. Please copy and paste your document content into the editor.');
            } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                content = `<h1>Document: ${file.name}</h1><p>Please paste the content from your PDF here...</p>`;
                toast.info('PDF files require manual content copying. Please copy and paste your document content into the editor.');
            } else {
                content = `<h1>Document: ${file.name}</h1><p>Start writing your essay here...</p>`;
            }

            const document = {
                name: file.name,
                url: URL.createObjectURL(file),
                content: content,
                instructions: `Work on this essay: ${file.name}`
            };

            setUploadedDocument(document);

            // Immediately set the essay content so it loads in the Liveblocks editor
            setEssayContent(content);

            // Broadcast document upload to all participants
            sendMessage('ESSAY_DOCUMENT_UPLOADED', {
                document: document,
                uploadedBy: currentUserId,
                timestamp: new Date().toISOString()
            });

            toast.success(`Document "${file.name}" loaded for session!`);
        } catch (error) {
            console.error('Document upload error:', error);
            toast.error('Failed to upload document');
        }
    };

    // Live session management functions for essay mode
    const initializeLiveSession = () => {
        if (sessionMode !== 'essay') return;

        const userInfo = {
            id: currentUserId,
            name: username,
            role: role === 'teacher' ? 'teacher' : 'student'
        };

        // Set up live session event listeners
        liveSessionService.on('session:joined', (participant: Participant) => {
            setSessionParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
            toast.info(`${participant.name} joined the essay session`);
        });

        liveSessionService.on('session:left', (participantId: string) => {
            setSessionParticipants(prev => prev.filter(p => p.id !== participantId));
        });

        liveSessionService.on('workspace:created', (workspace: Workspace) => {
            setWorkspaces(prev => [...prev, workspace]);
            toast.success(`Breakout room "${workspace.name}" created`);
        });

        liveSessionService.on('whiteboard:action', (action: DrawingAction) => {
            // Handle incoming whiteboard actions
            console.log('Received whiteboard action:', action);
        });
    };

    const createBreakoutRoom = async () => {
        if (!liveSession || role !== 'teacher') return;

        try {
            const roomName = `Essay Breakout ${workspaces.filter(w => w.type === 'breakout').length + 1}`;
            const workspace = await liveSessionService.createBreakoutRoom(roomName, {
                isPrivate: false,
                maxParticipants: 10
            });

            setWorkspaces(prev => [...prev, workspace]);
            toast.success(`Created ${roomName}`);
        } catch (error) {
            console.error('Failed to create breakout room:', error);
            toast.error('Failed to create breakout room');
        }
    };

    const switchWorkspace = async (workspaceId: string) => {
        if (!liveSession) return;

        try {
            await liveSessionService.joinWorkspace(workspaceId);
            setCurrentWorkspaceId(workspaceId);

            const workspace = workspaces.find(w => w.id === workspaceId);
            toast.success(`Switched to ${workspace?.name || 'workspace'}`);
        } catch (error) {
            console.error('Failed to switch workspace:', error);
            toast.error('Failed to switch workspace');
        }
    };

    const handleWhiteboardAction = (action: DrawingAction) => {
        if (!liveSession) return;
        liveSessionService.sendWhiteboardAction(currentWorkspaceId, action);
    };

    // Initialize live session when essay mode is selected
    React.useEffect(() => {
        if (sessionMode === 'essay' && isConnected) {
            initializeLiveSession();
        }
    }, [sessionMode, isConnected]);

    // Render homework view if student is doing homework
    if (role === 'student' && isDoingEssayHomework && essayHomework) {
        return (
            <EssayHomeworkView
                assignment={essayHomework}
                sessionId={sessionId!}
                studentId={currentUserId}
                studentName={username}
                teacherName={students.find(s => s.role === 'teacher')?.username}
                onLeave={() => setIsDoingEssayHomework(false)}
                sendWsMessage={sendMessage}
                isTeacherMonitoring={role === 'teacher'}
            />
        );
    }

    if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
        return (
            <HomeworkView
                lessonId={pendingHomework.lessonId}
                teacherSessionId={pendingHomework.teacherSessionId}
                token={token!}
                onLeave={() => setIsDoingHomework(false)}
                initialFiles={homeworkFiles}
                onFilesChange={setHomeworkFiles}
                currentUserId={currentUserId}
            />
        );
    }

    // Handler for starting the session (teacher only)
    const handleStartSession = async () => {
        if (role !== 'teacher' || !sessionId) return;

        try {
            console.log('[DualModeLiveSession] Starting session:', sessionId);
            const response = await apiClient.post(`/api/sessions/${sessionId}/start`);

            if (response.data.success) {
                toast.success('Session started! All participants have been notified.');
                console.log('[DualModeLiveSession] Session started successfully');
            }
        } catch (error: any) {
            console.error('[DualModeLiveSession] Error starting session:', error);
            toast.error(error.response?.data?.error || 'Failed to start session');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white relative">
            {/* Mode selector dialog */}
            <SessionModeSelector
                isOpen={showModeSelector && role === 'teacher'}
                onClose={() => setShowModeSelector(false)}
                onModeSelect={handleModeSelect}
                currentMode={sessionMode || undefined}
            />

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-3 h-3 rounded-full",
                            isConnected ? "bg-green-400" : "bg-red-400"
                        )} />
                        <span className="font-semibold">
                            {sessionMode === 'essay' ? 'Essay Writing Session' : 'Code Tutorial Session'}
                        </span>
                        <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                            {role === 'teacher' ? 'Teacher' : 'Student'}
                        </Badge>
                    </div>

                    {/* Document Upload for Teachers */}
                    {role === 'teacher' && sessionMode === 'essay' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept=".doc,.docx,.pdf,.txt"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleDocumentUpload(file);
                                    }
                                }}
                                className="hidden"
                                id="document-upload"
                            />
                            <label
                                htmlFor="document-upload"
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer text-sm transition-colors"
                            >
                                <FilePlus className="h-4 w-4" />
                                Upload Essay
                            </label>
                            {uploadedDocument && (
                                <Badge variant="secondary" className="text-xs">
                                    📄 {uploadedDocument.name}
                                </Badge>
                            )}
                        </div>
                    )}

                    {sessionMode && (
                        <Badge className={cn(
                            "text-xs",
                            sessionMode === 'essay'
                                ? "bg-green-500/20 text-green-300 border-green-500/30"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        )}>
                            {sessionMode === 'essay' ? <FileText className="h-3 w-3 mr-1" /> : <Code2 className="h-3 w-3 mr-1" />}
                            {sessionMode === 'essay' ? 'Essay Mode' : 'Code Mode'}
                        </Badge>
                    )}

                    {students.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-400">{students.length} participants</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {role === 'teacher' && sessionMode && (
                        <>
                            <Button
                                size="sm"
                                onClick={handleStartSession}
                                className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                            >
                                <Play className="h-4 w-4 mr-1" />
                                Start Session
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowModeSelector(true)}
                                className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                            >
                                <Settings className="h-4 w-4 mr-1" />
                                Change Mode
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVideoPanel(!showVideoPanel)}
                        className={cn(
                            "border-slate-600",
                            showVideoPanel ? "bg-blue-600/20 border-blue-600/30 text-blue-300" : "bg-slate-700 hover:bg-slate-600"
                        )}
                    >
                        <Video className="h-4 w-4 mr-1" />
                        Video
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChatPanel(!showChatPanel)}
                        className={cn(
                            "border-slate-600",
                            showChatPanel ? "bg-green-600/20 border-green-600/30 text-green-300" : "bg-slate-700 hover:bg-slate-600"
                        )}
                    >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                    </Button>

                    {role === 'teacher' && sessionMode === 'essay' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMonitoringPanel(!showMonitoringPanel)}
                                className={cn(
                                    "border-slate-600",
                                    showMonitoringPanel ? "bg-purple-600/20 border-purple-600/30 text-purple-300" : "bg-slate-700 hover:bg-slate-600"
                                )}
                            >
                                <Monitor className="h-4 w-4 mr-1" />
                                Monitor
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowWhiteboard(true)}
                                className="border-slate-600 bg-slate-700 hover:bg-slate-600"
                            >
                                <Pen className="h-4 w-4 mr-1" />
                                Whiteboard
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowWorkspaceManager(true)}
                                className="border-slate-600 bg-slate-700 hover:bg-slate-600"
                            >
                                <Users className="h-4 w-4 mr-1" />
                                Workspaces
                            </Button>
                        </>
                    )}

                    {sessionMode === 'essay' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowWhiteboard(true)}
                            className="border-slate-600 bg-slate-700 hover:bg-slate-600"
                        >
                            <Pen className="h-4 w-4 mr-1" />
                            Whiteboard
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLeaveSession}
                        className="bg-red-600/20 border-red-600/30 hover:bg-red-600/30 text-red-300"
                    >
                        <PhoneOff className="h-4 w-4 mr-1" />
                        Leave
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden">
                {sessionMode === 'essay' ? (
                    // Essay mode layout - Using ModernEssayEditor with Agora video/audio
                    <ModernEssayEditor
                        sessionId={sessionId!}
                        userId={currentUserId}
                        username={username}
                        userRole={role}
                    />
                ) : sessionMode === 'code' ? (
                    // Code mode layout (similar to LiveTutorialPage)
                    <PanelGroup direction="vertical" className="h-full">
                        <Panel defaultSize={60} minSize={40}>
                            <PanelGroup direction="horizontal" key={showChatPanel ? 'with-chat' : 'no-chat'}>
                                <Panel defaultSize={showChatPanel ? 75 : 100} minSize={50} maxSize={showChatPanel ? 80 : 100}>
                                    <Editor
                                        height="100%"
                                        defaultLanguage="python"
                                        value={files.find(f => f.id === activeFileId)?.content || ''}
                                        onChange={(value) => {
                                            if (value !== undefined) {
                                                setFiles(prev => prev.map(file =>
                                                    file.id === activeFileId
                                                        ? { ...file, content: value }
                                                        : file
                                                ));

                                                sendMessage('CODE_UPDATE', {
                                                    fileId: activeFileId,
                                                    content: value,
                                                    userId: currentUserId
                                                });
                                            }
                                        }}
                                        theme="vs-dark"
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineNumbers: 'on',
                                            roundedSelection: false,
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                        }}
                                    />
                                </Panel>

                                {showChatPanel && (
                                    <>
                                        <PanelResizeHandle className="w-px bg-slate-700" />
                                        <Panel defaultSize={25} minSize={20} maxSize={40}>
                                            <ChatPanel
                                                messages={messages}
                                                currentUserId={currentUserId}
                                                onSendMessage={(text) => {
                                                    const message = {
                                                        from: username,
                                                        text,
                                                        timestamp: new Date().toISOString()
                                                    };
                                                    sendMessage('CHAT_MESSAGE', { message });
                                                    setMessages(prev => [...prev, message]);
                                                }}
                                                students={students}
                                                handsRaised={handsRaised}
                                            />
                                        </Panel>
                                    </>
                                )}
                            </PanelGroup>
                        </Panel>

                        <PanelResizeHandle className="h-px bg-slate-700" />
                        <Panel defaultSize={40} minSize={30}>
                            <DockerTerminal
                                sessionId={sessionId!}
                                onOutput={(output) => setTerminalOutput(prev => prev + output)}
                            />
                        </Panel>
                    </PanelGroup>
                ) : (
                    // No mode selected - show placeholder
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="text-6xl text-slate-600">📚</div>
                            <h2 className="text-2xl font-bold text-slate-300">Waiting for Session Mode</h2>
                            <p className="text-slate-400">The teacher will select the session mode shortly...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating panels */}
            {showVideoPanel && (
                <EssayVideoPanel
                    sessionId={sessionId!}
                    userId={currentUserId}
                    username={username}
                    userRole={role}
                    students={students}
                    handsRaised={handsRaised}
                    onHandRaise={handleRaiseHand}
                    sendWsMessage={sendMessage}
                    isVisible={showVideoPanel}
                    onToggleVisibility={() => setShowVideoPanel(!showVideoPanel)}
                />
            )}

            {role === 'teacher' && sessionMode === 'essay' && (
                <EssayMonitoringPanel
                    sessionId={sessionId!}
                    students={students}
                    sendWsMessage={sendMessage}
                    isVisible={showMonitoringPanel}
                    onToggleVisibility={() => setShowMonitoringPanel(!showMonitoringPanel)}
                />
            )}

            {/* Collaborative Whiteboard for Essay Mode */}
            {sessionMode === 'essay' && (
                <CollaborativeWhiteboard
                    sessionId={sessionId || 'demo'}
                    userId={currentUserId}
                    userName={username}
                    userRole={role === 'teacher' ? 'teacher' : 'student'}
                    isVisible={showWhiteboard}
                    onClose={() => setShowWhiteboard(false)}
                    onToggleBreakout={() => {
                        // Switch between main and breakout workspace
                        const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
                        if (currentWorkspace?.type === 'main') {
                            const breakoutRoom = workspaces.find(w => w.type === 'breakout');
                            if (breakoutRoom) {
                                switchWorkspace(breakoutRoom.id);
                            } else {
                                createBreakoutRoom();
                            }
                        } else {
                            const mainWorkspace = workspaces.find(w => w.type === 'main');
                            if (mainWorkspace) {
                                switchWorkspace(mainWorkspace.id);
                            }
                        }
                    }}
                    isInBreakout={workspaces.find(w => w.id === currentWorkspaceId)?.type === 'breakout'}
                    workspaceId={currentWorkspaceId}
                    onWorkspaceSwitch={switchWorkspace}
                    availableWorkspaces={workspaces.map(w => ({
                        id: w.id,
                        name: w.name,
                        userId: w.ownerId,
                        active: w.id === currentWorkspaceId
                    }))}
                    onSendAction={handleWhiteboardAction}
                />
            )}

            {/* Workspace Manager for Essay Mode */}
            {sessionMode === 'essay' && (
                <WorkspaceManager
                    sessionId={sessionId || 'demo'}
                    currentUserId={currentUserId}
                    currentUserName={username}
                    currentUserRole={role === 'teacher' ? 'teacher' : 'student'}
                    currentWorkspaceId={currentWorkspaceId}
                    workspaces={workspaces}
                    isVisible={showWorkspaceManager}
                    onClose={() => setShowWorkspaceManager(false)}
                    onWorkspaceSwitch={switchWorkspace}
                    onCreateBreakoutRoom={createBreakoutRoom}
                    onJoinWorkspace={switchWorkspace}
                    onLeaveWorkspace={(workspaceId) => {
                        const mainWorkspace = workspaces.find(w => w.type === 'main');
                        if (mainWorkspace) {
                            switchWorkspace(mainWorkspace.id);
                        }
                    }}
                    onMonitorWorkspace={(workspaceId, monitor) => {
                        // Monitor functionality
                        console.log('Monitor workspace:', workspaceId, monitor);
                    }}
                    onInviteToWorkspace={(workspaceId, userId) => {
                        toast.info('Invite functionality not yet implemented');
                    }}
                    onUpdatePermissions={(workspaceId, userId, permissions) => {
                        console.log('Update permissions:', { workspaceId, userId, permissions });
                    }}
                    onSendMessage={(workspaceId, message) => {
                        if (liveSession) {
                            liveSessionService.sendMessage(workspaceId, message);
                        }
                    }}
                    onToggleWhiteboard={(workspaceId) => {
                        setShowWhiteboard(true);
                        if (workspaceId !== currentWorkspaceId) {
                            switchWorkspace(workspaceId);
                        }
                    }}
                    onToggleVideo={(workspaceId) => {
                        toast.info('Video functionality not yet implemented');
                    }}
                    onToggleAudio={(workspaceId) => {
                        toast.info('Audio functionality not yet implemented');
                    }}
                />
            )}

            <Toaster />
        </div>
    );
};

export default DualModeLiveSession;