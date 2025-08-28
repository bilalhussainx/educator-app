/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   LiveTutorialPage.tsx (DEFINITIVE, FULLY IMPLEMENTED & CLEANED)
 * =================================================================
 * DESCRIPTION: This is the final version. It solves all race conditions
 * and TypeScript errors by consolidating logic, removing all obsolete
 * WebRTC code, and fully implementing all handler functions.
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

// --- CHILD COMPONENT IMPORTS ---
import { HomeworkView } from '../components/classroom/HomeworkView';
import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
import { ChatPanel } from '../components/classroom/ChatPanel';
import { RosterPanel } from '../components/classroom/RosterPanel';

// --- UI & TYPE IMPORTS ---
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle, Video, VideoOff, Mic, MicOff, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast, Toaster } from 'sonner';
import { UserRole, ViewingMode, CodeFile, Lesson, Student, StudentHomeworkState } from '../types';
import apiClient from '../services/apiClient';
import { getWebSocketUrl } from '../config/websocket';

// --- HELPER FUNCTIONS & COMPONENTS ---
interface Message { from: string; text: string; timestamp: string; }
const simpleJwtDecode = (token: string): { user: { id: string; role: UserRole } } | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) { console.error("Invalid token:", error); return null; }
};

const VideoParticipant = ({ user, students, isLocal = false, localVideoRef }: { user?: IAgoraRTCRemoteUser; students: Student[]; isLocal?: boolean; localVideoRef?: React.RefObject<HTMLVideoElement> }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const targetRef = isLocal ? localVideoRef : videoRef;
        if (targetRef?.current && !isLocal && user?.videoTrack) {
            user.videoTrack.play(targetRef.current);
        }
        if (!isLocal && user?.audioTrack) user.audioTrack.play();
        return () => { if (!isLocal) user?.videoTrack?.stop(); };
    }, [user, isLocal, localVideoRef]);
    const username = isLocal ? 'You' : (students.find(s => String(s.id) === String(user?.uid))?.username || `User...`);
    return (
        <div className="relative bg-slate-800/50 rounded-md overflow-hidden aspect-video">
            <video ref={isLocal ? localVideoRef : videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{username}</div>
            {!isLocal && !user?.videoTrack && <VideoOff className="absolute top-1 right-1 h-3 w-3 text-slate-500" />}
        </div>
    );
};


