/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   LiveTutorialPage.tsx (ENHANCED INTEGRATED DESIGN)
 * =================================================================
 * DESCRIPTION: Enhanced design with seamlessly integrated video panels
 * that complement the learning experience rather than dominate it.
 * All original functionality preserved with improved UX.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { cn } from "@/lib/utils";

// --- AGORA SDK IMPORT ---
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

// Import child components
import { HomeworkView } from '../components/classroom/HomeworkView';
import { RosterPanel } from '../components/classroom/RosterPanel';
import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
import { ChatPanel } from '../components/classroom/ChatPanel';

// Import shadcn components and icons
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle, Video, VideoOff, Mic, MicOff, Users, Maximize2, Minimize2, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast, Toaster } from 'sonner';

// Import types and configs
import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';
import apiClient from '../services/apiClient';
import { getWebSocketUrl } from '../config/websocket';

// --- Type Definitions and Helpers ---
interface Message { from: string; text: string; timestamp: string; }
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

// --- Enhanced Video Components ---
const VideoTile = ({ user, students, isLocal = false, className = "" }: { 
    user?: IAgoraRTCRemoteUser, 
    students: Student[], 
    isLocal?: boolean,
    className?: string 
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        if (!isLocal && videoRef.current && user?.videoTrack) {
            user.videoTrack.play(videoRef.current);
        }
        if (!isLocal && user?.audioTrack) {
            user.audioTrack.play();
        }
        return () => {
            if (!isLocal) user?.videoTrack?.stop();
        };
    }, [user, isLocal]);

    const username = isLocal ? 'You' : 
        (students.find(s => String(s.id) === String(user?.uid))?.username || `User ${user?.uid.toString().substring(0, 4)}`);

    const hasVideo = isLocal || user?.videoTrack;

    return (
        <div className={cn("relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700/50", className)}>
            {hasVideo ? (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={isLocal}
                    className="w-full h-full object-cover" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <div className="text-center text-slate-400">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">{username}</span>
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md border border-white/10">
                {username}
            </div>
            {!hasVideo && (
                <div className="absolute top-2 right-2">
                    <VideoOff className="h-4 w-4 text-slate-500" />
                </div>
            )}
        </div>
    );
};

const FloatingVideoPanel = ({ 
    localVideoRef, 
    remoteUsers, 
    students, 
    isMinimized, 
    onToggleMinimize 
}: {
    localVideoRef: React.RefObject<HTMLVideoElement>,
    remoteUsers: IAgoraRTCRemoteUser[],
    students: Student[],
    isMinimized: boolean,
    onToggleMinimize: () => void
}) => {
    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-30">
                <Card className="bg-slate-900/95 backdrop-blur-xl border-slate-700/80 shadow-2xl">
                    <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-slate-300">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">{remoteUsers.length + 1} participants</span>
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={onToggleMinimize}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-30 w-80">
            <Card className="bg-slate-900/95 backdrop-blur-xl border-slate-700/80 shadow-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-200">
                            <Users className="h-4 w-4" />
                            Live Session
                        </div>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={onToggleMinimize}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                            <Minimize2 className="h-3 w-3" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Local video - always visible */}
                    <div className="relative">
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-32 bg-slate-800 rounded-lg object-cover border border-slate-600/50" 
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                            You
                        </div>
                    </div>
                    
                    {/* Remote videos */}
                    {remoteUsers.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {remoteUsers.slice(0, 4).map(user => (
                                <VideoTile 
                                    key={user.uid} 
                                    user={user} 
                                    students={students}
                                    className="h-20"
                                />
                            ))}
                        </div>
                    )}
                    
                    {remoteUsers.length === 0 && (
                        <div className="h-20 bg-slate-800 rounded-lg border border-slate-600/50 flex items-center justify-center">
                            <span className="text-slate-400 text-sm">Waiting for participants...</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// --- Main Live Tutorial Page Component ---
const LiveTutorialPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('authToken');

    // --- State Management ---
    const decodedToken = token ? simpleJwtDecode(token) : null;
    const currentUserId = decodedToken?.user?.id || null;
    const [role, setRole] = useState<UserRole>(decodedToken?.user?.role || 'unknown');
    
    // --- AGORA STATE ---
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);

    // --- APPLICATION STATE ---
    const [files, setFiles] = useState<CodeFile[]>([]);
    const [activeFileName, setActiveFileName] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
    const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
    const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
    const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
    const [isFrozen, setIsFrozen] = useState<boolean>(false);
    const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
        const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
        return saved ? JSON.parse(saved) : null;
    });
    const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
    const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
        const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
        return saved === 'true';
    });
    const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
        const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
        return saved ? JSON.parse(saved) : null;
    });
    const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
    const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
    const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
    const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
    const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
    const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
    const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
    const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

    // --- Refs ---
    const ws = useRef<WebSocket | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const roleRef = useRef(role);
    const teacherIdRef = useRef(teacherId);
    const activeChatStudentIdRef = useRef(activeChatStudentId);

    useEffect(() => { roleRef.current = role; }, [role]);
    useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
    useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

    // --- Computed State ---
    const displayedWorkspace = (() => {
        if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
        if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
        return { files, activeFileName };
    })();
    const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
    const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
    const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
    const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
    // --- Effects ---

    // Unified Initialization and Cleanup Effect for WebSocket, Agora, and Terminal
    useEffect(() => {
        if (!token || !sessionId || !currentUserId) {
            navigate('/login');
            return;
        }

        // --- WebSocket Setup ---
        const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
        console.log("Attempting to connect WebSocket to:", wsUrl);
        const socket = new WebSocket(wsUrl);
        ws.current = socket;
        socket.onopen = () => { setIsConnected(true); toast.success("Connected to live session!"); };
        socket.onclose = () => { setIsConnected(false); toast.error("Disconnected from live session."); };
        socket.onerror = (err) => { console.error("WebSocket Error:", err); setIsConnected(false); toast.error("A real-time connection error occurred."); };
        initializeWebSocketEvents(socket);

        // --- Agora Setup ---
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        const joinAgoraChannel = async () => {
            try {
                const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
                if (!agoraAppId) {
                    throw new Error("Agora App ID is not configured in environment variables.");
                }
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token: agoraToken, uid } = response.data;
                await client.join(agoraAppId, sessionId, agoraToken, uid);
                
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { videoTrack, audioTrack };
                
                if (localVideoRef.current) videoTrack.play(localVideoRef.current);
                await client.publish([audioTrack, videoTrack]);
            } catch (error) {
                console.error("Agora Connection Failed:", error);
                toast.error("Could not connect to the video/audio service.");
            }
        };

        joinAgoraChannel();

        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') setRemoteUsers(Array.from(client.remoteUsers));
            if (mediaType === 'audio') user.audioTrack?.play();
        });

        client.on('user-left', (_user) => {
            setRemoteUsers(Array.from(client.remoteUsers));
        });

        // --- Terminal Setup ---
        if (terminalRef.current && !term.current) {
            fitAddon.current = new FitAddon();
            const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
            newTerm.loadAddon(fitAddon.current);
            newTerm.open(terminalRef.current);
            fitAddon.current.fit();
            newTerm.onData((data) => {
                if (ws.current?.readyState === WebSocket.OPEN && roleRef.current === 'teacher' && viewingMode === 'teacher') {
                    sendWsMessage('TERMINAL_IN', { data });
                }
            });
            term.current = newTerm;
        }

        // --- Cleanup Function ---
        return () => {
            ws.current?.close();
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            client.leave();
            term.current?.dispose();
        };
    }, [sessionId, currentUserId, navigate, token]);

    useEffect(() => {
        if (role === 'student') {
            sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
            if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
            if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
            if (!isDoingHomework) {
                sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
                sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
                sessionStorage.removeItem(`pendingHomework_${sessionId}`);
            }
        }
    }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

    useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

    useEffect(() => {
        if (role === 'teacher') {
            apiClient.get('/api/lessons/teacher/list')
            .then(res => res.data || [])
            .then(setAvailableLessons)
            .catch(() => setAvailableLessons([]));
        }
    }, [role, token]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!term.current) return;
            let outputToDisplay = '';
            let isTerminalReadOnly = false;
            if (spotlightedStudentId && spotlightWorkspace) {
                const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
                outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
                isTerminalReadOnly = true;
            } else if (role === 'teacher' && viewingMode !== 'teacher') {
                const studentState = studentHomeworkStates.get(viewingMode);
                const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
                outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
                isTerminalReadOnly = !isTeacherControllingThisStudent;
            } else {
                outputToDisplay = teacherTerminalOutput;
                isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
            }
            term.current.clear();
            term.current.write(outputToDisplay);
            if (term.current.options.disableStdin !== isTerminalReadOnly) {
                term.current.options.disableStdin = isTerminalReadOnly;
            }
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);


    // --- Handlers and Functions ---
    const sendWsMessage = (type: string, payload?: object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        } else {
            console.error("WebSocket is not open. Cannot send message:", type, payload);
            toast.error("Connection lost. Please refresh the page.");
        }
    };
    
    const initializeWebSocketEvents = (currentWs: WebSocket) => {
        currentWs.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'PRIVATE_MESSAGE': {
                    const msg = message.payload as Message;
                    const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
                    if (!chatPartnerId) return;
                    setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
                    if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
                        setUnreadMessages(prev => new Set(prev).add(msg.from));
                    }
                    break;
                }
                case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
                case 'WHITEBOARD_UPDATE': setWhiteboardLines(prev => [...prev, message.payload.line]); break;
                case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
                case 'ROLE_ASSIGNED':
                    setRole(message.payload.role);
                    setFiles(message.payload.files || []);
                    setActiveFileName(message.payload.activeFile || '');
                    setSpotlightedStudentId(message.payload.spotlightedStudentId);
                    setControlledStudentId(message.payload.controlledStudentId);
                    setIsFrozen(message.payload.isFrozen);
                    setWhiteboardLines(message.payload.whiteboardLines || []);
                    setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
                    setTeacherId(message.payload.teacherId);
                    setTeacherTerminalOutput(message.payload.terminalOutput || '');
                    break;
                case 'TEACHER_WORKSPACE_UPDATE':
                    if (roleRef.current === 'student' && !spotlightedStudentId) {
                        setFiles(message.payload.files);
                        setActiveFileName(message.payload.activeFileName);
                        setTeacherTerminalOutput(message.payload.terminalOutput || '');
                    }
                    break;
                 case 'TEACHER_CODE_DID_UPDATE':
                    if (roleRef.current === 'student' && !spotlightedStudentId) {
                        setFiles(message.payload.files);
                        setActiveFileName(message.payload.activeFileName);
                    }
                    break;
                case 'TERMINAL_OUT':
                     if ((roleRef.current === 'student' && !spotlightedStudentId) || (roleRef.current === 'teacher' && viewingMode === 'teacher')) {
                        setTeacherTerminalOutput(prev => prev + message.payload);
                     }
                    break;
                case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
                case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
                case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
                case 'STUDENT_WORKSPACE_UPDATED':
                    setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
                    if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
                    break;
                case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
                case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
                case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
                case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
                case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
                case 'HOMEWORK_TERMINAL_UPDATE': 
                    setStudentHomeworkStates(prev => { 
                        const map = new Map(prev); 
                        const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; 
                        s.terminalOutput += message.payload.output; 
                        map.set(message.payload.studentId, s); 
                        return map; 
                    }); 
                    break;
            }
        };
    };

    const handleStartHomework = async () => {
        if (!pendingHomework) return;
        if (!homeworkFiles) {
            try {
                const stateRes = await apiClient.get(`/api/lessons/${pendingHomework.lessonId}/student-state`);
                setHomeworkFiles(stateRes.data.files || []);
            } catch (error) {
                console.error("Error fetching homework state:", error);
                toast.error("A network error occurred.");
                return;
            }
        }
        setIsDoingHomework(true);
    };

    const handleWorkspaceChange = (value: string | undefined) => {
        const newCode = value || '';
        if (isTeacherControllingThisStudent) {
            const studentState = studentHomeworkStates.get(viewingMode);
            if (!studentState) return;
            const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
            sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
        } else if (role === 'teacher' && viewingMode === 'teacher') {
            const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
            setFiles(updatedFiles);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
        }
    };
    const handleLanguageChange = (newLanguage: string) => {
         if (isTeacherControllingThisStudent) {
            const studentState = studentHomeworkStates.get(viewingMode);
            if (!studentState) return;
            const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
            sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
         } else if (role === 'teacher' && viewingMode === 'teacher') {
            const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
            setFiles(updatedFiles);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
         }
    };
    const handleActiveFileChange = (fileName: string) => {
        if (isTeacherControllingThisStudent) {
            const studentState = studentHomeworkStates.get(viewingMode);
            if (!studentState) return;
            sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
        } else if (role === 'teacher' && viewingMode === 'teacher') {
             setActiveFileName(fileName);
             sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
        }
    };

    const handleAddFile = () => {
        if (role !== 'teacher' || viewingMode !== 'teacher') return;
        const newFileName = prompt("Enter new file name (e.g., script.js):");
        if (newFileName && !files.some(f => f.name === newFileName)) {
            let language = 'plaintext';
            const extension = newFileName.split('.').pop();
            if (extension === 'js') language = 'javascript';
            if (extension === 'py') language = 'python';
            if (extension === 'java') language = 'java';
            const newFile = { name: newFileName, language, content: '' };
            const updatedFiles = [...files, newFile];
            setFiles(updatedFiles);
            setActiveFileName(newFileName);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
        }
    };
    const handleAssignHomework = (studentId: string, lessonId: number | string) => {
        const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
        if (lesson) {
            sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
            setAssigningToStudentId(null);
        }
    };
    
    const handleRunCode = () => {
        if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
            sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
        }
    };

    const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
    const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
    const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
    const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
    const handleViewStudentCam = async (_studentId: string) => { toast.info("Video connection is already active!"); };
    const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    const handleOpenChat = (studentId: string) => {
        setActiveChatStudentId(studentId);
        setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
    };

    const handleSendMessage = (text: string) => {
        const to = role === 'teacher' ? activeChatStudentId : teacherId;
        if (!to) { toast.error("Recipient not found."); return; }
        const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
        sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
        setChatMessages(prev => {
            const newMap = new Map(prev);
            const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
            newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
            return newMap;
        });
    };

    const toggleMute = () => { 
        if (localTracks.current?.audioTrack) {
            const isEnabled = localTracks.current.audioTrack.enabled;
            localTracks.current.audioTrack.setEnabled(!isEnabled);
            setIsMuted(isEnabled);
        }
    };
    
    const toggleCamera = () => { 
        if (localTracks.current?.videoTrack) {
            const isEnabled = localTracks.current.videoTrack.enabled;
            localTracks.current.videoTrack.setEnabled(!isEnabled);
            setIsCameraOff(isEnabled);
        }
    };

    if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
        return <HomeworkView 
            lessonId={pendingHomework.lessonId} 
            teacherSessionId={pendingHomework.teacherSessionId} 
            token={token} 
            onLeave={() => {
                sessionStorage.setItem(`isDoingHomework_${sessionId}`, 'false');
                sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
                sessionStorage.removeItem(`pendingHomework_${sessionId}`);
                setTimeout(() => { window.location.reload(); }, 50);
            }} 
            initialFiles={homeworkFiles} 
            onFilesChange={setHomeworkFiles} 
            currentUserId={currentUserId} 
        />;
    }
    
    return (
        <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden relative">
            <Toaster theme="dark" richColors position="top-right" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

            {/* Enhanced Header with integrated status indicators */}
            <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-6 py-3 border-b border-slate-700/80 bg-slate-950/80 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
                    <div className="flex items-center gap-3">
                        <Badge className={cn('text-white font-semibold', role === 'teacher' ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-pink-600')}>
                            {role.toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500')}></span>
                            <span className="text-slate-400">{isConnected ? 'Connected' : 'Offline'}</span>
                        </div>
                        {remoteUsers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-cyan-400" />
                                <span className="text-slate-400">{remoteUsers.length + 1} online</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status Badges */}
                    {spotlightedStudentId && (
                        <Badge className="animate-pulse bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-0">
                            <Star className="mr-2 h-4 w-4" />
                            SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}
                        </Badge>
                    )}
                    {isTeacherControllingThisStudent && (
                        <Badge className="animate-pulse bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                            <Lock className="mr-2 h-4 w-4" />
                            CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}
                        </Badge>
                    )}

                    {/* Action Buttons */}
                    {role === 'student' && (
                        <>
                            <Button size="sm" onClick={handleRaiseHand} disabled={!isConnected} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold border-0">
                                <Hand className="mr-2 h-4 w-4" />Raise Hand
                            </Button>
                            <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} disabled={!isConnected} className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                                <MessageCircle className="mr-2 h-4 w-4" />Chat
                            </Button>
                        </>
                    )}

                    {role === 'teacher' && (
                        <>
                            <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white border-0', isFrozen ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400' : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500')}>
                                <Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}
                            </Button>
                            <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                                <Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}
                            </Button>
                            {isWhiteboardVisible && (
                                <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0">
                                    <Trash2 className="mr-2 h-4 w-4" />Clear
                                </Button>
                            )}
                        </>
                    )}

                    {/* Media Controls */}
                    <div className="flex items-center gap-2 border-l border-slate-600 pl-3">
                        <Button size="sm" onClick={toggleMute} className={cn('text-white border-0', !isMuted ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400')}>
                            {!isMuted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" onClick={toggleCamera} className={cn('text-white border-0', !isCameraOff ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400')}>
                            {!isCameraOff ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </Button>
                    </div>

                    <Button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold border-0">
                        <PhoneOff className="mr-2 h-4 w-4" /> End Session
                    </Button>
                </div>
            </header>

            {/* Homework Assignment Alert */}
            {pendingHomework && role === 'student' && !isDoingHomework && (
                <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 text-blue-200">
                    <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
                    <AlertDescription className="flex items-center justify-between text-slate-200">
                        Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
                        <Button size="sm" onClick={handleStartHomework} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold border-0">
                            Start Lesson<ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content Area with Enhanced Layout */}
            <main className="relative z-10 flex-grow flex overflow-hidden p-4 gap-4">
                <PanelGroup direction="horizontal" className="w-full h-full">
                    {/* Left Panel: Code Editor and Terminal */}
                    <Panel defaultSize={75} minSize={50} className="flex flex-col gap-4">
                        <div className="flex-grow flex flex-col rounded-xl border border-slate-700/80 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <PanelGroup direction="vertical" className="h-full">
                                {/* Code Editor Section */}
                                <Panel defaultSize={isWhiteboardVisible ? 60 : 70} minSize={40}>
                                    <PanelGroup direction="horizontal" className="h-full">
                                        {/* File Explorer */}
                                        <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/30 border-r border-slate-700/50">
                                            <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                                                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-200">Explorer</h2>
                                                {role === 'teacher' && viewingMode === 'teacher' && (
                                                    <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-8 w-8 text-slate-400 hover:bg-slate-700 hover:text-cyan-300">
                                                        <FilePlus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex-grow overflow-y-auto p-2 space-y-1">
                                                {displayedWorkspace.files.map(file => (
                                                    <div key={file.name} 
                                                        onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
                                                        className={cn(
                                                            'flex items-center px-3 py-2 rounded-lg text-sm transition-all cursor-pointer group',
                                                            isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'text-slate-200 hover:bg-slate-800/60',
                                                            displayedWorkspace.activeFileName === file.name && 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                                                        )}
                                                    >
                                                        <FileIcon className="h-4 w-4 mr-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                                        <span className="truncate">{file.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Panel>
                                        
                                        <PanelResizeHandle className="w-1 bg-slate-700/50 hover:bg-cyan-500/50 transition-colors" />
                                        
                                        {/* Code Editor */}
                                        <Panel defaultSize={80} minSize={30}>
                                            <div className="h-full flex flex-col">
                                                <div className="p-3 flex justify-between items-center bg-slate-900/50 border-b border-slate-700/50">
                                                    <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
                                                        <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                                            <SelectItem value="python">Python</SelectItem>
                                                            <SelectItem value="java">Java</SelectItem>
                                                            <SelectItem value="ruby">Ruby</SelectItem>
                                                            <SelectItem value="go">Go</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {role === 'teacher' && viewingMode === 'teacher' && (
                                                        <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold border-0">
                                                            <Play className="mr-2 h-4 w-4" /> Run
                                                        </Button>
                                                    )}
                                                </div>
                                                <Editor 
                                                    height="100%" 
                                                    theme="vs-dark" 
                                                    path={activeFile?.name} 
                                                    language={activeFile?.language} 
                                                    value={activeFile?.content} 
                                                    onChange={handleWorkspaceChange} 
                                                    options={{ 
                                                        readOnly: isEditorReadOnly, 
                                                        fontSize: 14,
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true
                                                    }} 
                                                />
                                            </div>
                                        </Panel>
                                    </PanelGroup>
                                </Panel>
                                
                                <PanelResizeHandle className="h-1 bg-slate-700/50 hover:bg-cyan-500/50 transition-colors" />
                                
                                {/* Terminal Section */}
                                <Panel defaultSize={isWhiteboardVisible ? 20 : 30} minSize={15}>
                                    <div className="h-full flex flex-col bg-[#0D1117] border-t border-slate-700/50">
                                        <div className="p-3 bg-slate-800/80 text-xs font-bold flex items-center border-b border-slate-700 text-slate-300 tracking-wider uppercase">
                                            <TerminalIcon className="h-4 w-4 mr-2" />
                                            Terminal
                                            {(role === 'student' && (isFrozen || spotlightedStudentId)) && (
                                                <Badge className="ml-2 bg-red-500/20 text-red-300 text-xs border border-red-500/30">
                                                    Read Only
                                                </Badge>
                                            )}
                                        </div>
                                        <div ref={terminalRef} className="flex-grow overflow-hidden" />
                                    </div>
                                </Panel>
                                
                                {/* Whiteboard Section */}
                                {isWhiteboardVisible && (
                                    <>
                                        <PanelResizeHandle className="h-1 bg-slate-700/50 hover:bg-cyan-500/50 transition-colors" />
                                        <Panel defaultSize={20} minSize={15} className="border-t border-slate-700/50">
                                            <WhiteboardPanel 
                                                lines={whiteboardLines} 
                                                isTeacher={role === 'teacher'} 
                                                onDraw={handleDraw} 
                                            />
                                        </Panel>
                                    </>
                                )}
                            </PanelGroup>
                        </div>
                    </Panel>
                    
                    <PanelResizeHandle className="w-1 bg-slate-700/50 hover:bg-cyan-500/50 transition-colors" />
                    
                    {/* Right Panel: Student Roster */}
                    <Panel defaultSize={25} minSize={20} maxSize={35} className="rounded-xl border border-slate-700/80 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                        <RosterPanel
                            role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
                            activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
                            spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
                            assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
                            availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
                            isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
                            controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
                            handleOpenChat={handleOpenChat} unreadMessages={unreadMessages} 
                            localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={null} 
                        />
                    </Panel>
                </PanelGroup>
            </main>

            {/* Floating Video Panel - Integrated and Non-Intrusive */}
            <FloatingVideoPanel
                localVideoRef={localVideoRef}
                remoteUsers={remoteUsers}
                students={students}
                isMinimized={isVideoMinimized}
                onToggleMinimize={() => setIsVideoMinimized(!isVideoMinimized)}
            />

            {/* Chat Panels */}
            {role === 'teacher' && activeChatStudentId && (
                <ChatPanel
                    messages={chatMessages.get(activeChatStudentId) || []} 
                    currentUserId={currentUserId}
                    chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
                    onSendMessage={handleSendMessage} 
                    onClose={() => setActiveChatStudentId(null)}
                />
            )}
            {role === 'student' && isStudentChatOpen && teacherId && (
                <ChatPanel
                    messages={chatMessages.get(teacherId) || []} 
                    currentUserId={currentUserId}
                    chattingWithUsername={"Teacher"} 
                    onSendMessage={handleSendMessage} 
                    onClose={() => setIsStudentChatOpen(false)}
                />
            )}
        </div>
    );
// /*
//  * =================================================================
//  * FOLDER: src/components/classroom/
//  * FILE:   RosterPanel.tsx (CoreZenith V3 - Final, Full Fidelity)
//  * =================================================================
//  * DESCRIPTION: This version implements the CoreZenith "Crew Roster"
//  * design with a guarantee of 100% functional integrity. All student
//  * names, action buttons (including Take Control & Assign Homework),
//  * and conditional logic are correctly preserved and enhanced with a
//  * high-contrast, accessible, and ergonomic UI.
//  */
// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand, Eye, Star, Edit, Lock, MessageCircle } from 'lucide-react';
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';
// import { cn } from "@/lib/utils";

// // --- Type Definitions (100% Original) ---
// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>;
//     handleViewStudentCam: (studentId: string) => void;
//     spotlightedStudentId: string | null;
//     handleSpotlightStudent: (studentId: string | null) => void; 
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
//     controlledStudentId: string | null;
//     handleTakeControl: (studentId: string | null) => void;
//     handleOpenChat: (studentId: string) => void;
//     unreadMessages: Set<string>;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     // --- All Props are preserved and used as intended ---
//     role, students, viewingMode, setViewingMode, activeHomeworkStudents,
//     handsRaised, handleViewStudentCam, spotlightedStudentId, handleSpotlightStudent,
//     assigningToStudentId, setAssigningToStudentId, availableLessons, handleAssignHomework,
//     localVideoRef, remoteVideoRef, remoteStream, isMuted, toggleMute, isCameraOff, toggleCamera,
//     controlledStudentId, handleTakeControl, handleOpenChat, unreadMessages,
// }) => {
//     // This is a direct copy of your original component, with only classNames added/changed.
//     return (
//         <div className="w-full h-full flex flex-col space-y-4 p-0">
//             {role === 'teacher' && (
//                 <div className="flex-shrink-0">
//                     <CardHeader className="p-3">
//                         <CardTitle className="text-base font-bold flex items-center text-slate-100 uppercase tracking-wider">
//                             <Users className="mr-2 h-5 w-5 text-cyan-400"/>Crew Roster
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent className="px-2 space-y-1">
//                         <Button 
//                             onClick={() => { setViewingMode('teacher'); handleSpotlightStudent(null); }} 
//                             variant="ghost" 
//                             className={cn('w-full justify-start p-3 transition-colors', viewingMode === 'teacher' ? 'bg-cyan-500/10 text-cyan-300 font-semibold border-l-2 border-cyan-400' : 'text-slate-300 hover:bg-slate-800 border-l-2 border-transparent')}
//                         >
//                             <Laptop className="mr-3 h-4 w-4"/> My Workspace
//                         </Button>
//                         <Separator className="bg-slate-700 my-2" />
//                         <div className="max-h-[calc(100vh - 450px)] overflow-y-auto pr-1 space-y-1">
//                             {students.map(student => {
//                                 const isControllingThisStudent = controlledStudentId === student.id;
//                                 const isViewingThisStudent = viewingMode === student.id;
//                                 const isSpotlighted = spotlightedStudentId === student.id;
//                                 const hasHandRaised = handsRaised.has(student.id);

//                                 return (
//                                     <div key={student.id} className={cn('p-2 rounded-lg transition-all border border-transparent', hasHandRaised && 'bg-fuchsia-800/20 border-fuchsia-700/50 animate-pulse', isViewingThisStudent && 'bg-slate-800/50')}>
//                                         <div className="flex items-center justify-between">
//                                             {/* Student Name and Status from original code */}
//                                             <Button onClick={() => setViewingMode(student.id)} variant='ghost' className={cn('flex-grow justify-start text-left h-auto py-2 px-2 hover:bg-slate-800', isViewingThisStudent && 'bg-cyan-500/10')}>
//                                                 <div className="flex items-center">
//                                                     {hasHandRaised && <Hand className="mr-2 h-4 w-4 text-fuchsia-400" />}
//                                                     <span className={cn('font-semibold', isViewingThisStudent ? 'text-cyan-300' : 'text-slate-200')}>{student.username}</span>
//                                                 </div>
//                                                 {activeHomeworkStudents.has(student.id) && <Badge className="ml-2 bg-green-500/80 border-none text-white text-xs px-1.5 py-0.5">Live</Badge>}
//                                             </Button>

//                                             {/* Quick Actions from original code */}
//                                             <div className="flex items-center gap-1">
//                                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-700 hover:text-cyan-300 relative" onClick={() => handleOpenChat(student.id)} title={`Chat with ${student.username}`}>
//                                                     <MessageCircle className="h-4 w-4" />
//                                                     {unreadMessages.has(student.id) && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400" />}
//                                                 </Button>
//                                                 <Button variant={isSpotlighted ? "secondary" : "ghost"} size="icon" className={cn('h-8 w-8 text-slate-400 hover:bg-slate-700', isSpotlighted && 'bg-fuchsia-500/20 text-fuchsia-300')} onClick={() => handleSpotlightStudent(isSpotlighted ? null : student.id)} title={isSpotlighted ? "Remove Spotlight" : "Spotlight Student"}>
//                                                     <Star className="h-4 w-4" />
//                                                 </Button>
//                                             </div>
//                                         </div>

//                                         {isViewingThisStudent && (
//                                             <div className="border-t border-slate-700/50 mt-2 pt-2 flex items-center justify-end gap-1">
//                                                 <Button 
//                                                     variant="outline" 
//                                                     size="sm" 
//                                                     className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs border-slate-600" 
//                                                     onClick={() => handleViewStudentCam(student.id)} 
//                                                     title="View Camera"
//                                                 >
//                                                     <Eye className="mr-1.5 h-4 w-4" />Cam
//                                                 </Button>
                                                
//                                                 {/* This button with its conditional icon logic is preserved and restyled for high contrast */}
//                                                 <Button 
//                                                     size="sm" 
//                                                     className={cn(
//                                                         'text-xs font-bold text-white', 
//                                                         isControllingThisStudent 
//                                                             ? 'bg-red-600 hover:bg-red-500' 
//                                                             : 'bg-fuchsia-600 hover:bg-fuchsia-500'
//                                                     )} 
//                                                     onClick={() => handleTakeControl(isControllingThisStudent ? null : student.id)} 
//                                                     title={isControllingThisStudent ? "Release Control" : "Take Control"}
//                                                 >
//                                                     {isControllingThisStudent ? <Lock className="mr-1.5 h-4 w-4" /> : <Edit className="mr-1.5 h-4 w-4" />} 
//                                                     {isControllingThisStudent ? 'Release' : 'Control'}
//                                                 </Button>

//                                                 {/* This "Assign" button is preserved and restyled for high contrast */}
//                                                 <Button 
//                                                     variant="outline" 
//                                                     size="sm" 
//                                                     className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs border-slate-600" 
//                                                     onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}
//                                                 >
//                                                     <BookMarked className="mr-1.5 h-4 w-4"/>Assign
//                                                 </Button>
//                                             </div>
//                                         )}
                                        

//                                         {/* This entire block for the lesson dropdown is preserved from your original code */}
//                                         {assigningToStudentId === student.id && (
//                                             <div className="border-t border-slate-700 mt-2 pt-2 space-y-1">
//                                                 {availableLessons.length > 0 ? availableLessons.map(lesson => (
//                                                     <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start text-slate-300 hover:text-white" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                                 )) : <p className="text-xs text-slate-500 text-center p-2">No available lessons to assign.</p>}
//                                             </div>
//                                         )}
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     </CardContent>
//                 </div>
//             )}
            
//             {/* The video feed section is preserved from your original code */}
//             <div className="flex-grow flex flex-col min-h-0">
//                 <Card className="flex-grow flex flex-col bg-transparent border-none shadow-none">
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-semibold text-slate-300">Remote Feed</CardTitle></CardHeader>
//                     <CardContent className="p-0 flex-grow">
//                         <div className="bg-black rounded-lg aspect-video flex items-center justify-center w-full h-full">
//                             <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
//                             {!remoteStream && <span className="text-xs text-slate-500">Signal Offline</span>}
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>
            
//             <div className="flex-shrink-0">
//                 <Card className="bg-transparent border-none shadow-none">
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-semibold text-slate-300">Local Feed</CardTitle></CardHeader>
//                     <CardContent className="p-0">
//                         <div className="bg-black rounded-lg aspect-video">
//                             <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
//                         </div>
//                     </CardContent>
//                 </Card>
//                 <div className="flex justify-center items-center space-x-3 pt-3">
//                     <Button variant="outline" size="icon" onClick={toggleMute} className={cn('rounded-full h-12 w-12 bg-slate-800/50 border-slate-700 hover:bg-slate-700', isMuted && 'bg-red-600/80 border-red-500 text-white hover:bg-red-500')}>
//                         {isMuted ? <MicOff /> : <Mic />}
//                     </Button>
//                     <Button variant="outline" size="icon" onClick={toggleCamera} className={cn('rounded-full h-12 w-12 bg-slate-800/50 border-slate-700 hover:bg-slate-700', isCameraOff && 'bg-red-600/80 border-red-500 text-white hover:bg-red-500')}>
//                         {isCameraOff ? <VideoOff /> : <Video />}
//                     </Button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand, Eye, Star, Edit, Lock } from 'lucide-react';
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';
// import { MessageCircle } from 'lucide-react';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>;
//     handleViewStudentCam: (studentId: string) => void;
//     spotlightedStudentId: string | null;
//     handleSpotlightStudent: (studentId: string | null) => void; 
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
//     controlledStudentId: string | null;
//     handleTakeControl: (studentId: string | null) => void;
//     handleOpenChat: (studentId: string) => void;
//     unreadMessages: Set<string>;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     handsRaised,
//     handleViewStudentCam,
//     spotlightedStudentId,
//     handleSpotlightStudent,
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
//     controlledStudentId,
//     handleTakeControl,
//     handleOpenChat,
//     unreadMessages,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l bg-white">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button 
//                             onClick={() => { setViewingMode('teacher'); handleSpotlightStudent(null); }} 
//                             variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} 
//                             className="w-full justify-start"
//                         >
//                             <Laptop className="mr-2 h-4 w-4"/> My Workspace
//                         </Button>
//                         <Separator />
//                         {students.map(student => {
//                             const isControllingThisStudent = controlledStudentId === student.id;
//                             const isViewingThisStudent = viewingMode === student.id;
//                             const isSpotlighted = spotlightedStudentId === student.id;

//                             return (
//                                 <div key={student.id} className="p-1">
//                                     <div className="flex items-center justify-between">
//                                         <Button onClick={() => setViewingMode(student.id)} variant={isViewingThisStudent ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left h-auto py-2">
//                                             <div className="flex items-center">
//                                                 {handsRaised.has(student.id) && <Hand className="mr-2 h-4 w-4 text-yellow-500 animate-bounce" />}
//                                                 <span>{student.username}</span>
//                                             </div>
//                                             {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                         </Button>
//                                         <Button 
//                                         variant="outline"
//                                         size="icon" 
//                                         className="h-8 w-8 ml-2 relative" 
//                                         onClick={() => handleOpenChat(student.id)}
//                                         title={`Chat with ${student.username}`}
//                                     >
//                                         <MessageCircle className="h-4 w-4" />
//                                         {unreadMessages.has(student.id) && (
//                                             <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
//                                         )}
//                                     </Button>
                                        
//                                         <Button 
//                                             variant={isControllingThisStudent ? "destructive" : "outline"}
//                                             size="icon" 
//                                             className="h-8 w-8 ml-2" 
//                                             disabled={!isViewingThisStudent}
//                                             onClick={() => handleTakeControl(isControllingThisStudent ? null : student.id)}
//                                             title={isControllingThisStudent ? "Release Control" : "Take Control"}
//                                         >
//                                             {isControllingThisStudent ? <Lock className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
//                                         </Button>
                                        
//                                         <Button 
//                                             variant={isSpotlighted ? "secondary" : "outline"} 
//                                             size="icon" 
//                                             className="h-8 w-8 ml-2" 
//                                             onClick={() => handleSpotlightStudent(isSpotlighted ? null : student.id)}
//                                             title={isSpotlighted ? "Remove Spotlight" : "Spotlight Student"}
//                                         >
//                                             <Star className={`h-4 w-4 ${isSpotlighted ? "text-yellow-500" : ""}`} />
//                                         </Button>
                                        
//                                         <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewStudentCam(student.id)} title="View Camera">
//                                             <Eye className="h-4 w-4" />
//                                         </Button>
//                                         <Button variant="outline" size="sm" className="ml-2" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                     </div>
//                                     {assigningToStudentId === student.id && (
//                                         <div className="border-t mt-2 pt-2 space-y-1">
//                                             {availableLessons.map(lesson => (
//                                                 <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             );
//                         })}
//                     </CardContent>
//                 </Card>
//             )}
            
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };
// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand, Eye, Star, Lock, Edit } from 'lucide-react';
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>;
//     handleViewStudentCam: (studentId: string) => void;
//     spotlightedStudentId: string | null;
//     handleSpotlightStudent: (studentId: string | null) => void; 
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
//     // --- NEW PROPS ---
//     controlledStudentId: string | null;
//     handleTakeControl: (studentId: string | null) => void;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     handsRaised,
//     handleViewStudentCam,
//     spotlightedStudentId,
//     handleSpotlightStudent,
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
//     // --- DESTRUCTURE NEW PROPS ---
//     controlledStudentId,
//     handleTakeControl,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l bg-white">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button onClick={() => { setViewingMode('teacher'); handleSpotlightStudent(null); }} variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} className="w-full justify-start"><Laptop className="mr-2 h-4 w-4"/> My Workspace</Button>
//                         <Separator />
//                         {students.map(student => {
//                             const isControllingThisStudent = controlledStudentId === student.id;
//                             const isViewingThisStudent = viewingMode === student.id;

//                             return (
//                                 <div key={student.id} className="p-1">
//                                     <div className="flex items-center justify-between">
//                                         <Button onClick={() => setViewingMode(student.id)} variant={isViewingThisStudent ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left h-auto py-2">
//                                             <div className="flex items-center">
//                                                 {handsRaised.has(student.id) && <Hand className="mr-2 h-4 w-4 text-yellow-500 animate-bounce" />}
//                                                 <span>{student.username}</span>
//                                             </div>
//                                             {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                         </Button>
                                        
//                                         {/* --- START: MODIFIED/NEW BUTTONS --- */}
//                                         <Button 
//                                             variant={isControllingThisStudent ? "destructive" : "outline"}
//                                             size="icon" 
//                                             className="h-8 w-8 ml-2" 
//                                             // Button is disabled unless the teacher is actively viewing this student
//                                             disabled={!isViewingThisStudent}
//                                             onClick={() => handleTakeControl(isControllingThisStudent ? null : student.id)}
//                                             title={isControllingThisStudent ? "Release Control" : "Take Control"}
//                                         >
//                                             {isControllingThisStudent ? <Lock className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
//                                         </Button>
                                        
//                                         <Button 
//                                             variant={spotlightedStudentId === student.id ? "secondary" : "outline"} 
//                                             size="icon" 
//                                             className="h-8 w-8 ml-2" 
//                                             onClick={() => handleSpotlightStudent(spotlightedStudentId === student.id ? null : student.id)}
//                                             title="Spotlight Student"
//                                         >
//                                             <Star className={`h-4 w-4 ${spotlightedStudentId === student.id ? "text-yellow-500" : ""}`} />
//                                         </Button>
//                                         {/* --- END: MODIFIED/NEW BUTTONS --- */}
                                        
//                                         <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewStudentCam(student.id)} title="View Camera">
//                                             <Eye className="h-4 w-4" />
//                                         </Button>
//                                         <Button variant="outline" size="sm" className="ml-2" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                     </div>
//                                     {assigningToStudentId === student.id && (
//                                         <div className="border-t mt-2 pt-2 space-y-1">
//                                             {availableLessons.map(lesson => (
//                                                 <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             );
//                         })}
//                     </CardContent>
//                 </Card>
//             )}
            
//             {/* Video elements remain unchanged */}
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };

// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand, Eye, Star } from 'lucide-react'; // Import Star icon
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>;
//     handleViewStudentCam: (studentId: string) => void;
//     spotlightedStudentId: string | null; // Add this prop
//     handleSpotlightStudent: (studentId: string | null) => void; // Add this prop
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     handsRaised,
//     handleViewStudentCam,
//     spotlightedStudentId, // Destructure the new prop
//     handleSpotlightStudent, // Destructure the new prop
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l bg-white">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button onClick={() => { setViewingMode('teacher'); handleSpotlightStudent(null); }} variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} className="w-full justify-start"><Laptop className="mr-2 h-4 w-4"/> My Workspace</Button>
//                         <Separator />
//                         {students.map(student => (
//                             <div key={student.id} className="p-1">
//                                 <div className="flex items-center justify-between">
//                                     <Button onClick={() => setViewingMode(student.id)} variant={viewingMode === student.id ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left h-auto py-2">
//                                         <div className="flex items-center">
//                                             {handsRaised.has(student.id) && <Hand className="mr-2 h-4 w-4 text-yellow-500 animate-bounce" />}
//                                             <span>{student.username}</span>
//                                         </div>
//                                         {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                     </Button>
//                                     {/* NEW: "Spotlight" button for the teacher */}
//                                     <Button 
//                                         variant={spotlightedStudentId === student.id ? "secondary" : "outline"} 
//                                         size="icon" 
//                                         className="h-8 w-8 ml-2" 
//                                         onClick={() => handleSpotlightStudent(spotlightedStudentId === student.id ? null : student.id)}
//                                     >
//                                         <Star className={`h-4 w-4 ${spotlightedStudentId === student.id ? "text-yellow-500" : ""}`} />
//                                     </Button>
//                                     <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewStudentCam(student.id)}>
//                                         <Eye className="h-4 w-4" />
//                                     </Button>
//                                     <Button variant="outline" size="sm" className="ml-2" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                 </div>
//                                 {assigningToStudentId === student.id && (
//                                     <div className="border-t mt-2 pt-2 space-y-1">
//                                         {availableLessons.map(lesson => (
//                                             <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                         ))}
//                     </CardContent>
//                 </Card>
//             )}
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };

// // src/components/classroom/RosterPanel.tsx

// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand, Eye } from 'lucide-react'; // Import Eye icon
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>;
//     handleViewStudentCam: (studentId: string) => void; // Add this prop
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     handsRaised,
//     handleViewStudentCam, // Destructure the new prop
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l bg-white">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button onClick={() => setViewingMode('teacher')} variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} className="w-full justify-start"><Laptop className="mr-2 h-4 w-4"/> My Workspace</Button>
//                         <Separator />
//                         {students.map(student => (
//                             <div key={student.id} className="p-1">
//                                 <div className="flex items-center justify-between">
//                                     <Button onClick={() => setViewingMode(student.id)} variant={viewingMode === student.id ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left h-auto py-2">
//                                         <div className="flex items-center">
//                                             {handsRaised.has(student.id) && <Hand className="mr-2 h-4 w-4 text-yellow-500 animate-bounce" />}
//                                             <span>{student.username}</span>
//                                         </div>
//                                         {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                     </Button>
//                                     {/* NEW: "View Cam" button for the teacher */}
//                                     <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewStudentCam(student.id)}>
//                                         <Eye className="h-4 w-4" />
//                                     </Button>
//                                     <Button variant="outline" size="sm" className="ml-2" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                 </div>
//                                 {assigningToStudentId === student.id && (
//                                     <div className="border-t mt-2 pt-2 space-y-1">
//                                         {availableLessons.map(lesson => (
//                                             <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                         ))}
//                     </CardContent>
//                 </Card>
//             )}
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };

// // src/components/classroom/RosterPanel.tsx

// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop, Hand } from 'lucide-react'; // Import Hand icon
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     handsRaised: Set<string>; // Add this prop
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     handsRaised, // Destructure the new prop
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l bg-white">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button onClick={() => setViewingMode('teacher')} variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} className="w-full justify-start"><Laptop className="mr-2 h-4 w-4"/> My Workspace</Button>
//                         <Separator />
//                         {students.map(student => (
//                             <div key={student.id} className="p-1">
//                                 <div className="flex items-center justify-between">
//                                     <Button onClick={() => setViewingMode(student.id)} variant={viewingMode === student.id ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left h-auto py-2">
//                                         <div className="flex items-center">
//                                             {/* NEW: Conditionally render Hand icon */}
//                                             {handsRaised.has(student.id) && <Hand className="mr-2 h-4 w-4 text-yellow-500 animate-bounce" />}
//                                             <span>{student.username}</span>
//                                         </div>
//                                         {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                     </Button>
//                                     <Button variant="outline" size="sm" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                 </div>
//                                 {assigningToStudentId === student.id && (
//                                     <div className="border-t mt-2 pt-2 space-y-1">
//                                         {availableLessons.map(lesson => (
//                                             <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                         ))}
//                     </CardContent>
//                 </Card>
//             )}
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };
// // src/components/classroom/RosterPanel.tsx

// import React from 'react';
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Badge } from "@/components/ui/badge";
// import { Mic, MicOff, Video, VideoOff, Users, BookMarked, Laptop } from 'lucide-react';
// import { UserRole, ViewingMode, Student, Lesson } from '../../types';

// interface RosterPanelProps {
//     role: UserRole;
//     students: Student[];
//     viewingMode: ViewingMode;
//     setViewingMode: (mode: ViewingMode) => void;
//     activeHomeworkStudents: Set<string>;
//     assigningToStudentId: string | null;
//     setAssigningToStudentId: (id: string | null) => void;
//     availableLessons: Lesson[];
//     handleAssignHomework: (studentId: string, lessonId: number | string) => void;
//     localVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteVideoRef: React.RefObject<HTMLVideoElement>;
//     remoteStream: MediaStream | null;
//     isMuted: boolean;
//     toggleMute: () => void;
//     isCameraOff: boolean;
//     toggleCamera: () => void;
// }

// export const RosterPanel: React.FC<RosterPanelProps> = ({
//     role,
//     students,
//     viewingMode,
//     setViewingMode,
//     activeHomeworkStudents,
//     assigningToStudentId,
//     setAssigningToStudentId,
//     availableLessons,
//     handleAssignHomework,
//     localVideoRef,
//     remoteVideoRef,
//     remoteStream,
//     isMuted,
//     toggleMute,
//     isCameraOff,
//     toggleCamera,
// }) => {
//     return (
//         <aside className="w-full h-full flex flex-col p-4 space-y-4 border-l">
//             {role === 'teacher' && (
//                 <Card>
//                     <CardHeader className="p-3"><CardTitle className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Student Roster</CardTitle></CardHeader>
//                     <CardContent className="p-2 space-y-1">
//                         <Button onClick={() => setViewingMode('teacher')} variant={viewingMode === 'teacher' ? 'secondary' : 'ghost'} className="w-full justify-start"><Laptop className="mr-2 h-4 w-4"/> My Workspace</Button>
//                         <Separator />
//                         {students.map(student => (
//                             <div key={student.id} className="p-1">
//                                 <div className="flex items-center justify-between">
//                                     <Button onClick={() => setViewingMode(student.id)} variant={viewingMode === student.id ? 'secondary' : 'ghost'} className="flex-grow justify-start text-left">
//                                         {student.username}
//                                         {activeHomeworkStudents.has(student.id) && <Badge variant="secondary" className="ml-2 bg-green-500 text-white">Live</Badge>}
//                                     </Button>
//                                     <Button variant="outline" size="sm" onClick={() => setAssigningToStudentId(assigningToStudentId === student.id ? null : student.id)}><BookMarked className="mr-2 h-4 w-4"/>Assign</Button>
//                                 </div>
//                                 {assigningToStudentId === student.id && (
//                                     <div className="border-t mt-2 pt-2 space-y-1">
//                                         {availableLessons.map(lesson => (
//                                             <Button key={lesson.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAssignHomework(student.id, lesson.id)}>{lesson.title}</Button>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                         ))}
//                     </CardContent>
//                 </Card>
//             )}
//             <Card className="flex-grow"><CardHeader className="p-3"><CardTitle className="text-sm">Remote User</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video flex items-center justify-center"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />{!remoteStream && <span className="text-xs">Waiting...</span>}</div></CardContent></Card>
//             <Card><CardHeader className="p-3"><CardTitle className="text-sm">My Camera</CardTitle></CardHeader><CardContent className="p-0"><div className="bg-black rounded-b-lg aspect-video"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></CardContent></Card>
//             <div className="flex justify-center items-center space-x-3 pt-2">
//                 <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">{isMuted ? <MicOff /> : <Mic />}</Button>
//                 <Button variant="outline" size="icon" onClick={toggleCamera} className="rounded-full h-12 w-12">{isCameraOff ? <VideoOff /> : <Video />}</Button>
//             </div>
//         </aside>
//     );
// };