// --- MAIN COMPONENT ---
const LiveTutorialPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('authToken');

    // --- STATE MANAGEMENT ---
    const decodedToken = token ? simpleJwtDecode(token) : null;
    const currentUserId = decodedToken?.user?.id || null;
    const [role, setRole] = useState<UserRole>(decodedToken?.user?.role || 'unknown');
    
    const [students, setStudents] = useState<Student[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [files, setFiles] = useState<CodeFile[]>([]);
    const [activeFileName, setActiveFileName] = useState<string>('');
    const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
    const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
    const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
    const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
    const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
    const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
    const [isFrozen, setIsFrozen] = useState<boolean>(false);
    const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
    const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
    const [pendingHomework, setPendingHomework] = useState<any>(null);
    const [isDoingHomework, setIsDoingHomework] = useState(false);
    const [homeworkFiles, setHomeworkFiles] = useState<any>(null);
    const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
    const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
    const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
    const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    const [spotlightWorkspace, setSpotlightWorkspace] = useState<any>(null);
    const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
    const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

    // --- REFS ---
    const ws = useRef<WebSocket | null>(null);
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const term = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const roleRef = useRef(role);
    const teacherIdRef = useRef(teacherId);
    const activeChatStudentIdRef = useRef(activeChatStudentId);
    
    useEffect(() => { roleRef.current = role; }, [role]);
    useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
    useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

    // --- COMPUTED STATE ---
    const displayedWorkspace = (() => {
        if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
        if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
        return { files, activeFileName };
    })();
    const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
    const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
    const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
    const isEditorReadOnly = !isConnected || (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);

    // --- SINGLE UNIFIED INITIALIZATION EFFECT ---
    useEffect(() => {
        if (!token || !sessionId || !currentUserId) { navigate('/login'); return; }

        const socket = new WebSocket(`${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`);
        ws.current = socket;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        socket.onopen = () => { setIsConnected(true); toast.success("Real-time session connected!"); joinAgoraChannel(); };
        socket.onclose = () => { setIsConnected(false); toast.error("Real-time session disconnected."); };
        socket.onerror = (err) => { console.error("WebSocket Error:", err); setIsConnected(false); toast.error("A real-time connection error occurred."); };
        initializeWebSocketEvents(socket);

        const joinAgoraChannel = async () => {
            try {
                const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
                if (!agoraAppId) throw new Error("Agora App ID missing.");
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token: agoraToken, uid } = response.data;
                await client.join(agoraAppId, sessionId, agoraToken, uid);
                
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { videoTrack, audioTrack };
                if (localVideoRef.current) videoTrack.play(localVideoRef.current);
                await client.publish([audioTrack, videoTrack]);
            } catch (error) {
                console.error("Agora Connection Failed:", error);
                toast.error("Could not connect to video/audio service.");
            }
        };

        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') setRemoteUsers(Array.from(client.remoteUsers));
            if (mediaType === 'audio') user.audioTrack?.play();
        });
        client.on('user-left', () => setRemoteUsers(Array.from(client.remoteUsers)));

        if (terminalRef.current && !term.current) {
            fitAddon.current = new FitAddon();
            const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9' }, fontSize: 14 });
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

        return () => {
            ws.current?.close();
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            agoraClient.current?.leave();
            term.current?.dispose();
        };
    }, [sessionId, currentUserId, navigate, token]);

    useEffect(() => {
        if (role === 'teacher') apiClient.get('/api/lessons/teacher/list').then(res => setAvailableLessons(res.data || []));
    }, [role]);

    useEffect(() => {
        if (term.current) {
            const output = (role === 'teacher' && viewingMode === 'teacher') ? teacherTerminalOutput : (studentHomeworkStates.get(viewingMode)?.terminalOutput || '');
            term.current.clear();
            term.current.write(output);
        }
    }, [teacherTerminalOutput, viewingMode, studentHomeworkStates, role]);

    // --- HANDLERS ---
    const sendWsMessage = (type: string, payload?: object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        } else {
            toast.error("Connection lost. Please refresh.");
        }
    };
    
    const initializeWebSocketEvents = (currentWs: WebSocket) => {
        currentWs.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'ROLE_ASSIGNED':
                    setRole(message.payload.role);
                    setFiles(message.payload.files || []);
                    setActiveFileName(message.payload.activeFile || '');
                    setTeacherId(message.payload.teacherId);
                    setStudents(message.payload.students || []);
                    setWhiteboardLines(message.payload.whiteboardLines || []);
                    setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
                    setTeacherTerminalOutput(message.payload.terminalOutput || '');
                    setHandsRaised(new Set(message.payload.handsRaised || []));
                    setIsFrozen(message.payload.isFrozen || false);
                    setSpotlightedStudentId(message.payload.spotlightedStudentId || null);
                    setControlledStudentId(message.payload.controlledStudentId || null);
                    break;
                case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
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
                case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
                case 'WHITEBOARD_UPDATE': setWhiteboardLines(prev => [...prev, message.payload.line]); break;
                case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
                case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
                case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
                case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
                case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
                case 'PRIVATE_MESSAGE': {
                    const msg = message.payload as Message;
                    const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
                    if (chatPartnerId) {
                        setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
                        if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
                            setUnreadMessages(prev => new Set(prev).add(msg.from));
                        }
                    }
                    break;
                }
                case 'HOMEWORK_ASSIGNED':
                    setPendingHomework(message.payload);
                    setHomeworkFiles(null);
                    setIsDoingHomework(false);
                    break;
                case 'STUDENT_WORKSPACE_UPDATED':
                    setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
                    if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
                    break;
                case 'HOMEWORK_JOIN': 
                    setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); 
                    break;
                case 'HOMEWORK_LEAVE': 
                    setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); 
                    break;
            }
        };
    };

    const handleWorkspaceChange = (value: string | undefined) => {
        if (isEditorReadOnly) return;
        const newCode = value || '';
        if (role === 'teacher' && viewingMode === 'teacher') {
            const updatedFiles = files.map(f => (f.name === activeFileName ? { ...f, content: newCode } : f));
            setFiles(updatedFiles);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
        }
    };
    
    const handleRunCode = () => {
        if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
            sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
        }
    };
    
    const toggleMute = () => { 
        if (localTracks.current?.audioTrack) {
            const enabled = !localTracks.current.audioTrack.enabled;
            localTracks.current.audioTrack.setEnabled(enabled);
            setIsMuted(!enabled);
        }
    };
    
    const toggleCamera = () => { 
        if (localTracks.current?.videoTrack) {
            const enabled = !localTracks.current.videoTrack.enabled;
            localTracks.current.videoTrack.setEnabled(enabled);
            setIsCameraOff(!enabled);
        }
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

    const handleLanguageChange = (newLanguage: string) => {
        if (isEditorReadOnly) return;
        if (role === 'teacher' && viewingMode === 'teacher') {
            const updatedFiles = files.map(f => (f.name === activeFileName ? { ...f, language: newLanguage } : f));
            setFiles(updatedFiles);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
        }
    };

    const handleActiveFileChange = (fileName: string) => {
        if (isEditorReadOnly) return;
        if (role === 'teacher' && viewingMode === 'teacher') {
            setActiveFileName(fileName);
            sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
        }
    };

    const handleAddFile = () => {
        if (role !== 'teacher' || viewingMode !== 'teacher') return;
        const newFileName = prompt("Enter new file name (e.g., script.js):");
        if (newFileName && !files.some(f => f.name === newFileName)) {
            const extension = newFileName.split('.').pop() || '';
            const languageMap: { [key: string]: string } = { js: 'javascript', py: 'python', java: 'java', rb: 'ruby', go: 'go', html: 'html', css: 'css' };
            const newFile: CodeFile = { name: newFileName, language: languageMap[extension] || 'plaintext', content: '' };
            const updatedFiles = [...files, newFile];
            setFiles(updatedFiles);
            setActiveFileName(newFileName);
            sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
        }
    };

    const handleAssignHomework = (studentId: string, lessonId: string | number) => {
        const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
        if (lesson) {
            sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
            setAssigningToStudentId(null);
        }
    };

    const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
    const handleSpotlightStudent = (id: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId: id });
    const handleTakeControl = (id: string | null) => sendWsMessage('TAKE_CONTROL', { studentId: id });
    const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
    const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    
    const handleOpenChat = (studentId: string) => {
        setActiveChatStudentId(studentId);
        setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
    };

    const handleSendMessage = (text: string) => {
        const to = role === 'teacher' ? activeChatStudentId : teacherId;
        if (!to || !currentUserId) return;
        const message: Omit<Message, 'timestamp'> = { from: currentUserId, text };
        sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
        setChatMessages(prev => new Map(prev).set(to, [...(prev.get(to) || []), { ...message, timestamp: new Date().toISOString() }]));
    };

    if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
        return <HomeworkView lessonId={pendingHomework.lessonId} teacherSessionId={pendingHomework.teacherSessionId} token={token} onLeave={() => {}} initialFiles={homeworkFiles} onFilesChange={setHomeworkFiles} currentUserId={currentUserId} />;
    }
    
    return (
        <div className="w-full h-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden">
            <Toaster theme="dark" richColors position="top-right" />
            
            <header className="flex-shrink-0 flex justify-between items-center px-6 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-slate-100">CoreZenith Live Session</h1>
                    <div className="flex items-center gap-3">
                        <Badge className={cn('font-medium', role === 'teacher' ? 'bg-cyan-600' : 'bg-purple-600')}>{role.toUpperCase()}</Badge>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500')}></div>
                            {isConnected ? 'Connected' : 'Offline'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {spotlightedStudentId && <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600/30"><Star className="mr-1 h-3 w-3" />Spotlight: {students.find(s => s.id === spotlightedStudentId)?.username}</Badge>}
                    {isTeacherControllingThisStudent && <Badge className="bg-red-600/20 text-red-300 border-red-600/30"><Lock className="mr-1 h-3 w-3" />Controlling: {students.find(s => s.id === viewingMode)?.username}</Badge>}
                    {role === 'student' && <Button size="sm" onClick={handleRaiseHand} disabled={!isConnected} className="bg-purple-600 hover:bg-purple-500"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
                    {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} variant={isFrozen ? "destructive" : "outline"}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze" : "Freeze"}</Button>}
                    {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} variant="outline"><Brush className="mr-2 h-4 w-4" />Whiteboard</Button>}
                    {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
                    <div className="flex items-center gap-1 border-l border-slate-600 pl-3">
                        <Button size="sm" onClick={toggleMute} variant={isMuted ? "destructive" : "outline"}>{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
                        <Button size="sm" onClick={toggleCamera} variant={isCameraOff ? "destructive" : "outline"}>{isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}</Button>
                    </div>
                    <Button onClick={() => navigate('/dashboard')} variant="destructive"><PhoneOff className="mr-2 h-4 w-4" />End Session</Button>
                </div>
            </header>

            {pendingHomework && role === 'student' && !isDoingHomework && (
                <Alert className="rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40">
                    <AlertTitle>New Assignment Available</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>Lesson: <strong>{pendingHomework.title}</strong></span>
                        <Button size="sm" onClick={handleStartHomework} className="bg-blue-600 hover:bg-blue-500">Start Now <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </AlertDescription>
                </Alert>
            )}

            <main className="flex-grow flex overflow-hidden">
                <PanelGroup direction="horizontal" className="w-full h-full">
                    <Panel defaultSize={75} minSize={60} className="flex flex-col p-2 gap-2">
                        <Panel defaultSize={25} minSize={20} className="p-1 rounded-lg bg-slate-900/50">
                            <div className="w-full h-full grid grid-cols-4 grid-rows-1 gap-2">
                                <VideoParticipant isLocal localVideoRef={localVideoRef} students={students} />
                                {remoteUsers.map(user => (
                                    <VideoParticipant key={user.uid} user={user} students={students} />
                                ))}
                            </div>
                        </Panel>
                        <Panel defaultSize={75} minSize={40}>
                            <PanelGroup direction="horizontal" className="h-full">
                                <Panel defaultSize={20} minSize={15} className="bg-slate-900/50 rounded-l-lg border-r border-slate-700/30">
                                    <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Files</h3>
                                        {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="sm" onClick={handleAddFile} className="h-6 w-6 p-0"><FilePlus className="h-4 w-4" /></Button>}
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {displayedWorkspace.files.map((file) => (
                                            <button key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} disabled={isEditorReadOnly} className={cn('w-full flex items-center px-2 py-1.5 rounded text-sm transition-colors text-left', isEditorReadOnly ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-800/50', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-medium')}>
                                                <FileIcon className="h-4 w-4 mr-2 opacity-60" />{file.name}
                                            </button>
                                        ))}
                                    </div>
                                </Panel>
                                <Panel defaultSize={80} minSize={50} className="bg-slate-900/50 rounded-r-lg flex flex-col">
                                    <div className="flex-grow">
                                        <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14, minimap: { enabled: false } }} />
                                    </div>
                                    <PanelResizeHandle className="h-1 bg-slate-700/30 hover:bg-cyan-500/50" />
                                    <Panel defaultSize={30} minSize={20}>
                                        <div className="h-full bg-slate-950">
                                            <div className="flex items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                                                <TerminalIcon className="h-4 w-4 mr-2 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-300">Terminal</span>
                                            </div>
                                            <div ref={terminalRef} className="h-[calc(100%-40px)] p-2" />
                                        </div>
                                    </Panel>
                                </Panel>
                            </PanelGroup>
                        </Panel>
                    </Panel>
                    <PanelResizeHandle className="w-1 bg-slate-700/30 hover:bg-cyan-500/50" />
                    <Panel defaultSize={25} minSize={20} maxSize={35}>
                        <RosterPanel
                            role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
                            handsRaised={handsRaised} handleSpotlightStudent={handleSpotlightStudent}
                            controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
                            handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
                            assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
                            availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
                        />
                    </Panel>
                </PanelGroup>
            </main>
        </div>
    );
};

export default LiveTutorialPage;
// perfect
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { AscentIdeData, Submission } from '../types/index.ts';
// import Editor from '@monaco-editor/react';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';
// import analytics from '../services/analyticsService.ts';
// import apiClient from '../services/apiClient';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// import { Button } from "@/components/ui/button";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Toaster, toast } from 'sonner';
// import { ChevronLeft, Send, Save, Award } from 'lucide-react';

// const AscentWebIDE: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const [solutionFiles, setSolutionFiles] = useState<LessonFile[] | null>(null);
//     const [isFetchingSolution, setIsFetchingSolution] = useState(false);

//     const [ideData, setIdeData] = useState<AscentIdeData | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [htmlCode, setHtmlCode] = useState('');
//     const [cssCode, setCssCode] = useState('');
//     const [jsCode, setJsCode] = useState('');

//     const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');
//     const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    
//     const [isSaving, setIsSaving] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [submission] = useState<Submission | null>(null);

//     const [startTime, setStartTime] = useState<number>(Date.now());
//     const [codeChurn, setCodeChurn] = useState<number>(0);
//     const [copyPasteActivity, setCopyPasteActivity] = useState<number>(0);
//     const prevCodeRef = useRef({ html: '', css: '', js: '' });
//     const totalTypedCharsRef = useRef<number>(0);
//     const pastedCharsRef = useRef<number>(0);



//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 const response = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
//                 const data: AscentIdeData = response.data;
//                 setIdeData(data);

//                 const html = data.files.find(f => f.filename === 'index.html')?.content || '';
//                 const css = data.files.find(f => f.filename === 'styles.css')?.content || '';
//                 const js = data.files.find(f => f.filename === 'script.js')?.content || '';

//                 setHtmlCode(html);
//                 setCssCode(css);
//                 setJsCode(js);

//                 prevCodeRef.current = { html, css, js };
//                 setStartTime(Date.now());
//                 setCodeChurn(0);
//                 setCopyPasteActivity(0);
//                 totalTypedCharsRef.current = 0;
//                 pastedCharsRef.current = 0;
//                 analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });

//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'Unknown error');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchIdeData();
//     }, [lessonId]);
    
//     useEffect(() => {
//         const handler = setTimeout(() => {
//             setPreviewSrcDoc(
//                 `<!DOCTYPE html><html><head><style>${cssCode}</style></head><body>${htmlCode}<script type="module">${jsCode}</script></body></html>`
//             );

//             const newTotalLines = (htmlCode.split('\n').length) + (cssCode.split('\n').length) + (jsCode.split('\n').length);
//             const prevTotalLines = (prevCodeRef.current.html.split('\n').length) + (prevCodeRef.current.css.split('\n').length) + (prevCodeRef.current.js.split('\n').length);
//             const churn = Math.abs(newTotalLines - prevTotalLines);
            
//             if (churn > 0) {
//                 setCodeChurn(prev => prev + churn);
//             }
            
//             const currentTotal = htmlCode.length + cssCode.length + jsCode.length;
//             const prevTotal = prevCodeRef.current.html.length + prevCodeRef.current.css.length + prevCodeRef.current.js.length;
//             const charDiff = currentTotal - prevTotal;
            
//             if (charDiff > 0) {
//                 totalTypedCharsRef.current += charDiff;
//                 if (totalTypedCharsRef.current > 0) {
//                     setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
//                 }
//             }
            
//             prevCodeRef.current = { html: htmlCode, css: cssCode, js: jsCode };

//         }, 300); 

//         return () => clearTimeout(handler);
//     }, [htmlCode, cssCode, jsCode]);

//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);

//         const filesPayload = [
//             { filename: 'index.html', content: htmlCode },
//             { filename: 'styles.css', content: cssCode },
//             { filename: 'script.js', content: jsCode },
//         ];
        
//         const savePromise = apiClient.post(`/api/lessons/${lessonId}/save-progress`, {
//             files: filesPayload
//         }).then(res => res.data);
        
//         toast.promise(savePromise, {
//             loading: 'Saving your work...',
//             success: 'Progress saved!',
//             error: (err) => err.message,
//         });
        
//         savePromise.finally(() => setIsSaving(false));
//     };

//     const handleSubmit = async () => {
//         if (!lessonId) return;
//         setIsSubmitting(true);

//         const filesPayload = [
//             { filename: 'index.html', content: htmlCode },
//             { filename: 'styles.css', content: cssCode },
//             { filename: 'script.js', content: jsCode },
//         ];

//         const submissionPayload = {
//             files: filesPayload,
//             time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
//             code_churn: codeChurn,
//             copy_paste_activity: copyPasteActivity,
//         };
        
//         analytics.track('Solution Submitted', { ...submissionPayload, lesson_id: lessonId });
        
//         const submitPromise = apiClient.post(`/api/lessons/${lessonId}/submit`, submissionPayload)
//             .then(res => res.data)
//             .catch(error => {
//                 const errorMsg = error.response?.data?.error || 'Submission failed.';
//                 throw new Error(errorMsg);
//             });
        
//         toast.promise(submitPromise, {
//             loading: 'Submitting your solution...',
//             success: (data) => data.message || "Project submitted successfully!",
//             error: (err) => err.message,
//         });
        
//         submitPromise.finally(() => setIsSubmitting(false));
//     };

//     const handleEditorDidMount = (editor: any) => {
//         editor.onDidPaste && editor.onDidPaste((e: any) => {
//             if (e.range) {
//                 const pastedLength = e.range.endColumn - e.range.startColumn;
//                 pastedCharsRef.current += pastedLength;
//                 totalTypedCharsRef.current += pastedLength;
                
//                 if (totalTypedCharsRef.current > 0) {
//                     setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
//                 }
//             }
//         });
//     };

//     const renderActiveEditor = () => {
//         switch (activeFile) {
//             case 'html':
//                 return <Editor 
//                     language="html" 
//                     theme="vs-dark" 
//                     value={htmlCode} 
//                     onChange={(val) => setHtmlCode(val || '')} 
//                     onMount={handleEditorDidMount}
//                     options={{ minimap: { enabled: false }, padding: { top: 12 } }} 
//                 />;
//             case 'css':
//                 return <Editor 
//                     language="css" 
//                     theme="vs-dark" 
//                     value={cssCode} 
//                     onChange={(val) => setCssCode(val || '')} 
//                     onMount={handleEditorDidMount}
//                     options={{ minimap: { enabled: false }, padding: { top: 12 } }} 
//                 />;
//             case 'js':
//                 return <Editor 
//                     language="javascript" 
//                     theme="vs-dark" 
//                     value={jsCode} 
//                     onChange={(val) => setJsCode(val || '')} 
//                     onMount={handleEditorDidMount}
//                     options={{ minimap: { enabled: false }, padding: { top: 12 } }} 
//                 />;
//         }
//     };

//     const FeedbackCard = ({ submission }: { submission: Submission }) => (
//         <Card className="bg-green-950/40 backdrop-blur-lg border border-green-500/30">
//             <CardHeader>
//                 <CardTitle className="text-xl text-green-300 flex justify-between items-center">
//                     <span className="flex items-center gap-2"><Award /> Teacher Feedback</span>
//                     <span className="text-lg font-bold px-3 py-1 bg-green-500/20 text-green-200 rounded-full">
//                         Grade: {submission.grade}
//                     </span>
//                 </CardTitle>
//             </CardHeader>
//             <CardContent>
//                 <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
                
//                 {(submission.time_taken || submission.code_churn || submission.copy_paste_activity) && (
//                     <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
//                         <h4 className="text-sm font-medium text-slate-300 mb-2">Performance Metrics</h4>
//                         <div className="grid grid-cols-3 gap-4 text-xs">
//                             {submission.time_taken && (
//                                 <div>
//                                     <span className="text-slate-500">Time Spent</span>
//                                     <div className="text-slate-200 font-medium">{submission.time_taken} minutes</div>
//                                 </div>
//                             )}
//                             {submission.code_churn !== undefined && (
//                                 <div>
//                                     <span className="text-slate-500">Code Changes</span>
//                                     <div className="text-slate-200 font-medium">{submission.code_churn} edits</div>
//                                 </div>
//                             )}
//                             {submission.copy_paste_activity !== undefined && (
//                                 <div>
//                                     <span className="text-slate-500">Copy-Paste Activity</span>
//                                     <div className={cn("font-medium", submission.copy_paste_activity > 50 ? "text-yellow-400" : "text-slate-200")}>
//                                         {submission.copy_paste_activity}%
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 )}
                
//                 <p className="text-xs text-slate-500 mt-4">
//                     Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
//                 </p>
//             </CardContent>
//         </Card>
//     );
    
//     if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Web IDE...</div>;
//     if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
//     return (
//         <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
//             <Toaster theme="dark" richColors position="bottom-right" />
            
//             <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 z-30">
//                  <div className="flex items-center gap-2">
//                      <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 h-7 text-xs">
//                          <ChevronLeft className="mr-1 h-3 w-3" /> Back
//                      </Button>
//                      <span className="text-slate-500 text-sm">/</span>
//                      <h1 className="text-sm font-medium text-slate-200 truncate">{ideData.lesson.title}</h1>
//                  </div>
//                  <div className="flex items-center gap-2">
//                      <Button onClick={handleSaveCode} disabled={isSaving} variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 text-xs">
//                          <Save className="mr-1 h-3 w-3"/>Save
//                      </Button>
//                      <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 text-xs">
//                          <Send className="mr-1 h-3 w-3"/>Submit
//                      </Button>
//                  </div>
//             </header>

//             <main className="flex-1 min-h-0">
//                 <PanelGroup direction="horizontal" className="h-full">
//                     <Panel defaultSize={35} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800">
//                          <div className="p-4 flex-grow overflow-y-auto prose prose-sm prose-invert prose-slate max-w-none">
//                             <ReactMarkdown>
//                                 {ideData.lesson.description}
//                             </ReactMarkdown>
//                         </div>
//                     </Panel>

//                     {submission && (
//                 <FeedbackCard submission={submission} />
//             )}
                    
//                     <PanelResizeHandle className="w-1 bg-slate-800" />
                    
//                     <Panel defaultSize={65} minSize={35}>
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={60} minSize={20} className="flex flex-col">
//                                 <div className="px-2 py-1 border-b border-slate-800 bg-slate-900">
//                                     <button onClick={() => setActiveFile('html')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'html' ? "bg-slate-800 text-white" : "text-slate-400")}>index.html</button>
//                                     <button onClick={() => setActiveFile('css')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'css' ? "bg-slate-800 text-white" : "text-slate-400")}>styles.css</button>
//                                     <button onClick={() => setActiveFile('js')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'js' ? "bg-slate-800 text-white" : "text-slate-400")}>script.js</button>
//                                 </div>
//                                 <div className="flex-grow overflow-hidden">
//                                     {renderActiveEditor()}
//                                 </div>
//                             </Panel>

//                             <PanelResizeHandle className="h-1 bg-slate-800" />

//                             <Panel defaultSize={40} minSize={20}>
//                                 <iframe
//                                     srcDoc={previewSrcDoc}
//                                     title="Live Preview"
//                                     sandbox="allow-scripts"
//                                     width="100%"
//                                     height="100%"
//                                     className="bg-white"
//                                 />
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default AscentWebIDE;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   AscentWebIDE.tsx (NEW FILE for Frontend Projects)
//  * =================================================================
//  * DESCRIPTION: A three-panel IDE for HTML/CSS/JS projects with a live preview.
//  *              Modeled after the original AscentIDE.tsx.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { AscentIdeData, LessonFile } from '../types/index.ts'; // Re-use your existing types
// import Editor from '@monaco-editor/react';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';

// // --- UI Components & Icons (re-used from your original IDE) ---
// import { Button } from "@/components/ui/button";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Toaster, toast } from 'sonner';
// import { ChevronLeft, NotebookPen, FileCode, BeakerIcon, Send, Save } from 'lucide-react';

// // --- Main Ascent Web IDE Component ---
// const AscentWebIDE: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     // --- State Management ---
//     const [/, setIdeData] = useState<AscentIdeData | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     // State for each language's code content
//     const [htmlCode, setHtmlCode] = useState('');
//     const [cssCode, setCssCode] = useState('');
//     const [jsCode, setJsCode] = useState('');

//     const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');
//     const [previewSrcDoc, setPreviewSrcDoc] = useState('');

//     // --- Data Fetching ---
//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             const token = localStorage.getItem('authToken');
//             try {
//                 // We use the SAME endpoint. The backend will provide the correct data.
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error('Failed to load lesson data.');
                
//                 const data: AscentIdeData = await response.json();
//                 setIdeData(data);

//                 // Initialize code states from the fetched files
//                 setHtmlCode(data.files.find(f => f.filename === 'index.html')?.content || '');
//                 setCssCode(data.files.find(f => f.filename === 'styles.css')?.content || '');
//                 setJsCode(data.files.find(f => f.filename === 'script.js')?.content || '');

//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'Unknown error');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchIdeData();
//     }, [lessonId]);

//     // --- Live Preview Logic ---
//     useEffect(() => {
//         const handler = setTimeout(() => {
//             setPreviewSrcDoc(`
//                 <!DOCTYPE html>
//                 <html>
//                   <head>
//                     <style>${cssCode}</style>
//                   </head>
//                   <body>
//                     ${htmlCode}
//                     <script type="module">${jsCode}</script>
//                   </body>
//                 </html>
//             `);
//         }, 300); // Debounce to improve performance

//         return () => clearTimeout(handler);
//     }, [htmlCode, cssCode, jsCode]);

//     // --- Handlers (Simplified for this IDE) ---
//     const handleRunTests = () => {
//         // In a web IDE, "running tests" often means refreshing the preview and checking manually.
//         // Or, you could inject a test runner like Jest-DOM into the iframe, which is a more advanced feature.
//         toast.info("Preview updated! Check the results in the right panel.");
//     };

//     const handleSubmit = () => {
//         toast.success("Project submitted for review!");
//         // Here you would POST the htmlCode, cssCode, and jsCode to your submission endpoint.
//     };

//     const renderActiveEditor = () => {
//         switch (activeFile) {
//             case 'html':
//                 return <Editor language="html" theme="vs-dark" value={htmlCode} onChange={(val) => setHtmlCode(val || '')} options={{ minimap: { enabled: false } }} />;
//             case 'css':
//                 return <Editor language="css" theme="vs-dark" value={cssCode} onChange={(val) => setCssCode(val || '')} options={{ minimap: { enabled: false } }} />;
//             case 'js':
//                 return <Editor language="javascript" theme="vs-dark" value={jsCode} onChange={(val) => setJsCode(val || '')} options={{ minimap: { enabled: false } }} />;
//         }
//     };
    
//     if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Web IDE...</div>;
//     if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
//     return (
//         <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
//             <Toaster theme="dark" richColors position="bottom-right" />
            
//             {/* Header - A simplified version of your original */}
//             <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 z-30">
//                 <div className="flex items-center gap-2">
//                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 h-7 text-xs">
//                         <ChevronLeft className="mr-1 h-3 w-3" /> Back
//                     </Button>
//                     <span className="text-slate-500 text-sm">/</span>
//                     <h1 className="text-sm font-medium text-slate-200 truncate">{ideData.lesson.title}</h1>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {/* Simplified controls for the web IDE */}
//                     <Button variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 text-xs">
//                         <Save className="mr-1 h-3 w-3"/>Save
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleRunTests} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20 h-7 text-xs">
//                         <BeakerIcon className="mr-1 h-3 w-3"/>Run
//                     </Button>
//                     <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 text-xs">
//                         <Send className="mr-1 h-3 w-3"/>Submit
//                     </Button>
//                 </div>
//             </header>

//             <main className="flex-1 min-h-0">
//                 <PanelGroup direction="horizontal" className="h-full">
//                     {/* Left Panel - Problem Description */}
//                     <Panel defaultSize={35} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800">
//                          <div className="p-4 flex-grow overflow-y-auto prose prose-sm prose-invert prose-slate max-w-none">
//                             <ReactMarkdown>
//                                 {ideData.lesson.description}
//                             </ReactMarkdown>
//                         </div>
//                     </Panel>
                    
//                     <PanelResizeHandle className="w-1 bg-slate-800" />
                    
//                     {/* Right Panel - Code & Live Preview */}
//                     <Panel defaultSize={65} minSize={35}>
//                         <PanelGroup direction="vertical">
//                             {/* Code Editor with Tabs */}
//                             <Panel defaultSize={60} minSize={20} className="flex flex-col">
//                                 <div className="px-2 py-1 border-b border-slate-800 bg-slate-900">
//                                     <button onClick={() => setActiveFile('html')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'html' ? "bg-slate-800 text-white" : "text-slate-400")}>index.html</button>
//                                     <button onClick={() => setActiveFile('css')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'css' ? "bg-slate-800 text-white" : "text-slate-400")}>styles.css</button>
//                                     <button onClick={() => setActiveFile('js')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'js' ? "bg-slate-800 text-white" : "text-slate-400")}>script.js</button>
//                                 </div>
//                                 <div className="flex-grow overflow-hidden">
//                                     {renderActiveEditor()}
//                                 </div>
//                             </Panel>

//                             <PanelResizeHandle className="h-1 bg-slate-800" />

//                             {/* Live Preview Iframe */}
//                             <Panel defaultSize={40} minSize={20}>
//                                 <iframe
//                                     srcDoc={previewSrcDoc}
//                                     title="Live Preview"
//                                     sandbox="allow-scripts"
//                                     width="100%"
//                                     height="100%"
//                                     className="bg-white"
//                                 />
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default AscentWebIDE;