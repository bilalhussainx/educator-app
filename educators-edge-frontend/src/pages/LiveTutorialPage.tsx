import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { cn } from "@/lib/utils";



// Import child components
import { HomeworkView } from '../components/classroom/HomeworkView';
import { RosterPanel } from '../components/classroom/RosterPanel';
import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
import { ChatPanel } from '../components/classroom/ChatPanel';
import VideoManager from '../components/classroom/VideoManager';
// Import shadcn components and icons
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast, Toaster } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

// Import types and the apiClient
import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';
import apiClient from '../services/apiClient';
// We will not use a separate getWebSocketUrl, but derive it from the apiClient's config
import { getWebSocketUrl } from '../config/websocket';
// --- Type Definitions and Helpers (No Changes) ---
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
const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };

const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
    <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
);

// --- Main Live Tutorial Page Component ---
const LiveTutorialPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('authToken');

    // --- State Management, Refs, and Computed State (No Changes) ---
    const decodedToken = token ? simpleJwtDecode(token) : null;
    const initialUserRole = decodedToken?.user?.role || 'unknown';
    // --- AGORA STATE ---
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    
    const currentUserId = decodedToken?.user?.id || null;
    const [role, setRole] = useState<UserRole>(initialUserRole);
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
    const [isConnected, setIsConnected] = useState(false); // More useful for disabling UI

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
    const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
    const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
    const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
    const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
    const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);
    const [_connectedPeers, setConnectedPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const ws = useRef<WebSocket | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const roleRef = useRef(role);
    const teacherIdRef = useRef(teacherId);
    const activeChatStudentIdRef = useRef(activeChatStudentId);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const pendingICECandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
    useEffect(() => { roleRef.current = role; }, [role]);
    useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
    useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);
    const displayedWorkspace = (() => {
        if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
        if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
        return { files, activeFileName };
    })();
    const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
    const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
    const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
    const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    // --- AGORA VIDEO/AUDIO INITIALIZATION ---
    useEffect(() => {
        if (!sessionId || !currentUserId) return;

        // 1. Initialize the Agora Client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        const joinAgoraChannel = async () => {
            try {
                // 2. Fetch the secure token from your backend
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token: agoraToken, uid, appId } = response.data;

                // 3. Join the Agora channel
                await client.join(appId, sessionId, agoraToken, uid);
                toast.success("Video/Audio connected.");

                // 4. Create and publish your local camera and microphone streams
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { videoTrack, audioTrack };
                
                if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current);
                }
                
                await client.publish([audioTrack, videoTrack]);

            } catch (error) {
                console.error("Agora Connection Failed:", error);
                toast.error("Could not connect to the video/audio service.");
            }
        };

        joinAgoraChannel();

        // --- AGORA EVENT LISTENERS ---

        // Listen for when other users join and publish their streams
        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            
            if (mediaType === 'video') {
                setRemoteUsers(Array.from(client.remoteUsers));
            }
            if (mediaType === 'audio') {
                user.audioTrack?.play();
            }
        });

        // Listen for when users leave
        client.on('user-left', (user) => {
            setRemoteUsers(Array.from(client.remoteUsers));
        });
        
        // Cleanup function on component unmount
        return () => {
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            client.leave();
        };
    }, [sessionId, currentUserId]);
   // Unified Initialization and Cleanup Effect
useEffect(() => {
    if (!token) {
        navigate('/login');
        return;
    }

    // --- Stage 1: Initialize Terminal (No Changes) ---
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

    // --- Stage 2: Initialize WebSocket (Corrected) ---
    if (term.current && !ws.current) {
        const needsSyncOnReturn = sessionStorage.getItem(`studentJustReturned_${sessionId}`) === 'true';
        if (needsSyncOnReturn) {
            sessionStorage.removeItem(`studentJustReturned_${sessionId}`);
        }

        const httpUrl = apiClient.defaults.baseURL || '';
        const wsBaseUrl = httpUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}?sessionId=${sessionId}&token=${token}`;
        
        console.log("Attempting to connect WebSocket to:", wsUrl);

        const currentWs = new WebSocket(wsUrl);
        ws.current = currentWs;

        // --- WebSocket Event Handlers with Simplified State Management ---
        currentWs.onopen = () => {
            console.log("WebSocket connection established successfully.");
            toast.success("Connected to live session!");
            setIsConnected(true); // Set connection state to true
            
            if (needsSyncOnReturn && roleRef.current === 'student') {
                sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
            }
        };
        
        initializeWebSocketEvents(currentWs);

        currentWs.onclose = () => {
            console.log("WebSocket connection closed.");
            setIsConnected(false); // Set connection state to false
        };
        
        currentWs.onerror = (event) => {
            console.error("WebSocket error observed:", event);
            setIsConnected(false); // Set connection state to false
            toast.error("Connection to the live session was lost. Please refresh.");
        };
    }

    // --- Stage 3: Initialize Media (No Changes) ---
    const setupMedia = async () => {
        try {
            if (!localStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                console.log('[MEDIA] Local media stream initialized');
            }
        } catch (err) {
             console.error("Could not get user media.", err);
             toast.error("Could not access camera/microphone. Please grant permissions.");
        }
    };
    setupMedia();

    // --- Stage 4: Cleanup Function (No Changes) ---
    return () => {
        console.log('[CLEANUP] Cleaning up connections and media');
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        
        peerConnectionsRef.current.forEach((pc, peerId) => {
            console.log(`[CLEANUP] Closing peer connection to ${peerId}`);
            pc.close();
        });
        peerConnectionsRef.current.clear();
        
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log('[CLEANUP] Stopping local media track');
                track.stop();
            });
            localStreamRef.current = null;
        }
        
        if (term.current) {
            term.current.dispose();
            term.current = null;
        }
    };
}, [sessionId, navigate, token]);

    // Effect to manage session storage for homework state
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

    // Auto-start homework if conditions are met
    useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

    // Fetch available lessons for teacher
    useEffect(() => {
        if (role === 'teacher') {
            apiClient.get('/api/lessons/teacher/list')
            .then(res => res.data || [])
            .then(setAvailableLessons)
            .catch(() => setAvailableLessons([]));
        }
    }, [role, token]);

    // Update media stream effects
    useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoEnabled;
            });
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isAudioEnabled;
            });
        }
    }, [isVideoEnabled, isAudioEnabled, localStream]);

    // Declarative Terminal Content Rendering Effect
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


    // --- WebRTC Helper Functions ---

    const createPeerConnection = (peerId: string, isInitiator: boolean = false): RTCPeerConnection => {
        console.log(`[WEBRTC] Creating peer connection with ${peerId}, isInitiator: ${isInitiator}`);
        
        // Close existing connection if any
        const existingPc = peerConnectionsRef.current.get(peerId);
        if (existingPc) {
            console.log(`[WEBRTC] Closing existing connection to ${peerId}`);
            existingPc.close();
        }

        const pc = new RTCPeerConnection(stunServers);
        peerConnectionsRef.current.set(peerId, pc);

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
                console.log(`[WEBRTC] Added ${track.kind} track to peer connection with ${peerId}`);
            });
        }

        // Handle incoming streams
        pc.ontrack = (event) => {
            console.log(`[WEBRTC] Received ${event.track.kind} track from ${peerId}`);
            if (event.streams && event.streams[0]) {
                setRemoteStreams(prev => new Map(prev).set(peerId, event.streams[0]));
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[WEBRTC] Sending ICE candidate to ${peerId}`);
                sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: peerId, candidate: event.candidate });
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`[WEBRTC] Connection state with ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
                sendWsMessage('VIDEO_CONNECTION_ESTABLISHED', { peerId });
                setConnectedPeers(prev => new Map(prev).set(peerId, pc));
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
                console.log(`[WEBRTC] Connection ${pc.connectionState} with ${peerId}`);
                handlePeerDisconnection(peerId);
            }
        };

        // Process any pending ICE candidates
        const pendingCandidates = pendingICECandidatesRef.current.get(peerId) || [];
        if (pendingCandidates.length > 0) {
            console.log(`[WEBRTC] Processing ${pendingCandidates.length} pending ICE candidates for ${peerId}`);
            pendingCandidates.forEach(candidate => {
                pc.addIceCandidate(candidate).catch(e => console.error(`[WEBRTC] Error adding ICE candidate:`, e));
            });
            pendingICECandidatesRef.current.delete(peerId);
        }

        return pc;
    };

    const handlePeerDisconnection = (peerId: string) => {
        console.log(`[WEBRTC] Handling disconnection from ${peerId}`);
        
        peerConnectionsRef.current.delete(peerId);
        setConnectedPeers(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
        });
        
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
        });
        
        // If this was the main video stream, clear it
        if (remoteVideoRef.current?.srcObject) {
            const currentStream = remoteVideoRef.current.srcObject as MediaStream;
            const currentStreamId = remoteStreams.get(peerId)?.id;
            if (currentStream.id === currentStreamId) {
                setRemoteStream(null);
                remoteVideoRef.current.srcObject = null;
            }
        }
        
        sendWsMessage('VIDEO_CONNECTION_ENDED', { peerId });
    };

    // --- Handlers and Functions ---

    const handleTerminalPanelResize = () => {
        if (fitAddon.current) {
            // Defer to prevent race conditions with the panel library's internal state
            setTimeout(() => fitAddon.current?.fit(), 0);
        }
    };

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
                case 'INITIATE_VIDEO_CONNECTION':
                    console.log(`[WEBRTC] Received initiate video connection from server for ${message.payload.targetId}`);
                    await handleInitiateVideoConnection(message.payload.targetId, message.payload.targetUsername);
                    break;
                case 'AUTO_ACCEPT_VIDEO_CALL':
                    console.log(`[WEBRTC] Auto-accepting video call from ${message.payload.from}`);
                    await handleAutoAcceptVideoCall(message.payload.from, message.payload.username);
                    break;
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
                case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
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
                     if (
                        (roleRef.current === 'student' && !spotlightedStudentId) ||
                        (roleRef.current === 'teacher' && viewingMode === 'teacher')
                    ) {
                        setTeacherTerminalOutput(prev => prev + message.payload);
                    }
                    break;
                case 'WEBRTC_OFFER': 
                    console.log(`[WEBRTC] Received offer from ${message.payload.from}`);
                    await handleWebRTCOffer(message.payload.from, message.payload.offer, message.payload.isAutoCall);
                    break;
                case 'WEBRTC_ANSWER': 
                    console.log(`[WEBRTC] Received answer from ${message.payload.from}`);
                    await handleWebRTCAnswer(message.payload.from, message.payload.answer);
                    break;
                case 'WEBRTC_ICE_CANDIDATE': 
                    console.log(`[WEBRTC] Received ICE candidate from ${message.payload.from}`);
                    await handleWebRTCIceCandidate(message.payload.from, message.payload.candidate);
                    break;
                case 'PEER_DISCONNECTED':
                    console.log(`[WEBRTC] Peer ${message.payload.disconnectedUserId} disconnected`);
                    handlePeerDisconnection(message.payload.disconnectedUserId);
                    break;
                case 'TEACHER_DISCONNECTED':
                    console.log(`[WEBRTC] Teacher disconnected`);
                    if (teacherIdRef.current) {
                        handlePeerDisconnection(teacherIdRef.current);
                    }
                    toast.info("Teacher has disconnected");
                    break;
                case 'STUDENT_DISCONNECTED':
                    console.log(`[WEBRTC] Student ${message.payload.studentId} disconnected`);
                    handlePeerDisconnection(message.payload.studentId);
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

    // WebRTC event handlers
    const handleInitiateVideoConnection = async (targetId: string, _targetUsername: string) => {
        if (!localStreamRef.current) {
            console.error('[WEBRTC] No local stream available for initiation');
            return;
        }

        try {
            const pc = createPeerConnection(targetId, true);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log(`[WEBRTC] Sending offer to ${targetId}`);
            sendWsMessage('WEBRTC_OFFER', { 
                to: targetId, 
                offer: pc.localDescription,
                isAutoCall: true
            });
        } catch (error) {
            console.error(`[WEBRTC] Error initiating connection to ${targetId}:`, error);
        }
    };

    const handleAutoAcceptVideoCall = async (fromId: string, fromUsername: string) => {
        console.log(`[WEBRTC] Auto-accepting video call from ${fromUsername} (${fromId})`);
        // The actual offer will come through WEBRTC_OFFER, this just prepares us
    };

    const handleWebRTCOffer = async (fromId: string, offer: RTCSessionDescriptionInit, _isAutoCall: boolean = false) => {
        if (!localStreamRef.current) {
            console.error('[WEBRTC] No local stream available for handling offer');
            return;
        }

        try {
            const pc = createPeerConnection(fromId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log(`[WEBRTC] Sending answer to ${fromId}`);
            sendWsMessage('WEBRTC_ANSWER', { 
                to: fromId, 
                answer: pc.localDescription 
            });
        } catch (error) {
            console.error(`[WEBRTC] Error handling offer from ${fromId}:`, error);
        }
    };

    const handleWebRTCAnswer = async (fromId: string, answer: RTCSessionDescriptionInit) => {
        const pc = peerConnectionsRef.current.get(fromId);
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`[WEBRTC] Set remote description for ${fromId}`);
            } catch (error) {
                console.error(`[WEBRTC] Error setting remote description for ${fromId}:`, error);
            }
        } else {
            console.error(`[WEBRTC] No peer connection found for ${fromId}`);
        }
    };

    const handleWebRTCIceCandidate = async (fromId: string, candidate: RTCIceCandidateInit) => {
        const pc = peerConnectionsRef.current.get(fromId);
        if (pc && pc.remoteDescription) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`[WEBRTC] Added ICE candidate for ${fromId}`);
            } catch (error) {
                console.error(`[WEBRTC] Error adding ICE candidate for ${fromId}:`, error);
            }
        } else {
            // Store candidate for later if remote description isn't set yet
            console.log(`[WEBRTC] Storing ICE candidate for ${fromId} (no remote description yet)`);
            const pending = pendingICECandidatesRef.current.get(fromId) || [];
            pending.push(new RTCIceCandidate(candidate));
            pendingICECandidatesRef.current.set(fromId, pending);
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

    // const onTerminalData = (data: string) => {
    //     if (role === 'teacher' && viewingMode === 'teacher') {
    //         sendWsMessage('TERMINAL_IN', { data });
    //     }
    // };
    
    const handleRunCode = () => {
        if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
            sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
        }
    };

    const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
    const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
    const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
    const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');

    const handleViewStudentCam = async (studentId: string) => {
        // For auto video connections, this is handled automatically
        console.log(`[WEBRTC] Video already connected with student ${studentId}`);
        toast.info("Video connection is already active!");
    };

    const handleAcceptCall = async () => {
        if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
        const pc = createPeerConnection(incomingCall.from, false);
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
        } catch (error) { toast.error("Failed to answer video call."); }
        finally { setIncomingCall(null); }
    };

    // --- AGORA MEDIA CONTROLS ---
    const toggleMute = () => { 
        if (localTracks.current?.audioTrack) {
            const isEnabled = localTracks.current.audioTrack.enabled;
            localTracks.current.audioTrack.setEnabled(!isEnabled);
            setIsMuted(isEnabled); // Update UI state
        }
    };
    
    const toggleCamera = () => { 
        if (localTracks.current?.videoTrack) {
            const isEnabled = localTracks.current.videoTrack.enabled;
            localTracks.current.videoTrack.setEnabled(!isEnabled);
            setIsCameraOff(isEnabled); // Update UI state
        }
    };

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

    // Conditional Rendering for Homework View
    if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
        return <HomeworkView 
            lessonId={pendingHomework.lessonId} 
            teacherSessionId={pendingHomework.teacherSessionId} 
            token={token} 
            onLeave={() => {
                console.log('[HOMEWORK_LEAVE] Student leaving homework, setting refresh flag for session:', sessionId);
                
                // Clean up session storage first
                sessionStorage.setItem(`isDoingHomework_${sessionId}`, 'false');
                sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
                sessionStorage.removeItem(`pendingHomework_${sessionId}`);
                
                console.log('[HOMEWORK_LEAVE] Session storage cleaned, triggering immediate page refresh...');
                
                // Immediate refresh - don't change React state, just reload
                setTimeout(() => {
                    console.log('[HOMEWORK_LEAVE] Executing immediate page reload...');
                    window.location.reload();
                }, 50); // Shorter delay
            }} 
            initialFiles={homeworkFiles} 
            onFilesChange={setHomeworkFiles} 
            currentUserId={currentUserId} 
        />;
    }
    
    // // --- JSX Render ---
    // return (
    //     <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
    //         <AlertDialog open={!!incomingCall}>
    //             <GlassAlertDialogContent>
    //                 <AlertDialogHeader>
    //                     <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
    //                     <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
    //                 </AlertDialogHeader>
    //                 <AlertDialogFooter>
    //                     <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
    //                     <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
    //                 </AlertDialogFooter>
    //             </GlassAlertDialogContent>
    //         </AlertDialog>
    //         <Toaster theme="dark" richColors position="top-right" />
    //         <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

    //         <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
    //             <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
    //             <div className="flex items-center gap-2 font-semibold">
    //                 <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
    //                 {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
    //                 {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
    //                 {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
    //                 {role === 'student' && <Button size="sm" onClick={handleRaiseHand} disabled={!isConnected}  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
    //                 {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} disabled={!isConnected} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
    //                 {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
    //                 {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
    //                 {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
                    
    //                 {/* Media Controls */}
    //                 <div className="flex items-center gap-1 border-l border-slate-600 pl-2 ml-2">
    //                     <Button size="sm" onClick={toggleMute} className={cn('text-white', isAudioEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}>
    //                         {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
    //                     </Button>
    //                     <Button size="sm" onClick={toggleCamera} className={cn('text-white', isVideoEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}>
    //                         {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
    //                     </Button>
    //                 </div>
    //             </div>
    //             <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
    //         </header>

    //         {pendingHomework && role === 'student' && !isDoingHomework && (
    //             <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
    //                 <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
    //                 <AlertDescription className="flex items-center justify-between text-slate-200">
    //                     Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
    //                     <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
    //                 </AlertDescription>
    //             </Alert>
    //         )}

    //         <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
    //             <PanelGroup direction="horizontal">
    //                 <Panel defaultSize={75} minSize={30} className="flex flex-col">
    //                      <div className="w-full h-full rounded-lg border border-slate-700/80 bg-black overflow-hidden relative">
    //                         {/* Main Video Display (Teacher's view for student, Student's view for teacher) */}
    //                         {role === 'student' && teacherUser && teacherUser.videoTrack && (
    //                             <RemoteUserPlayer user={teacherUser} />
    //                         )}
    //                         {role === 'teacher' && studentUsers.length > 0 && studentUsers[0].videoTrack && (
    //                             <RemoteUserPlayer user={studentUsers[0]} />
    //                         )}
                            
    //                         {/* Grid of other student videos for the teacher */}
    //                         {role === 'teacher' && studentUsers.length > 1 && (
    //                             <div className="absolute bottom-4 right-4 grid grid-cols-4 gap-2">
    //                                 {studentUsers.slice(1).map(user => (
    //                                     <div key={user.uid} className="w-32 h-24 bg-slate-800 rounded-md overflow-hidden">
    //                                        <RemoteUserPlayer user={user} />
    //                                     </div>
    //                                 ))}
    //                             </div>
    //                         )}

    //                          {/* Fallback when no one else is here */}
    //                          {remoteUsers.length === 0 && (
    //                             <div className="w-full h-full flex items-center justify-center text-slate-500">
    //                                 Waiting for others to join...
    //                             </div>
    //                          )}
    //                     </div>
                        
    //                     <PanelGroup direction="vertical">
    //                         <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
    //                             <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
    //                                 <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
    //                                     <div className="p-3 border-b border-slate-800 flex justify-between items-center">
    //                                         <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
    //                                         {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
    //                                     </div>
    //                                     <div className="flex-grow overflow-y-auto py-1 px-1">
    //                                         {displayedWorkspace.files.map(file => (
    //                                             <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
    //                                                 className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
    //                                                 <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
    //                                             </div>
    //                                         ))}
    //                                     </div>
    //                                 </Panel>
    //                                 <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
    //                                 <Panel defaultSize={80} minSize={30}>
    //                                     <PanelGroup direction="vertical">
    //                                         <Panel defaultSize={70} minSize={20} className="overflow-hidden">
    //                                             <div className="h-full flex flex-col">
    //                                                 <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
    //                                                     <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
    //                                                         <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
    //                                                         <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem><SelectItem value="ruby">Ruby</SelectItem><SelectItem value="go">Go</SelectItem></SelectContent>
    //                                                     </Select>
    //                                                     {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
    //                                                 </div>
    //                                                 <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
    //                                             </div>
    //                                         </Panel>
    //                                         <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
    //                                         <Panel defaultSize={30} minSize={10} onResize={handleTerminalPanelResize}>
    //                                             <div className="h-full flex flex-col bg-[#0D1117]">
    //                                                 <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
    //                                                 <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
    //                                             </div>
    //                                         </Panel>
    //                                     </PanelGroup>
    //                                 </Panel>
    //                             </PanelGroup>
    //                         </Panel>
    //                         {isWhiteboardVisible && ( <>
    //                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
    //                             <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
    //                                 <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
    //                             </Panel>
    //                         </>)}
    //                     </PanelGroup>
    //                 </Panel>
    //                 <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
    //                 <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
    //                     <RosterPanel
    //                         role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
    //                         activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
    //                         spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
    //                         assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
    //                         availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
    //                         localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
    //                         isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
    //                         controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
    //                         handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
    //                     />
    //                 </Panel>
    //             </PanelGroup>
    //         </main>
    //         {role === 'teacher' && activeChatStudentId && (
    //             <ChatPanel
    //                 messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
    //                 chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
    //                 onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
    //             />
    //         )}
    //         {role === 'student' && isStudentChatOpen && teacherId && (
    //              <ChatPanel
    //                 messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
    //                 chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
    //             />
    //         )}
    //     </div>
    // );
    // Helper component to render a remote user's video - place this OUTSIDE your main component
const RemoteUserPlayer = ({ user, students }: { user: IAgoraRTCRemoteUser, students: Student[] }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && user.videoTrack) {
            user.videoTrack.play(videoRef.current);
        }
        return () => {
            user.videoTrack?.stop();
        };
    }, [user]);

    // Find the username from the student list provided by the WebSocket
    const username = students.find(s => s.id === user.uid)?.username || `User ${user.uid.toString().substring(0, 4)}`;

    return (
        <div className="w-full h-full relative bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                {username}
            </div>
        </div>
    );
};


// --- Your main component's return statement ---
return (
    <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
        <AlertDialog open={!!incomingCall}>
            <GlassAlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
                </AlertDialogFooter>
            </GlassAlertDialogContent>
        </AlertDialog>
        <Toaster theme="dark" richColors position="top-right" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

        <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
            <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
            <div className="flex items-center gap-2 font-semibold">
                <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
                {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
                {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
                {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
                {role === 'student' && <Button size="sm" onClick={handleRaiseHand} disabled={!isConnected}  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
                {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} disabled={!isConnected} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
                {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
                {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhitebordVisible ? "Hide Board" : "Show Board"}</Button>}
                {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
                
                <div className="flex items-center gap-1 border-l border-slate-600 pl-2 ml-2">
                    <Button size="sm" onClick={toggleMute} className={cn('text-white', isAudioEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}>
                        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" onClick={toggleCamera} className={cn('text-white', isVideoEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}>
                        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
        </header>

        {pendingHomework && role === 'student' && !isDoingHomework && (
            <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
                <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
                <AlertDescription className="flex items-center justify-between text-slate-200">
                    Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
                    <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
                </AlertDescription>
            </Alert>
        )}

        <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={75} minSize={30} className="flex flex-col">
                    {/* --- THIS IS THE NEW VIDEO DISPLAY LOGIC --- */}
                    <div className="w-full h-full rounded-lg border border-slate-700/80 bg-black overflow-hidden relative">
                        {/* 
                          The main video area will show:
                          - For Students: The teacher's video.
                          - For Teachers: The video of the first student.
                        */}
                        {role === 'student' && remoteUsers.find(u => u.uid.toString() === teacherId) && (
                            <RemoteUserPlayer user={remoteUsers.find(u => u.uid.toString() === teacherId)!} students={students} />
                        )}
                        {role === 'teacher' && remoteUsers.length > 0 && (
                            <RemoteUserPlayer user={remoteUsers[0]} students={students} />
                        )}
                        
                        {/* A fallback message when no remote video is available yet */}
                        {remoteUsers.length === 0 && (
                           <div className="w-full h-full flex items-center justify-center text-slate-500">
                               <p>Waiting for others to join the session...</p>
                           </div>
                        )}

                        {/* 
                          For Teachers: A "gallery" of other students' videos at the bottom.
                          We slice(1) to skip the first student who is already in the main view.
                        */}
                        {role === 'teacher' && remoteUsers.length > 1 && (
                            <div className="absolute bottom-4 right-4 grid grid-cols-5 gap-2">
                                {remoteUsers.slice(1).map(user => (
                                    <div key={user.uid} className="w-32 h-24 bg-slate-800 rounded-md overflow-hidden">
                                       <RemoteUserPlayer user={user} students={students} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* --- END OF NEW VIDEO DISPLAY LOGIC --- */}
                </Panel>
                <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
                <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
                    <RosterPanel
                        role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
                        activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
                        spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
                        assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
                        availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
                        localVideoRef={localVideoRef}
                        isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
                        controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
                        handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
                        // Remove the old remoteVideoRef and remoteStream props as they are no longer needed
                    />
                </Panel>
            </PanelGroup>
        </main>
        {role === 'teacher' && activeChatStudentId && (
            <ChatPanel
                messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
                chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
                onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
            />
        )}
        {role === 'student' && isStudentChatOpen && teacherId && (
             <ChatPanel
                messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
                chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
            />
        )}
    </div>
);
};

export default LiveTutorialPage;
// // perfect with refresh
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const fitAddon = useRef<FitAddon | null>(null); // Ref for the FitAddon
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);

//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
//         if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     // --- Effects ---

//     // Effect to handle page refresh when returning from homework
//     useEffect(() => {
//         if (role === 'student' && sessionId) {
//             const shouldRefresh = sessionStorage.getItem(`studentShouldRefresh_${sessionId}`);
//             console.log('[REFRESH_CHECK] Checking refresh flag:', shouldRefresh, 'for session:', sessionId);
//             if (shouldRefresh === 'true') {
//                 console.log('[REFRESH] Student returned from homework, refreshing page to sync terminal...');
//                 sessionStorage.removeItem(`studentShouldRefresh_${sessionId}`);
//                 // Small delay to ensure state is cleaned up
//                 setTimeout(() => {
//                     console.log('[REFRESH] Executing page reload...');
//                     window.location.reload();
//                 }, 100);
//                 return; // Exit early to prevent further execution
//             }
//         }
//     }, [role, sessionId]);

//     // Additional effect to check for refresh on component mount
//     useEffect(() => {
//         if (sessionId) {
//             const shouldRefresh = sessionStorage.getItem(`studentShouldRefresh_${sessionId}`);
//             console.log('[MOUNT_REFRESH_CHECK] Component mounted, checking refresh flag:', shouldRefresh);
//             if (shouldRefresh === 'true') {
//                 console.log('[MOUNT_REFRESH] Triggering refresh on mount...');
//                 sessionStorage.removeItem(`studentShouldRefresh_${sessionId}`);
//                 setTimeout(() => {
//                     console.log('[MOUNT_REFRESH] Executing page reload...');
//                     window.location.reload();
//                 }, 50);
//             }
//         }
//     }, []); // Empty dependency array - runs only on mount

//     // Unified Initialization and Cleanup Effect
//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }

//         // --- Stage 1: Initialize Terminal ---
//         if (terminalRef.current && !term.current) {
//             fitAddon.current = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//             newTerm.loadAddon(fitAddon.current);
//             newTerm.open(terminalRef.current);
//             fitAddon.current.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN && roleRef.current === 'teacher' && viewingMode === 'teacher') {
//                     sendWsMessage('TERMINAL_IN', data);
//                 }
//             });
//             term.current = newTerm;
//         }

//         // --- Stage 2: Initialize WebSocket ---
//         if (term.current && !ws.current) {
//             const needsSyncOnReturn = sessionStorage.getItem(`studentJustReturned_${sessionId}`) === 'true';
//             if (needsSyncOnReturn) {
//                 sessionStorage.removeItem(`studentJustReturned_${sessionId}`);
//             }

//             const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//             const currentWs = new WebSocket(wsUrl);
//             ws.current = currentWs;

//             currentWs.onopen = () => {
//                 setConnectionStatus('Connected');
//                 if (needsSyncOnReturn && roleRef.current === 'student') {
//                     sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//                 }
//             };
            
//             initializeWebSocketEvents(currentWs);
//             currentWs.onclose = () => setConnectionStatus('Disconnected');
//             currentWs.onerror = () => setConnectionStatus('Connection Error');
//         }

//         // --- Stage 3: Initialize Media ---
//         const setupMedia = async () => {
//             try {
//                 if (!localStreamRef.current) {
//                     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                     setLocalStream(stream);
//                     localStreamRef.current = stream;
//                     if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//                 }
//             } catch (err) {
//                  console.error("Could not get user media.", err);
//                  toast.error("Could not access camera/microphone. Please grant permissions.");
//             }
//         };
//         setupMedia();

//         // --- Cleanup Function ---
//         return () => {
//             ws.current?.close();
//             ws.current = null;
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             localStreamRef.current = null;
//             peerConnection.current?.close();
//             term.current?.dispose();
//             term.current = null;
//         };
//     }, []);

//     // Effect to manage session storage for homework state
//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     // Auto-start homework if conditions are met
//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     // Fetch available lessons for teacher
//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);

//     // Declarative Terminal Content Rendering Effect
//     useEffect(() => {
//         const timeoutId = setTimeout(() => {
//             if (!term.current) return;

//             let outputToDisplay = '';
//             let isTerminalReadOnly = false;

//             if (spotlightedStudentId && spotlightWorkspace) {
//                 const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//                 outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//                 isTerminalReadOnly = true;
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//                 outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//                 isTerminalReadOnly = !isTeacherControllingThisStudent;
//             } else {
//                 outputToDisplay = teacherTerminalOutput;
//                 isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//             }

//             term.current.clear();
//             term.current.write(outputToDisplay);
            
//             if (term.current.options.disableStdin !== isTerminalReadOnly) {
//                 term.current.options.disableStdin = isTerminalReadOnly;
//             }
//         }, 0);

//         return () => clearTimeout(timeoutId);

//     }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);


//     // --- Handlers and Functions ---

//     const handleTerminalPanelResize = () => {
//         if (fitAddon.current) {
//             // Defer to prevent race conditions with the panel library's internal state
//             setTimeout(() => fitAddon.current?.fit(), 0);
//         }
//     };

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };
    
//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             switch (message.type) {
//                 case 'PRIVATE_MESSAGE': {
//                     const msg = message.payload as Message;
//                     const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 }
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId);
//                     setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                         setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                     }
//                     break;
//                  case 'TEACHER_CODE_DID_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'TERMINAL_OUT':
//                      if (
//                         (roleRef.current === 'student' && !spotlightedStudentId) ||
//                         (roleRef.current === 'teacher' && viewingMode === 'teacher')
//                     ) {
//                         setTeacherTerminalOutput(prev => prev + message.payload);
//                     }
//                     break;
//                 case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': 
//                     setStudentHomeworkStates(prev => { 
//                         const map = new Map(prev); 
//                         const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; 
//                         s.terminalOutput += message.payload.output; 
//                         map.set(message.payload.studentId, s); 
//                         return map; 
//                     }); 
//                     break;
//             }
//         };
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("Error fetching homework state:", error);
//                 toast.error("A network error occurred.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };
    
//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');

//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };

//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };

//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };

//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     // Conditional Rendering for Homework View
//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//             lessonId={pendingHomework.lessonId} 
//             teacherSessionId={pendingHomework.teacherSessionId} 
//             token={token} 
//             onLeave={() => {
//                 console.log('[HOMEWORK_LEAVE] Student leaving homework, setting refresh flag for session:', sessionId);
                
//                 // Clean up session storage first
//                 sessionStorage.setItem(`isDoingHomework_${sessionId}`, 'false');
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
                
//                 console.log('[HOMEWORK_LEAVE] Session storage cleaned, triggering immediate page refresh...');
                
//                 // Immediate refresh - don't change React state, just reload
//                 setTimeout(() => {
//                     console.log('[HOMEWORK_LEAVE] Executing immediate page reload...');
//                     window.location.reload();
//                 }, 50); // Shorter delay
//             }} 
//             initialFiles={homeworkFiles} 
//             onFilesChange={setHomeworkFiles} 
//             currentUserId={currentUserId} 
//         />;
//     }
    
//     // --- JSX Render ---
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between text-slate-200">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10} onResize={handleTerminalPanelResize}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const fitAddon = useRef<FitAddon | null>(null); // Ref for the FitAddon
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);

//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
//         if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     // --- Effects ---

//     // Unified Initialization and Cleanup Effect
//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }

//         // --- Stage 1: Initialize Terminal ---
//         if (terminalRef.current && !term.current) {
//             fitAddon.current = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//             newTerm.loadAddon(fitAddon.current);
//             newTerm.open(terminalRef.current);
//             fitAddon.current.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN && roleRef.current === 'teacher' && viewingMode === 'teacher') {
//                     sendWsMessage('TERMINAL_IN', data);
//                 }
//             });
//             term.current = newTerm;
//         }

//         // --- Stage 2: Initialize WebSocket ---
//         if (term.current && !ws.current) {
//             const needsSyncOnReturn = sessionStorage.getItem(`studentJustReturned_${sessionId}`) === 'true';
//             if (needsSyncOnReturn) {
//                 sessionStorage.removeItem(`studentJustReturned_${sessionId}`);
//             }

//             const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//             const currentWs = new WebSocket(wsUrl);
//             ws.current = currentWs;

//             currentWs.onopen = () => {
//                 setConnectionStatus('Connected');
//                 if (needsSyncOnReturn && roleRef.current === 'student') {
//                     sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//                 }
//             };
            
//             initializeWebSocketEvents(currentWs);
//             currentWs.onclose = () => setConnectionStatus('Disconnected');
//             currentWs.onerror = () => setConnectionStatus('Connection Error');
//         }

//         // --- Stage 3: Initialize Media ---
//         const setupMedia = async () => {
//             try {
//                 if (!localStreamRef.current) {
//                     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                     setLocalStream(stream);
//                     localStreamRef.current = stream;
//                     if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//                 }
//             } catch (err) {
//                  console.error("Could not get user media.", err);
//                  toast.error("Could not access camera/microphone. Please grant permissions.");
//             }
//         };
//         setupMedia();

//         // --- Cleanup Function ---
//         return () => {
//             ws.current?.close();
//             ws.current = null;
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             localStreamRef.current = null;
//             peerConnection.current?.close();
//             term.current?.dispose();
//             term.current = null;
//         };
//     }, []);

//     // Effect to manage session storage for homework state
//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     // Auto-start homework if conditions are met
//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     // Fetch available lessons for teacher
//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);

//     // Declarative Terminal Content Rendering Effect
//     useEffect(() => {
//         const timeoutId = setTimeout(() => {
//             if (!term.current) return;

//             let outputToDisplay = '';
//             let isTerminalReadOnly = false;

//             if (spotlightedStudentId && spotlightWorkspace) {
//                 const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//                 outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//                 isTerminalReadOnly = true;
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//                 outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//                 isTerminalReadOnly = !isTeacherControllingThisStudent;
//             } else {
//                 outputToDisplay = teacherTerminalOutput;
//                 isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//             }

//             term.current.clear();
//             term.current.write(outputToDisplay);
            
//             if (term.current.options.disableStdin !== isTerminalReadOnly) {
//                 term.current.options.disableStdin = isTerminalReadOnly;
//             }
//         }, 0);

//         return () => clearTimeout(timeoutId);

//     }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);


//     // --- Handlers and Functions ---

//     const handleTerminalPanelResize = () => {
//         if (fitAddon.current) {
//             // Defer to prevent race conditions with the panel library's internal state
//             setTimeout(() => fitAddon.current?.fit(), 0);
//         }
//     };

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };
    
//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             switch (message.type) {
//                 case 'PRIVATE_MESSAGE': {
//                     const msg = message.payload as Message;
//                     const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 }
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId);
//                     setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                         setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                     }
//                     break;
//                  case 'TEACHER_CODE_DID_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'TERMINAL_OUT':
//                      if (
//                         (roleRef.current === 'student' && !spotlightedStudentId) ||
//                         (roleRef.current === 'teacher' && viewingMode === 'teacher')
//                     ) {
//                         setTeacherTerminalOutput(prev => prev + message.payload);
//                     }
//                     break;
//                 case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': 
//                     setStudentHomeworkStates(prev => { 
//                         const map = new Map(prev); 
//                         const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; 
//                         s.terminalOutput += message.payload.output; 
//                         map.set(message.payload.studentId, s); 
//                         return map; 
//                     }); 
//                     break;
//             }
//         };
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("Error fetching homework state:", error);
//                 toast.error("A network error occurred.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };
    
//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');

//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };

//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };

//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };

//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     // Conditional Rendering for Homework View
//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//             lessonId={pendingHomework.lessonId} 
//             teacherSessionId={pendingHomework.teacherSessionId} 
//             token={token} 
//             onLeave={() => {
//                 sessionStorage.setItem(`studentJustReturned_${sessionId}`, 'true');
//                 sessionStorage.setItem(`isDoingHomework_${sessionId}`, 'false');
//                 setIsDoingHomework(false);
//             }} 
//             initialFiles={homeworkFiles} 
//             onFilesChange={setHomeworkFiles} 
//             currentUserId={currentUserId} 
//         />;
//     }
    
//     // --- JSX Render ---
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between text-slate-200">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10} onResize={handleTerminalPanelResize}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );
// class TerminalManager {
//     private term: Terminal;
//     private fitAddon: FitAddon;

//     constructor(container: HTMLElement) {
//         this.fitAddon = new FitAddon();
//         this.term = new Terminal({
//             cursorBlink: true,
//             theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
//             fontSize: 14,
//         });
//         this.term.loadAddon(this.fitAddon);
//         this.term.open(container);
//         this.fitAddon.fit();
//     }

//     // Public method to safely update the terminal's content and read-only state
//     public update(content: string, isReadOnly: boolean): void {
//         // Defer the commands to prevent race-condition crashes
//         setTimeout(() => {
//             // Always resize first to ensure the viewport is valid
//             this.fitAddon.fit();
//             // Then write the content
//             this.term.clear();
//             this.term.write(content);
//             // Finally, set the input state
//             if (this.term.options.disableStdin !== isReadOnly) {
//                 this.term.options.disableStdin = isReadOnly;
//             }
//         }, 0);
//     }

//     // Public method for explicit resizing
//     public resize(): void {
//         setTimeout(() => this.fitAddon.fit(), 0);
//     }

//     // Public method to attach the data handler
//     public onData(callback: (data: string) => void): void {
//         this.term.onData(callback);
//     }

//     // Public method for cleanup
//     public dispose(): void {
//         this.term.dispose();
//     }
// }

// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const fitAddon = useRef<FitAddon | null>(null);

//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);
//     const terminalManager = useRef<TerminalManager | null>(null);

//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
//         if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    

//     // --- Effects ---

//     // // Unified Initialization and Cleanup Effect
//     // useEffect(() => {
//     //     const log = (msg: string) => console.log(`[CLIENT LIFECYCLE - ${roleRef.current || 'unknown'}] ${msg}`);
//     //     log("Main lifecycle effect running.");

//     //     if (!token) {
//     //         navigate('/login');
//     //         return;
//     //     }

//     //     // --- Stage 1: Initialize Terminal ---
//     //     if (terminalRef.current && !term.current) {
//     //         log("Stage 1: Terminal ref is ready. Initializing XTerm instance.");
//     //         fitAddon.current = new FitAddon(); 

//     //         const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//     //         newTerm.loadAddon(fitAddon.current); 
//     //         newTerm.open(terminalRef.current);
//     //         fitAddon.current.fit();
//     //         newTerm.onData((data) => {
//     //             if (ws.current?.readyState === WebSocket.OPEN && roleRef.current === 'teacher' && viewingMode === 'teacher') {
//     //                 sendWsMessage('TERMINAL_IN', data);
//     //             }
//     //         });
//     //         term.current = newTerm;
//     //         log("Stage 1 COMPLETE: XTerm instance created.");
//     //     }

//     //     // --- Stage 2: Initialize WebSocket ---
//     //     if (term.current && !ws.current) {
//     //         log("Stage 2: Terminal is ready. Initializing WebSocket connection.");
            
//     //         const needsSyncOnReturn = sessionStorage.getItem(`studentJustReturned_${sessionId}`) === 'true';
//     //         if (needsSyncOnReturn) {
//     //             log("-> Detected return from homework via sessionStorage flag.");
//     //             sessionStorage.removeItem(`studentJustReturned_${sessionId}`);
//     //         }

//     //         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//     //         const currentWs = new WebSocket(wsUrl);
//     //         ws.current = currentWs;

//     //         currentWs.onopen = () => {
//     //             log("Stage 2a: WebSocket connection OPENED.");
//     //             setConnectionStatus('Connected');
//     //             if (needsSyncOnReturn && roleRef.current === 'student') {
//     //                 log(">>> Connection is open and sync is needed. Requesting full workspace sync.");
//     //                 sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//     //             }
//     //         };
            
//     //         initializeWebSocketEvents(currentWs);

//     //         currentWs.onclose = () => { log("WebSocket connection CLOSED."); setConnectionStatus('Disconnected'); };
//     //         currentWs.onerror = (err) => { log(`WebSocket ERROR: ${err}`); setConnectionStatus('Connection Error'); };
//     //     }

//     //     // --- Stage 3: Initialize Media ---
//     //     const setupMedia = async () => {
//     //         try {
//     //             if (!localStreamRef.current) {
//     //                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     //                 setLocalStream(stream);
//     //                 localStreamRef.current = stream;
//     //                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//     //             }
//     //         } catch (err) {
//     //              console.error("Could not get user media.", err);
//     //              toast.error("Could not access camera/microphone. Please grant permissions.");
//     //         }
//     //     };
//     //     setupMedia();

//     //     // --- Cleanup Function ---
//     //     return () => {
//     //         log("Running cleanup for main effect.");
//     //         ws.current?.close();
//     //         ws.current = null;
//     //         localStreamRef.current?.getTracks().forEach(track => track.stop());
//     //         localStreamRef.current = null;
//     //         peerConnection.current?.close();
//     //         term.current?.dispose();
//     //         term.current = null;
//     //     };
//     // }, []);

//      useEffect(() => {
//         const log = (msg: string) => console.log(`[CLIENT LIFECYCLE - ${roleRef.current || 'unknown'}] ${msg}`);
//         log("Main lifecycle effect running.");

//         if (!token) { navigate('/login'); return; }

//         // --- Stage 1: Initialize Terminal Manager ---
//         if (terminalRef.current && !terminalManager.current) {
//             log("Stage 1: Initializing TerminalManager.");
//             terminalManager.current = new TerminalManager(terminalRef.current);
//             terminalManager.current.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN && roleRef.current === 'teacher' && viewingMode === 'teacher') {
//                     sendWsMessage('TERMINAL_IN', data);
//                 }
//             });
//             log("Stage 1 COMPLETE: TerminalManager created.");
//         }

//         // --- Stage 2: Initialize WebSocket ---
//         if (terminalManager.current && !ws.current) {
//             log("Stage 2: TerminalManager is ready. Initializing WebSocket.");
//             const needsSyncOnReturn = sessionStorage.getItem(`studentJustReturned_${sessionId}`) === 'true';
//             if (needsSyncOnReturn) {
//                 log("-> Detected return from homework.");
//                 sessionStorage.removeItem(`studentJustReturned_${sessionId}`);
//             }

//             const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//             const currentWs = new WebSocket(wsUrl);
//             ws.current = currentWs;

//             currentWs.onopen = () => {
//                 log("Stage 2a: WebSocket OPENED.");
//                 if (needsSyncOnReturn && roleRef.current === 'student') {
//                     log(">>> Requesting full workspace sync.");
//                     sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//                 }
//             };
            
//             initializeWebSocketEvents(currentWs);
//             currentWs.onclose = () => log("WebSocket CLOSED.");
//             currentWs.onerror = (err) => log(`WebSocket ERROR: ${err}`);
//         }

//         // --- Cleanup ---
//         return () => {
//             log("Running cleanup for main effect.");
//             ws.current?.close();
//             ws.current = null;
//             terminalManager.current?.dispose();
//             terminalManager.current = null;
//         };
//     }, []);

     

//     // Effect to manage session storage for homework state
//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     // Auto-start homework if conditions are met
//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     // Fetch available lessons for teacher
//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);

//      useEffect(() => {
//         if (!isDoingHomework) {
//             // When returning, we explicitly tell the manager to resize its terminal.
//             terminalManager.current?.resize();
//         }
//     }, [isDoingHomework]);

//     // Declarative Terminal Rendering Effect
//     // useEffect(() => {
//     //     if (!term.current) return;
//     //     const log = (msg: string) => console.log(`[CLIENT RENDER - ${roleRef.current || 'unknown'}] ${msg}`);

//     //     let outputToDisplay = '';
//     //     let isTerminalReadOnly = false;

//     //     if (spotlightedStudentId && spotlightWorkspace) {
//     //         const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//     //         outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//     //         isTerminalReadOnly = true;
//     //     } else if (role === 'teacher' && viewingMode !== 'teacher') {
//     //         const studentState = studentHomeworkStates.get(viewingMode);
//     //         const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//     //         outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//     //         isTerminalReadOnly = !isTeacherControllingThisStudent;
//     //     } else {
//     //         outputToDisplay = teacherTerminalOutput;
//     //         isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//     //     }
//     //     log(`Terminal render effect is running. Will write ${outputToDisplay.length} characters to the screen.`);

//     //     term.current.clear();
//     //     term.current.write(outputToDisplay);
        
//     //     if (term.current.options.disableStdin !== isTerminalReadOnly) {
//     //         term.current.options.disableStdin = isTerminalReadOnly;
//     //     }
//     // }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);
//     //  // Declarative Terminal Rendering Effect
//     // useEffect(() => {
//     //     const log = (msg: string) => console.log(`[CLIENT RENDER - ${roleRef.current || 'unknown'}] ${msg}`);
        
//     //     // Defer the imperative terminal commands to prevent race conditions with xterm's internal renderer.
//     //     const timeoutId = setTimeout(() => {
//     //         if (!term.current) {
//     //             log("Terminal effect SKIPPED: instance was disposed before timeout.");
//     //             return;
//     //         }
//     //         log("Terminal render effect is executing after timeout.");

//     //         let outputToDisplay = '';
//     //         let isTerminalReadOnly = false;

//     //         if (spotlightedStudentId && spotlightWorkspace) {
//     //             const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//     //             outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//     //             isTerminalReadOnly = true;
//     //         } else if (role === 'teacher' && viewingMode !== 'teacher') {
//     //             const studentState = studentHomeworkStates.get(viewingMode);
//     //             const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//     //             outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//     //             isTerminalReadOnly = !isTeacherControllingThisStudent;
//     //         } else {
//     //             outputToDisplay = teacherTerminalOutput;
//     //             isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//     //         }

//     //         log(` -> Will write ${outputToDisplay.length} characters to the screen.`);
//     //         term.current.clear();
//     //         term.current.write(outputToDisplay);
            
//     //         if (term.current.options.disableStdin !== isTerminalReadOnly) {
//     //             term.current.options.disableStdin = isTerminalReadOnly;
//     //         }
//     //     }, 0); // A timeout of 0ms pushes this to the end of the event queue.

//     //     // Cleanup function to prevent the command from running if the component unmounts quickly.
//     //     return () => clearTimeout(timeoutId);

//     // }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);
//     useEffect(() => {
//     // Defer the entire render logic to prevent race conditions that crash xterm.js
//     const timeoutId = setTimeout(() => {
//         if (!term.current || !fitAddon.current) {
//             return; // Guard against running after unmount
//         }

//         // Always re-fit the terminal to its container's *current* dimensions.
//         fitAddon.current.fit();

//         // Determine the correct content to display.
//         let outputToDisplay = '';
//         let isTerminalReadOnly = false;

//         if (spotlightedStudentId && spotlightWorkspace) {
//             const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//             outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//             isTerminalReadOnly = true;
//         } else if (role === 'teacher' && viewingMode !== 'teacher') {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//             outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//             isTerminalReadOnly = !isTeacherControllingThisStudent;
//         } else {
//             outputToDisplay = teacherTerminalOutput;
//             isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//         }

//         // Write the content to the now correctly-sized terminal.
//         term.current.clear();
//         term.current.write(outputToDisplay);
        
//         if (term.current.options.disableStdin !== isTerminalReadOnly) {
//             term.current.options.disableStdin = isTerminalReadOnly;
//         }
//     }, 0);

//     return () => clearTimeout(timeoutId);

// }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId, isDoingHomework]);

//     // --- Handlers and Functions ---

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };
    
//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         const log = (msg: string) => console.log(`[CLIENT WSS - ${roleRef.current || 'unknown'}] ${msg}`);
//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             const log = (msg: string) => console.log(`[CLIENT WSS - ${roleRef.current || 'unknown'}] ${msg}`);

//             log(`RECEIVED: Type = ${message.type}`);

//             switch (message.type) {
//                 case 'PRIVATE_MESSAGE': {
//                     const msg = message.payload as Message;
//                     const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 }
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId);
//                     setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         // const newOutput = message.payload.terminalOutput || '';
//                         // log(`Processing FULL WORKSPACE SYNC. Received ${newOutput.length} characters of terminal history.`);

//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                         log(`  -> Setting teacherTerminalOutput state with full history.`);
//                         setTeacherTerminalOutput(message.payload.terminalOutput || '');

//                         // if (term.current) {
//                         //    term.current.clear();
//                         //    term.current.write(newOutput);
//                         // }
//                     }
//                     break;
//                  case 'TEACHER_CODE_DID_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'TERMINAL_OUT':
//                     // This is for live stream updates.
//                     if (
//                         (roleRef.current === 'student' && !spotlightedStudentId) ||
//                         (roleRef.current === 'teacher' && viewingMode === 'teacher')
//                     ) {
//                         setTeacherTerminalOutput(prev => prev + message.payload);
//                     }
//                     break;

//                 case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': 
//                     setStudentHomeworkStates(prev => { 
//                         const map = new Map(prev); 
//                         const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; 
//                         s.terminalOutput += message.payload.output; 
//                         map.set(message.payload.studentId, s); 
//                         return map; 
//                     }); 
//                     break;
//             }
//         };
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("Error fetching homework state:", error);
//                 toast.error("A network error occurred.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };
    
//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');

//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };

//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };

//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };

//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     // Conditional Rendering for Homework View
//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//             lessonId={pendingHomework.lessonId} 
//             teacherSessionId={pendingHomework.teacherSessionId} 
//             token={token} 
//              onLeave={() => {
//                 console.log("[ACTION] Student leaving homework. Atomically updating persistent state.");
                
//                 // 1. Set the flag that tells the new instance to re-sync.
//                 sessionStorage.setItem(`studentJustReturned_${sessionId}`, 'true');
                
//                 // 2. THIS IS THE BUG FIX: Immediately update the sessionStorage value
//                 //    that controls the initial state of the next component instance.
//                 sessionStorage.setItem(`isDoingHomework_${sessionId}`, 'false');

//                 // 3. Trigger the React re-render.
//                 setIsDoingHomework(false);
//             }} 
//             initialFiles={homeworkFiles} 
//             onFilesChange={setHomeworkFiles} 
//             currentUserId={currentUserId} 
//         />;
//     }
    
//     // --- JSX Render ---
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between text-slate-200">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;
// debugging tried
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// // --- Custom Hook to track the previous value of a state/prop ---
// function usePrevious<T>(value: T): T | undefined {
//     const ref = useRef<T>();
//     useEffect(() => {
//         ref.current = value;
//     }, [value]);
//     return ref.current;
// }


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);
//     const prevIsDoingHomework = usePrevious(isDoingHomework);

//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
//         if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     // --- Effects ---

//     // Main Connection and Cleanup Effect - Runs ONCE on mount
//     useEffect(() => {
//         const log = (msg: string) => console.log(`[CLIENT - ${roleRef.current || 'unknown'}] ${msg}`);
//         log("Main effect running: Setting up WebSocket and Media.");
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const needsSyncOnReturn = sessionStorage.getItem(`justReturnedFromHomework_${sessionId}`) === 'true';
//         if (needsSyncOnReturn) {
//             log(">>> Detected return from homework via sessionStorage flag.");
//             // Clear the flag immediately so a manual refresh doesn't re-trigger.
//             sessionStorage.removeItem(`justReturnedFromHomework_${sessionId}`);
//         }

//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         log("New WebSocket object created.");

//         currentWs.onopen = () => {
//             log("WebSocket connection OPENED.");
//             setConnectionStatus('Connected');

//             // THE FIX, PART 3: Use the flag to dispatch the sync request.
//             if (needsSyncOnReturn) {
//                  log(">>> Connection is open and sync is needed. Requesting full workspace sync.");
//                  sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//             }

//             // FIX: If student just returned from homework, request a full state sync now that the connection is ready.
//             if (roleRef.current === 'student' && prevIsDoingHomework === true) {
//                  log(">>> CRITICAL: Connection opened and detected return from homework. Requesting full workspace sync.");
//                  sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//             }
//         };
//         currentWs.onclose = () => {
//              log("WebSocket connection CLOSED.");
//              setConnectionStatus('Disconnected');
//         };
//         currentWs.onerror = (err) => {
//             log(`WebSocket ERROR: ${err}`);
//             setConnectionStatus('Connection Error');
//             toast.error("A connection error occurred.");
//         };

//         initializeWebSocketEvents(currentWs);
        
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone.");
//             }
//         };
//         setupMedia();

//         return () => {
//             log("Running cleanup for main effect.");
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     // Effect to manage session storage for homework state
//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     // Auto-start homework if conditions are met
//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     // Fetch available lessons for teacher
//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons)
//             .catch(err => {
//                 console.error("Failed to fetch lessons:", err)
//                 toast.error("Could not fetch available lessons.");
//             });
//         }
//     }, [role, token]);
    
//     // Terminal Initialization Effect - Runs ONCE when the div is ready
//     useEffect(() => {
//         const log = (msg: string) => console.log(`[CLIENT - ${roleRef.current || 'unknown'}] ${msg}`);
//         if (terminalRef.current && !term.current) {
//             log("Terminal ref is ready and term instance does not exist. Initializing XTerm.");
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//             log("XTerm instance CREATED and attached to ref.");
//         }
//     }, []);

//     // Definitive Terminal Rendering Effect - The single source of truth for display
//     useEffect(() => {
//         const log = (msg: string) => console.log(`[CLIENT - ${roleRef.current || 'unknown'}] ${msg}`);
//         if (!term.current) {
//             log(`Terminal rendering SKIPPED: term.current is null.`);
//             return;
//         }
//         log(`Terminal rendering EFFECT running. Role: ${role}, Mode: ${viewingMode}`);

//         let outputToDisplay = '';
//         let isTerminalReadOnly = false;

//         if (spotlightedStudentId && spotlightWorkspace) {
//             const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//             outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//             isTerminalReadOnly = true;
//         } else if (role === 'teacher' && viewingMode !== 'teacher') {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//             outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//             isTerminalReadOnly = !isTeacherControllingThisStudent;
//         } else {
//             outputToDisplay = teacherTerminalOutput;
//             isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//         }

//         term.current.clear();
//         term.current.write(outputToDisplay);
//         log(` -> Terminal write complete. Wrote ${outputToDisplay.length} characters.`);
        
//         if (term.current.options.readOnly !== isTerminalReadOnly) {
//             term.current.options.readOnly = isTerminalReadOnly;
//         }
        
//     }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]);


//     // --- Handlers and Functions ---
//     const sendWsMessage = (type: string, payload?: object) => {
//         const log = (msg: string) => console.log(`[CLIENT - ${roleRef.current || 'unknown'}] ${msg}`);
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             log(`SENDING WS MESSAGE: Type = ${type}`);
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             log(`ERROR: WebSocket is not open. Cannot send message: ${type}`);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         const log = (msg: string) => console.log(`[CLIENT - ${roleRef.current || 'unknown'}] ${msg}`);
//         currentWs.onmessage = async (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 log(`RECEIVED WS MESSAGE: Type = ${message.type}`);

//                 switch (message.type) {
//                     case 'PRIVATE_MESSAGE': {
//                         const msg = message.payload as Message;
//                         const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
//                         if (!chatPartnerId) return;
//                         setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                         if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
//                             setUnreadMessages(prev => new Set(prev).add(msg.from));
//                         }
//                         break;
//                     }
//                     case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                     case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                     case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                     case 'ROLE_ASSIGNED':
//                         log("Processing ROLE_ASSIGNED.");
//                         setRole(message.payload.role);
//                         setFiles(message.payload.files || []);
//                         setActiveFileName(message.payload.activeFile || '');
//                         setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                         setControlledStudentId(message.payload.controlledStudentId);
//                         setIsFrozen(message.payload.isFrozen);
//                         setWhiteboardLines(message.payload.whiteboardLines || []);
//                         setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                         setTeacherId(message.payload.teacherId);
//                         log(`  -> Setting teacherTerminalOutput state from ROLE_ASSIGNED.`);
//                         setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                         break;
//                     case 'TEACHER_CODE_DID_UPDATE':
//                         if (roleRef.current === 'student' && !spotlightedStudentId) {
//                             log("Processing lightweight code update.");
//                             setFiles(message.payload.files);
//                             setActiveFileName(message.payload.activeFileName);
//                         }
//                         break;
//                     case 'TEACHER_WORKSPACE_UPDATE':
//                         if (roleRef.current === 'student' && !spotlightedStudentId) {
//                             log("Processing TEACHER_WORKSPACE_UPDATE for student.");
                            
//                             // 1. Update React state as before to keep it in sync for future renders.
//                             setFiles(message.payload.files);
//                             setActiveFileName(message.payload.activeFileName);
//                             setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                             log(`  -> React state for teacherTerminalOutput is being set.`);

//                             // 2. THE DEFINITIVE FIX: Check if the terminal instance exists and
//                             //    imperatively write the full history to it RIGHT NOW.
//                             //    This bypasses the React render-cycle lag for the initial sync.
//                             if (term.current && message.payload.terminalOutput !== undefined) {
//                                 log(`>>> CRITICAL SYNC: Imperatively writing full terminal history (${message.payload.terminalOutput.length} chars) to xterm instance.`);
//                                 term.current.clear();
//                                 term.current.write(message.payload.terminalOutput);
//                             } else {
//                                 log(`>>> WARNING: Could not perform imperative sync write. Terminal instance not ready.`);
//                             }
//                         }
//                         break;
//                     case 'TERMINAL_OUT':
//                         if ((roleRef.current === 'teacher' && viewingMode === 'teacher') || (roleRef.current === 'student' && !spotlightedStudentId)) {
//                            setTeacherTerminalOutput(prev => prev + message.payload);
//                         }
//                         break;
//                     case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                     case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                     case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error("ICE Candidate Error:", e)); break;
//                     case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                     case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                     case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                     case 'STUDENT_WORKSPACE_UPDATED':
//                         setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                         if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                         break;
//                     case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                     case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                     case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                     case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                     case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                     case 'HOMEWORK_TERMINAL_UPDATE': 
//                         setStudentHomeworkStates(prev => { 
//                             const map = new Map(prev); 
//                             const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; 
//                             s.terminalOutput += message.payload.output; 
//                             map.set(message.payload.studentId, s); 
//                             return map; 
//                         }); 
//                         break;
//                 }
//             } catch (error) {
//                 console.error("Failed to process WebSocket message:", error);
//                 toast.error("An error occurred processing a message from the server.")
//             }
//         };
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("Error fetching homework state:", error);
//                 toast.error("A network error occurred.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher' && !isTeacherControllingThisStudent) {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };
    
//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');

//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };

//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };

//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
    
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };

//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     // Conditional Rendering for Homework View
//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//             lessonId={pendingHomework.lessonId} 
//             teacherSessionId={pendingHomework.teacherSessionId} 
//             token={token} 
//             onLeave={() => {
//                 sessionStorage.setItem(`justReturnedFromHomework_${sessionId}`, 'true');
//                 setIsDoingHomework(false);
//             }} 
//             initialFiles={homeworkFiles} 
//             onFilesChange={setHomeworkFiles} 
//             currentUserId={currentUserId}  
//         />;
//     }
    
//     // --- JSX Render ---
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between text-slate-200">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;
// // /*
// //  * =================================================================
// //  * FOLDER: src/pages/
// //  * FILE:   LiveTutorialPage.tsx (CoreZenith V5 - Terminal Bug Fixed)
// //  * =================================================================
// //  * DESCRIPTION: This is the definitive, corrected version. It FIXES the
// //  * critical bug preventing teacher terminal input, restores workspace
// //  * switching, and uses a high-contrast design, while preserving 100%
// //  * of the original functionality from both MVP files.
// //  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers (100% Original) ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };
// const log = (msg: string) => console.log(`[CLIENT - ${role || 'unknown'}] ${msg}`);


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// function usePrevious<T>(value: T): T | undefined {
//     const ref = useRef<T>();
//     useEffect(() => {
//         ref.current = value;
//     }, [value]);
//     return ref.current;
// }


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management (100% Original) ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [teacherTerminalOutput, setTeacherTerminalOutput] = useState('');


   
//      const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs (100% Original) ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);
//     const prevIsDoingHomework = usePrevious(isDoingHomework);

//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State (100% Original and Correct) ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) return spotlightWorkspace;
//         if (role === 'teacher' && viewingMode !== 'teacher') return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     // --- All useEffect hooks are preserved from the original, functional version ---
//     useEffect(() => {
//         log("Main effect running. Setting up WebSocket and Media.");

//         if (!token) { navigate('/login'); return; }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         // error handling
//         currentWs.onopen = () => {
//         log("WebSocket connection OPENED.");
//         setConnectionStatus('Connected');
//         // If we are a student returning, this is where we request the sync.
//         if (role === 'student' && prevIsDoingHomework === true && isDoingHomework === false) {
//              log("Connection opened and we just returned from homework. Requesting sync.");
//              sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//         }
//     };
//     // error handling^
//         initializeWebSocketEvents(currentWs);
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone.");
//             }
//         };
//         setupMedia();
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate, isDoingHomework]);

//     useEffect(() => {
//         // We only want to fire when the state changes from TRUE (previous) to FALSE (current).
//         if (role === 'student' && prevIsDoingHomework === true && isDoingHomework === false) {
//             console.log("[SYNC] Student has returned from homework. Requesting workspace sync.");
//             sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//         }
//     }, [isDoingHomework, prevIsDoingHomework, role, ws]); 
//     //  useEffect(() => {
//     //     const wasDoingHomework = sessionStorage.getItem(`isDoingHomework_${sessionId}`) === 'true';
//     //     if (role === 'student' && !isDoingHomework && wasDoingHomework) {
//     //         sendWsMessage('STUDENT_RETURN_TO_CLASSROOM');
//     //     }
//     // }, [isDoingHomework, role, sessionId]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);
//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     // useEffect(() => {
//     //     if (term.current && roleRef.current === 'teacher' && viewingMode === 'teacher') {
//     //         // Teacher's own terminal is interactive and doesn't need this kind of state-based clearing.
//     //     } else if (term.current) {
//     //         // This handles what a user sees when viewing SOMEONE ELSE's workspace.
//     //         if (spotlightedStudentId && spotlightWorkspace) {
//     //             term.current.clear();
//     //             term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//     //         } else if (role === 'teacher' && viewingMode !== 'teacher') {
//     //             const studentState = studentHomeworkStates.get(viewingMode);
//     //             term.current.clear();
//     //             term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//     //         }
//     //     }
//     // }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     // useEffect(() => {
//     //     if (!term.current) return;

//     //     if (spotlightedStudentId && spotlightWorkspace) {
//     //         term.current.clear();
//     //         const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//     //         term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${studentName}'s spotlight...\r\n`);
//     //     } else if (role === 'teacher' && viewingMode !== 'teacher') {
//     //         const studentState = studentHomeworkStates.get(viewingMode);
//     //         const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//     //         term.current.clear();
//     //         term.current.write(studentState?.terminalOutput || `\r\nWatching ${studentName}'s terminal...\r\n`);
//     //     } else if (role === 'teacher' && viewingMode === 'teacher') {
//     //         // When teacher returns to their own view, restore their terminal from state
//     //         term.current.clear();
//     //         term.current.write(teacherTerminalOutput);
//     //     }
//     //     // NOTE: The student's view of the teacher terminal is handled reactively 
//     //     // by the `TEACHER_WORKSPACE_UPDATE` and `TERMINAL_OUT` WebSocket events directly.

//     // }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students, teacherTerminalOutput]);
//     useEffect(() => {
//     if (!term.current) return; // Guard clause: do nothing if terminal isn't initialized

//     let outputToDisplay = '';
//     let isTerminalReadOnly = false;

//     // SCENARIO 1: A student is being spotlighted. Everyone sees their workspace.
//     if (spotlightedStudentId && spotlightWorkspace) {
//         const studentName = students.find(s => s.id === spotlightedStudentId)?.username || 'student';
//         outputToDisplay = spotlightWorkspace.terminalOutput || `\r\n--- Viewing Spotlight: ${studentName} ---\r\n`;
//         isTerminalReadOnly = true; // No one can type in a spotlighted terminal
    
//     // SCENARIO 2: Teacher is viewing a student's homework workspace.
//     } else if (role === 'teacher' && viewingMode !== 'teacher') {
//         const studentState = studentHomeworkStates.get(viewingMode);
//         const studentName = students.find(s => s.id === viewingMode)?.username || 'student';
//         outputToDisplay = studentState?.terminalOutput || `\r\n--- Watching ${studentName}'s Terminal ---\r\n`;
//         // Interactivity is handled by the onTerminalData function, so we don't set read-only here.
//         isTerminalReadOnly = !isTeacherControllingThisStudent;

//     // SCENARIO 3: Default view. Teacher sees their own terminal, Student sees the teacher's terminal.
//     } else {
//         outputToDisplay = teacherTerminalOutput;
//         // The terminal is only interactive for the teacher in their own workspace.
//         isTerminalReadOnly = (role !== 'teacher' || viewingMode !== 'teacher');
//     }

//     // Perform the update
//     term.current.clear();
//     term.current.write(outputToDisplay);
    
//     // Explicitly set the readOnly option for the terminal instance
//     if (term.current.options.readOnly !== isTerminalReadOnly) {
//         term.current.options.readOnly = isTerminalReadOnly;
//     }
    
// }, [role, viewingMode, teacherTerminalOutput, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, students, controlledStudentId]); // A comprehensive dependency array


//     // --- All Handlers and Functions are preserved from the original, functional version ---
//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };
//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };
//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             log(`RECEIVED WS MESSAGE: Type = ${message.type}`);
//             switch (message.type) {
//                 // case 'PRIVATE_MESSAGE':
//                 //     const msg = message.payload as Message;
//                 //     const chatPartnerId = roleRef.current === 'teacher' ? msg.from : teacherIdRef.current;
//                 //     if (!chatPartnerId) return;
//                 //     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                 //     if (roleRef.current === 'teacher' && activeChatStudentIdRef.current !== msg.from) {
//                 //         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                 //     }
//                 //     break;
//                 case 'PRIVATE_MESSAGE':
//                     const msg = message.payload as Message;
//                     const currentRole = roleRef.current;
//                     const currentTeacherId = teacherIdRef.current;
//                     const currentActiveChatId = activeChatStudentIdRef.current;
//                     const chatPartnerId = currentRole === 'teacher' ? msg.from : currentTeacherId;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (currentRole === 'teacher' && currentActiveChatId !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId);
//                     // if (message.payload.role === 'student' && term.current && message.payload.terminalOutput) {
//                     //     term.current.clear();
//                     //     term.current.write(message.payload.terminalOutput);
//                     // };
//                     setTeacherTerminalOutput(message.payload.terminalOutput || ''); // <-- Add this
//                     // if (message.payload.role === 'student' && term.current && message.payload.terminalOutput) {
//                     //     term.current.clear();
//                     //     term.current.write(message.payload.terminalOutput);
//                     // }
//                     break;
//                 case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 // case 'TEACHER_WORKSPACE_UPDATE': if (roleRef.current === 'student' && !spotlightedStudentId) { setFiles(message.payload.files); setActiveFileName(message.payload.activeFileName); } break;
//                 // case 'TEACHER_WORKSPACE_UPDATE':
//                 //     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                 //         setFiles(message.payload.files);
//                 //         setActiveFileName(message.payload.activeFileName);
//                 //          if (term.current && message.payload.terminalOutput !== undefined) {
//                 //             term.current.clear();
//                 //             term.current.write(message.payload.terminalOutput);
//                 //         }
//                 //     }
//                 //     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (roleRef.current === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                         setTeacherTerminalOutput(message.payload.terminalOutput || '');
//                         // if (term.current && message.payload.terminalOutput !== undefined) {
//                         //     term.current.clear();
//                         //     term.current.write(message.payload.terminalOutput);
//                         // }
//                     }
//                     break;

            
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': setStudentHomeworkStates(prev => { const map = new Map(prev); const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; s.terminalOutput += message.payload.output; map.set(message.payload.studentId, s); return map; }); break;
//                 case 'TERMINAL_OUT':
//                     // We only write to the terminal if we are the teacher in our own workspace,
//                     // or if we are a student watching the teacher (not spotlighted).
//                     if ((roleRef.current === 'teacher' && viewingMode === 'teacher') || (roleRef.current === 'student' && !spotlightedStudentId)) {
//                         // term.current?.write(message.payload);
//                         setTeacherTerminalOutput(prev => prev + message.payload); 

//                     }
//                     break;
//             }
//         };
//     };
//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("Error fetching homework state:", error);
//                 toast.error("A network error occurred.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };
//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
//         const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };
//     // const handleActiveFileChange = (fileName: string) => {
//     //     if (role === 'teacher' && viewingMode !== 'teacher') {
//     //         setStudentHomeworkStates(prev => {
//     //             const prevState = prev.get(viewingMode) || { files: [], activeFileName: '', terminalOutput: '' };
//     //             return new Map(prev).set(viewingMode, { ...prevState, activeFileName: fileName });
//     //         });
//     //     } else if (isTeacherControllingThisStudent) {
//     //         const studentState = studentHomeworkStates.get(viewingMode);
//     //         if (!studentState) return;
//     //         sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//     //     } else if (role === 'teacher' && viewingMode === 'teacher') {
//     //          setActiveFileName(fileName);
//     //          sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//     //     }
//     // };
//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     // *** CRITICAL BUG FIX: The payload was incorrect. It should send the raw data string, not an object. ***
//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };
    

//     // const handleRunCode = () => {
//     //     if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//     //         sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//     //     }
//     // };
//         const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };
//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };
//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };
//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };
//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView lessonId={pendingHomework.lessonId} teacherSessionId={pendingHomework.teacherSessionId} token={token} onLeave={() => setIsDoingHomework(false)} initialFiles={homeworkFiles} onFilesChange={setHomeworkFiles} currentUserId={currentUserId} />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-800 border-red-700 hover:bg-red-700 text-white font-semibold">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold text-white">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between text-slate-200">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white font-bold">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 font-semibold"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b-2 border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t-2 border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-2 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   LiveTutorialPage.tsx (CoreZenith V3 - Workspace Bug Fixed)
//  * =================================================================
//  * DESCRIPTION: This is the definitive, corrected version. It FIXES the
//  * critical bug where the teacher's editor view did not update when
//  * selecting a student. 100% of the original functionality is preserved
//  * within the high-contrast, immersive CoreZenith design.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Brush, Trash2, MessageCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Type Definitions and Helpers (100% Original) ---
// interface Message { from: string; text: string; timestamp: string; }
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) { console.error("Invalid token:", error); return null; }
// };
// const stunServers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };


// // --- CoreZenith Styled Components ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     // --- State Management (100% Original) ---
//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;
//     const [role, setRole] = useState<UserRole>(initialUserRole);
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
//     const [teacherId, setTeacherId] = useState<string | null>(null);
//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);

//     // --- Refs (100% Original) ---
//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);
//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     // --- Computed State (100% Original and Correct) ---
//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = (role === 'student' && (isFrozen || !!spotlightedStudentId)) || (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     // --- All useEffect hooks are preserved from the original, functional version ---
//     useEffect(() => {
//         if (!token) { navigate('/login'); return; }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone.");
//             }
//         };
//         setupMedia();
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' }, fontSize: 14 });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     // --- All Handlers and Functions are preserved from the original, functional version ---
//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');
//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             switch (message.type) {
//                 case 'PRIVATE_MESSAGE':
//                     const msg = message.payload as Message;
//                     const currentRole = roleRef.current;
//                     const currentTeacherId = teacherIdRef.current;
//                     const currentActiveChatId = activeChatStudentIdRef.current;
//                     const chatPartnerId = currentRole === 'teacher' ? msg.from : currentTeacherId;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (currentRole === 'teacher' && currentActiveChatId !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId); 
//                     break;
//                 case 'WEBRTC_OFFER': if (roleRef.current === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 case 'TEACHER_WORKSPACE_UPDATE': if (roleRef.current === 'student' && !spotlightedStudentId) { setFiles(message.payload.files); setActiveFileName(message.payload.activeFileName); } break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': setStudentHomeworkStates(prev => { const map = new Map(prev); const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; s.terminalOutput += message.payload.output; map.set(message.payload.studentId, s); return map; }); break;
//                 case 'TERMINAL_OUT': term.current?.write(message.payload); break;
//             }
//         };
//     };
    
//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
    
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
    
//     // const handleActiveFileChange = (fileName: string) => {
//     //     if (role === 'teacher' && viewingMode !== 'teacher') {
//     //         setStudentHomeworkStates(prev => new Map(prev).set(viewingMode, {...(prev.get(viewingMode) || { files: [], activeFileName: '' }), activeFileName: fileName }));
//     //     } else if (isTeacherControllingThisStudent) {
//     //         const studentState = studentHomeworkStates.get(viewingMode);
//     //         if (!studentState) return;
//     //         sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//     //     } else if (role === 'teacher' && viewingMode === 'teacher') {
//     //          setActiveFileName(fileName);
//     //          sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//     //     }
//     // };
//         const handleActiveFileChange = (fileName: string) => {
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             // Teacher changes view of student file, no edit sent.
//             setStudentHomeworkStates(prev => {
//                 const prevState = prev.get(viewingMode) || { files: [], activeFileName: '', terminalOutput: '' };
//                 return new Map(prev).set(viewingMode, { ...prevState, activeFileName: fileName });
//             });
//         } else if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';
//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };

//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id.toString() === lessonId.toString());
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', { data });
//         }
//     };

    

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
//     const handleViewStudentCam = async (studentId: string) => {
//         if (!localStreamRef.current) { toast.error("Your camera is not available."); return; }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) { toast.error("Failed to initiate video call."); }
//     };
    
//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) { toast.error("Could not accept call."); setIncomingCall(null); return; }
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) { toast.error("Failed to answer video call."); }
//         finally { setIncomingCall(null); }
//     };
    
//     const toggleMute = () => { if (localStream) { localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMuted(!isMuted); } };
//     const toggleCamera = () => { if (localStream) { localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsCameraOff(!isCameraOff); } };
//     const handleDraw = (line: Line) => sendWsMessage('WHITEBOARD_DRAW', { line });
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; });
//     };
    
//     const handleSendMessage = (text: string) => {
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) { toast.error("Recipient not found."); return; }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text: message.text });
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString() };
//             newMap.set(to, [...(newMap.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView lessonId={pendingHomework.lessonId} teacherSessionId={pendingHomework.teacherSessionId} token={token} onLeave={() => setIsDoingHomework(false)} initialFiles={homeworkFiles} onFilesChange={setHomeworkFiles} currentUserId={currentUserId} />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//             <AlertDialog open={!!incomingCall}>
//                 <GlassAlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-cyan-300">Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription className="text-slate-300">Your teacher ({incomingCall?.username}) would like to start a video call.</AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)} className="bg-red-900/80 border-red-700 hover:bg-red-800 text-slate-100">Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </GlassAlertDialogContent>
//             </AlertDialog>
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             {/* <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'} className={cn('font-bold', role === 'teacher' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-slate-200')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge variant="destructive" className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white font-bold"><Star className="mr-2 h-4 w-4" />SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge variant="destructive" className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white font-bold"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button variant="outline" size="sm" onClick={handleRaiseHand} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button variant="outline" size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="text-slate-300 border-slate-600 hover:bg-slate-800"><MessageCircle className="mr-2 h-4 w-4" />Chat with Teacher</Button>}
//                     {role === 'teacher' && <Button variant={isFrozen ? "destructive" : "outline"} size="sm" onClick={handleToggleFreeze} className={cn(!isFrozen && 'text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button variant="outline" size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="text-slate-300 border-slate-600 hover:bg-slate-800"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button variant="destructive" size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')}><Trash2 className="mr-2 h-4 w-4" />Clear Board</Button>}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header> */}
//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
//                 <h1 className="text-xl font-bold text-slate-100">CoreZenith Command Deck</h1>
//                 <div className="flex items-center gap-2 font-semibold">
//                     {/* --- BADGE STYLES - Increased contrast --- */}
//                     <Badge className={cn('text-white', role === 'teacher' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700')}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Star className="mr-2 h-4 w-4" />SPOTLIGHT: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge className="animate-pulse bg-fuchsia-600 border-fuchsia-500 text-white"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline" className="border-slate-600 text-slate-300">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
                    
//                     {/* --- BUTTON STYLES - Switched to solid backgrounds for high contrast --- */}
//                     {role === 'student' && <Button size="sm" onClick={handleRaiseHand} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold"><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'student' && <Button size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button>}
                    
//                     {role === 'teacher' && <Button size="sm" onClick={handleToggleFreeze} className={cn('font-bold text-white', isFrozen ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500')}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
//                     {role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Brush className="mr-2 h-4 w-4" />{isWhiteboardVisible ? "Hide Board" : "Show Board"}</Button>}
//                     {isWhiteboardVisible && role === 'teacher' && <Button size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')} className="bg-red-600 hover:bg-red-500 text-white font-semibold"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>}
//                 </div>
//                 <Button onClick={() => navigate('/dashboard')} className="bg-red-600 hover:bg-red-500 text-white font-bold"><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && !isDoingHomework && (
//                 <Alert className="relative z-10 rounded-none border-l-0 border-r-0 border-t-0 border-b border-blue-500/50 bg-blue-950/40 text-blue-200">
//                     <AlertTitle className="font-bold">New Assignment Received!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your instructor has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={handleStartHomework} className="bg-blue-500 hover:bg-blue-400 text-white">Start Lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="relative z-10 flex-grow flex flex-row overflow-hidden p-4 gap-4">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30} className="flex flex-col">
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-slate-950/20">
//                                         <div className="p-3 border-b border-slate-800 flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile} className="h-7 w-7 text-slate-400 hover:bg-slate-700"><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1 px-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => !isEditorReadOnly && handleActiveFileChange(file.name)} 
//                                                     className={cn('flex items-center px-2 py-1.5 rounded-md text-sm transition-colors', isEditorReadOnly ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200 hover:bg-slate-800', displayedWorkspace.activeFileName === file.name && 'bg-cyan-500/10 text-cyan-300 font-semibold')}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5 text-slate-500" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-1.5 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-slate-950/30 border-b border-slate-800">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
//                                                             <SelectContent className="bg-slate-900 border-slate-700 text-slate-200"><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem></SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><Play className="mr-2 h-4 w-4" /> Run</Button>}
//                                                         {/* {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile} className="bg-slate-700 hover:bg-slate-600 text-slate-200"><Play className="mr-2 h-4 w-4" /> Run</Button>} */}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly, fontSize: 14 }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-1.5 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#0D1117]">
//                                                     <div className="p-2 bg-slate-800/80 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                             {isWhiteboardVisible && ( <>
//                                 <PanelResizeHandle className="h-1.5 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                                 <Panel defaultSize={40} minSize={20} className="rounded-b-lg border-t border-slate-700/80 bg-slate-900/40 backdrop-blur-lg">
//                                     <WhiteboardPanel lines={whiteboardLines} isTeacher={role === 'teacher'} onDraw={handleDraw} />
//                                 </Panel>
//                             </>)}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-800/50 hover:bg-slate-700/80 transition-colors" />
//                     <Panel defaultSize={25} minSize={20} maxSize={40} className="rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                         <RosterPanel
//                             role={role} students={students} viewingMode={viewingMode} setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents} handsRaised={handsRaised} handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId} handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId} setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons} handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} remoteStream={remoteStream}
//                             isMuted={isMuted} toggleMute={toggleMute} isCameraOff={isCameraOff} toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId} handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat} unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage} onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []} currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"} onSendMessage={handleSendMessage} onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;


// MVP
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel';
// import { ChatPanel } from '../components/classroom/ChatPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Unlock, Brush, Trash2 } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// import { MessageCircle } from 'lucide-react';

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- NEW: Define Message type for chat ---
// interface Message {
//     from: string;
//     text: string;
//     timestamp: string;
// }

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);

//     // --- NEW: State for Chat ---
//     const [chatMessages, setChatMessages] = useState<Map<string, Message[]>>(new Map());
//     const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());

//     const [teacherId, setTeacherId] = useState<string | null>(null);

//     const [isStudentChatOpen, setIsStudentChatOpen] = useState(false);



//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);
//     const roleRef = useRef(role);
//     const teacherIdRef = useRef(teacherId);
//     const activeChatStudentIdRef = useRef(activeChatStudentId);
//     useEffect(() => { roleRef.current = role; }, [role]);
//     useEffect(() => { teacherIdRef.current = teacherId; }, [teacherId]);
//     useEffect(() => { activeChatStudentIdRef.current = activeChatStudentId; }, [activeChatStudentId]);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();
    
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = 
//         (role === 'student' && !!spotlightedStudentId) ||
//         (role === 'teacher' && !!spotlightedStudentId && spotlightedStudentId !== controlledStudentId) ||
//         (role === 'student' && !spotlightedStudentId) ||
//         (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     useEffect(() => {
//         if (!token) { navigate('/login'); return; }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
        
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone. Please check permissions.");
//             }
//         };
//         setupMedia();
        
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             if (homeworkFiles) sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => { if (pendingHomework && isDoingHomework && !homeworkFiles) handleStartHomework(); }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         if (role === 'teacher') {
//             fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } })
//             .then(res => res.ok ? res.json() : [])
//             .then(setAvailableLessons);
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };

//     const createPeerConnection = (targetId: string) => {
//         if (peerConnection.current) peerConnection.current.close();
//         const pc = new RTCPeerConnection(stunServers);
//         pc.onicecandidate = (event) => { if (event.candidate) sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate }); };
//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
//             }
//         };
//         pc.onconnectionstatechange = () => { if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') setRemoteStream(null); };
//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');
//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             const userRole = token ? simpleJwtDecode(token)?.user?.role : undefined;
//             switch (message.type) {
//                 // case 'PRIVATE_MESSAGE':
//                 //     const msg = message.payload as Message;
//                 //     const chatPartnerId = userRole === 'teacher' ? msg.from : teacherId;
//                 //     if (!chatPartnerId) return;

//                 //     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                 //     if (userRole === 'teacher' && activeChatStudentId !== msg.from) {
//                 //         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                 //     }
//                 //     break;
//                 case 'PRIVATE_MESSAGE':
//                     const msg = message.payload as Message;
//                     const currentRole = roleRef.current;
//                     const currentTeacherId = teacherIdRef.current;
//                     const currentActiveChatId = activeChatStudentIdRef.current;
//                     const chatPartnerId = currentRole === 'teacher' ? msg.from : currentTeacherId;
//                     if (!chatPartnerId) return;
//                     setChatMessages(prev => new Map(prev).set(chatPartnerId, [...(prev.get(chatPartnerId) || []), msg]));
//                     if (currentRole === 'teacher' && currentActiveChatId !== msg.from) {
//                         setUnreadMessages(prev => new Set(prev).add(msg.from));
//                     }
//                     break;
//                 case 'WHITEBOARD_VISIBILITY_UPDATE': setIsWhiteboardVisible(message.payload.isVisible); break;
//                 case 'WHITEBOARD_UPDATE': setWhiteboardLines(prevLines => [...prevLines, message.payload.line]); break;
//                 case 'WHITEBOARD_CLEAR': setWhiteboardLines([]); break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     setTeacherId(message.payload.teacherId); 

//                     break;
//                 case 'WEBRTC_OFFER': if (role === 'student') setIncomingCall(message.payload); break;
//                 case 'WEBRTC_ANSWER': if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer)); break;
//                 case 'WEBRTC_ICE_CANDIDATE': if (peerConnection.current?.remoteDescription) await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate)).catch(e => console.error(e)); break;
//                 case 'CONTROL_STATE_UPDATE': setControlledStudentId(message.payload.controlledStudentId); break;
//                 case 'FREEZE_STATE_UPDATE': setIsFrozen(message.payload.isFrozen); break;
//                 case 'STUDENT_LIST_UPDATE': setStudents(message.payload.students); break;
//                 case 'TEACHER_WORKSPACE_UPDATE': if (role === 'student' && !spotlightedStudentId) { setFiles(message.payload.files); setActiveFileName(message.payload.activeFileName); } break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     setStudentHomeworkStates(prev => new Map(prev).set(message.payload.studentId, { ...prev.get(message.payload.studentId), ...message.payload.workspace }));
//                     if (spotlightedStudentId === message.payload.studentId) setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_ASSIGNED': setPendingHomework(message.payload); setHomeworkFiles(null); setIsDoingHomework(false); break;
//                 case 'HAND_RAISED_LIST_UPDATE': setHandsRaised(new Set(message.payload.studentsWithHandsRaised)); break;
//                 case 'SPOTLIGHT_UPDATE': setSpotlightedStudentId(message.payload.studentId); setSpotlightWorkspace(message.payload.workspace); break;
//                 case 'HOMEWORK_JOIN': setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId)); break;
//                 case 'HOMEWORK_LEAVE': setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; }); break;
//                 case 'HOMEWORK_TERMINAL_UPDATE': setStudentHomeworkStates(prev => { const map = new Map(prev); const s = map.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' }; s.terminalOutput += message.payload.output; map.set(message.payload.studentId, s); return map; }); break;
//                 case 'TERMINAL_OUT': term.current?.write(message.payload); break;
//             }
//         };
//     };

    
   

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
    
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
    
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     // const handleAddFile = () => {
//     //     if (role !== 'teacher' || viewingMode !== 'teacher') return;
//     //     const newFileName = prompt("Enter new file name:");
//     //     if (newFileName && !files.some(f => f.name === newFileName)) {
//     //         const newFile = { name: newFileName, language: 'javascript', content: '' };
//     //         const updatedFiles = [...files, newFile];
//     //         setFiles(updatedFiles);
//     //         setActiveFileName(newFileName);
//     //         sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//     //     }
//     // };
//      const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js, main.py, App.java):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';

//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };

//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
    
//     const handleViewStudentCam = async (studentId: string) => {
//         console.log(`[WEBRTC] Teacher requesting to view cam for student: ${studentId}`);
//         if (!localStreamRef.current) {
//             toast.error("Your camera is not available. Please check permissions.");
//             return;
//         }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             console.log(`[WEBRTC] Created offer. Sending to student ${studentId}`);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating offer:", error);
//             toast.error("Failed to initiate video call.");
//         }
//     };
    
//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) {
//             toast.error("Could not accept call. Your camera might not be ready.");
//             setIncomingCall(null);
//             return;
//         }
//         console.log(`[WEBRTC] Student accepting call from ${incomingCall.from}`);
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             console.log(`[WEBRTC] Created answer. Sending back to teacher ${incomingCall.from}`);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating answer:", error);
//             toast.error("Failed to answer video call.");
//         } finally {
//             setIncomingCall(null);
//         }
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     const handleDraw = (line: Line) => {
//         sendWsMessage('WHITEBOARD_DRAW', { line });
//     };

//     // if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//     //     return <HomeworkView 
//     //                 lessonId={pendingHomework.lessonId} 
//     //                 teacherSessionId={pendingHomework.teacherSessionId} 
//     //                 token={token} 
//     //                 onLeave={() => setIsDoingHomework(false)} 
//     //                 initialFiles={homeworkFiles}
//     //                 onFilesChange={setHomeworkFiles}
//     //                 currentUserId={currentUserId}
//     //             />;
//     // }
//     const handleOpenChat = (studentId: string) => {
//         setActiveChatStudentId(studentId);
//         setUnreadMessages(prev => {
//             const newSet = new Set(prev);
//             newSet.delete(studentId);
//             return newSet;
//         });
//     };
    
//     const handleSendMessage = (text: string) => {
//         // FIX: Use the stored teacherId for students, making the logic simpler and correct.
//         const to = role === 'teacher' ? activeChatStudentId : teacherId;
//         if (!to) {
//             toast.error("Could not find recipient for chat message.");
//             return;
//         }
//         const message: Omit<Message, 'timestamp'> = { from: currentUserId!, text };
//         sendWsMessage('PRIVATE_MESSAGE', { to, text });
//         // Optimistically update the local chat history
//         setChatMessages(prev => {
//             const newMap = new Map(prev);
//             const fullMessage: Message = { ...message, timestamp: new Date().toISOString(), to };
//             newMap.set(to, [...(prev.get(to) || []), fullMessage]);
//             return newMap;
//         });
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView lessonId={pendingHomework.lessonId} teacherSessionId={pendingHomework.teacherSessionId} token={token} onLeave={() => setIsDoingHomework(false)} initialFiles={homeworkFiles} onFilesChange={setHomeworkFiles} currentUserId={currentUserId} />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <AlertDialog open={!!incomingCall}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             Your teacher ({incomingCall?.username}) would like to view your camera.
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)}>Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall}>Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
//             <Toaster richColors position="top-right" />
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge variant="destructive" className="animate-pulse"><Star className="mr-2 h-4 w-4" />SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge variant="destructive" className="animate-pulse"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {/* {role === 'student' && <Button variant="outline" size="sm" onClick={handleRaiseHand}><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>
//                     } */}
//                     {role === 'student' && (
//                         <>
//                             <Button variant="outline" size="sm" onClick={handleRaiseHand}><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>
//                             {/* --- NEW: Chat button for student --- */}
//                             <Button variant="outline" size="sm" onClick={() => setIsStudentChatOpen(prev => !prev)}>
//                                 <MessageCircle className="mr-2 h-4 w-4" />
//                                 {isStudentChatOpen ? 'Close Chat' : 'Chat with Teacher'}
//                             </Button>
//                         </>
//                     )}
//                     {role === 'teacher' && <Button variant={isFrozen ? "destructive" : "outline"} size="sm" onClick={handleToggleFreeze}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
                    
//                     {/* --- NEW: Whiteboard Controls for Teacher --- */}
//                     {role === 'teacher' && (
//                         <>
//                             <Button variant="outline" size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')}>
//                                 <Brush className="mr-2 h-4 w-4" />
//                                 {isWhiteboardVisible ? "Hide Board" : "Show Board"}
//                             </Button>
//                             {isWhiteboardVisible && (
//                                 <Button variant="destructive" size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')}>
//                                     <Trash2 className="mr-2 h-4 w-4" />
//                                     Clear Board
//                                 </Button>
//                             )}
//                         </>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         {/* --- NEW: Layout now includes a vertical panel group for the whiteboard --- */}
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                         <div className="p-3 border-b flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20}>
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                             <SelectContent>
//                                                                 <SelectItem value="javascript">JavaScript</SelectItem>
//                                                                 <SelectItem value="python">Python</SelectItem>
//                                                                 <SelectItem value="java">Java</SelectItem>
//                                                             </SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                                     <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>

//                             {isWhiteboardVisible && (
//                                 <>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={40} minSize={20}>
//                                         <WhiteboardPanel 
//                                             lines={whiteboardLines}
//                                             isTeacher={role === 'teacher'}
//                                             onDraw={handleDraw}
//                                         />
//                                     </Panel>
//                                 </>
//                             )}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId}
//                             handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat}
//                             unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//             {role === 'teacher' && activeChatStudentId && (
//                 <ChatPanel
//                     messages={chatMessages.get(activeChatStudentId) || []}
//                     currentUserId={currentUserId}
//                     chattingWithUsername={students.find(s => s.id === activeChatStudentId)?.username || 'Student'}
//                     onSendMessage={handleSendMessage}
//                     onClose={() => setActiveChatStudentId(null)}
//                 />
//             )}
//             {role === 'student' && isStudentChatOpen && teacherId && (
//                  <ChatPanel
//                     messages={chatMessages.get(teacherId) || []}
//                     currentUserId={currentUserId}
//                     chattingWithUsername={"Teacher"}
//                     onSendMessage={handleSendMessage}
//                     onClose={() => setIsStudentChatOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default LiveTutorialPage;

// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';
// import { WhiteboardPanel, Line } from '../components/classroom/WhiteboardPanel'; // <-- IMPORT THE NEW COMPONENT AND TYPE
// import { ChatPanel } from '../components/classroom/ChatPanel'; // <-- IMPORT THE NEW COMPONENT
// import { MessageCircle } from 'lucide-react'; // <-- Import new icon
// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Unlock, Brush, Trash2 } from 'lucide-react'; // Added Brush, Trash2
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';


// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);
    
//     // --- NEW: State for the whiteboard ---
//     const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
//     const [whiteboardLines, setWhiteboardLines] = useState<Line[]>([]);

//     // State for chat
   

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();
    
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;
//     const isEditorReadOnly = 
//         (role === 'student' && !!spotlightedStudentId) ||
//         (role === 'teacher' && !!spotlightedStudentId && spotlightedStudentId !== controlledStudentId) ||
//         (role === 'student' && !spotlightedStudentId) ||
//         (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
        
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone. Please check permissions.");
//             }
//         };
//         setupMedia();
        
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//         // added activeChatStudentId
//     }, [sessionId, token, navigate, activeChatStudentId]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };

    

//     const createPeerConnection = (targetId: string) => {
//         console.log(`[WEBRTC] Creating new RTCPeerConnection for target: ${targetId}`);
//         if (peerConnection.current) {
//             peerConnection.current.close();
//         }
//         const pc = new RTCPeerConnection(stunServers);

//         pc.onicecandidate = (event) => {
//             if (event.candidate) {
//                 sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate });
//             }
//         };

//         pc.ontrack = (event) => {
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) {
//                     remoteVideoRef.current.srcObject = event.streams[0];
//                 }
//             }
//         };
        
//         pc.onconnectionstatechange = () => {
//             if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
//                 setRemoteStream(null);
//             }
//         };

//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => {
//                 pc.addTrack(track, localStreamRef.current!);
//             });
//         }
//         peerConnection.current = pc;
//         return pc;
//     };

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
            
//             switch (message.type) {
                
//                 // --- NEW: Whiteboard message handlers ---
//                  case 'WHITEBOARD_VISIBILITY_UPDATE':
//                     setIsWhiteboardVisible(message.payload.isVisible);
//                     break;
//                 case 'WHITEBOARD_UPDATE':
//                     setWhiteboardLines(prevLines => [...prevLines, message.payload.line]);
//                     break;
//                 case 'WHITEBOARD_CLEAR':
//                     setWhiteboardLines([]);
//                     break;
                
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     // --- NEW: Initialize whiteboard with existing lines from server ---
//                     setWhiteboardLines(message.payload.whiteboardLines || []);
//                     setIsWhiteboardVisible(message.payload.isWhiteboardVisible || false);
//                     break;
                
//                 // ... All other cases remain unchanged
//                 case 'WEBRTC_OFFER':
//                     if (role === 'student') {
//                         setIncomingCall(message.payload);
//                     }
//                     break;
//                 case 'WEBRTC_ANSWER':
//                     if (peerConnection.current && peerConnection.current.signalingState === 'have-local-offer') {
//                         await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer));
//                     }
//                     break;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     if (peerConnection.current && peerConnection.current.remoteDescription) {
//                         try {
//                             await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
//                         } catch (e) {
//                             console.error("[WEBRTC] Error adding received ice candidate", e);
//                         }
//                     }
//                     break;
//                 case 'CONTROL_STATE_UPDATE':
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     break;
//                 case 'FREEZE_STATE_UPDATE':
//                     setIsFrozen(message.payload.isFrozen);
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => new Map(prev).set(studentId, { ...prev.get(studentId), ...workspace }));
//                     if (spotlightedStudentId === studentId) {
//                         setSpotlightWorkspace(workspace);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'SPOTLIGHT_UPDATE':
//                     setSpotlightedStudentId(message.payload.studentId);
//                     setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => { const newSet = new Set(prev); newSet.delete(message.payload.studentId); return newSet; });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//             }
//         };
//     };

    
   

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
    
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
    
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     // const handleAddFile = () => {
//     //     if (role !== 'teacher' || viewingMode !== 'teacher') return;
//     //     const newFileName = prompt("Enter new file name:");
//     //     if (newFileName && !files.some(f => f.name === newFileName)) {
//     //         const newFile = { name: newFileName, language: 'javascript', content: '' };
//     //         const updatedFiles = [...files, newFile];
//     //         setFiles(updatedFiles);
//     //         setActiveFileName(newFileName);
//     //         sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//     //     }
//     // };
//      const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name (e.g., script.js, main.py, App.java):");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             let language = 'plaintext';
//             const extension = newFileName.split('.').pop();
//             if (extension === 'js') language = 'javascript';
//             if (extension === 'py') language = 'python';
//             if (extension === 'java') language = 'java';

//             const newFile = { name: newFileName, language, content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };

//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
    
//     const handleViewStudentCam = async (studentId: string) => {
//         console.log(`[WEBRTC] Teacher requesting to view cam for student: ${studentId}`);
//         if (!localStreamRef.current) {
//             toast.error("Your camera is not available. Please check permissions.");
//             return;
//         }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             console.log(`[WEBRTC] Created offer. Sending to student ${studentId}`);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating offer:", error);
//             toast.error("Failed to initiate video call.");
//         }
//     };
    
//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) {
//             toast.error("Could not accept call. Your camera might not be ready.");
//             setIncomingCall(null);
//             return;
//         }
//         console.log(`[WEBRTC] Student accepting call from ${incomingCall.from}`);
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             console.log(`[WEBRTC] Created answer. Sending back to teacher ${incomingCall.from}`);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating answer:", error);
//             toast.error("Failed to answer video call.");
//         } finally {
//             setIncomingCall(null);
//         }
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     const handleDraw = (line: Line) => {
//         sendWsMessage('WHITEBOARD_DRAW', { line });
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                     currentUserId={currentUserId}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <AlertDialog open={!!incomingCall}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             Your teacher ({incomingCall?.username}) would like to view your camera.
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)}>Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall}>Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
//             <Toaster richColors position="top-right" />
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && <Badge variant="destructive" className="animate-pulse"><Star className="mr-2 h-4 w-4" />SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}</Badge>}
//                     {isTeacherControllingThisStudent && <Badge variant="destructive" className="animate-pulse"><Lock className="mr-2 h-4 w-4" />CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && <Button variant="outline" size="sm" onClick={handleRaiseHand}><Hand className="mr-2 h-4 w-4" />Raise Hand</Button>}
//                     {role === 'teacher' && <Button variant={isFrozen ? "destructive" : "outline"} size="sm" onClick={handleToggleFreeze}><Lock className="mr-2 h-4 w-4" />{isFrozen ? "Unfreeze All" : "Freeze All"}</Button>}
                    
//                     {/* --- NEW: Whiteboard Controls for Teacher --- */}
//                     {role === 'teacher' && (
//                         <>
//                             <Button variant="outline" size="sm" onClick={() => sendWsMessage('TOGGLE_WHITEBOARD')}>
//                                 <Brush className="mr-2 h-4 w-4" />
//                                 {isWhiteboardVisible ? "Hide Board" : "Show Board"}
//                             </Button>
//                             {isWhiteboardVisible && (
//                                 <Button variant="destructive" size="sm" onClick={() => sendWsMessage('WHITEBOARD_CLEAR')}>
//                                     <Trash2 className="mr-2 h-4 w-4" />
//                                     Clear Board
//                                 </Button>
//                             )}
//                         </>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         {/* --- NEW: Layout now includes a vertical panel group for the whiteboard --- */}
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={isWhiteboardVisible ? 60 : 100} minSize={20}>
//                                 <PanelGroup direction="horizontal" className="w-full h-full">
//                                     <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                         <div className="p-3 border-b flex justify-between items-center">
//                                             <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                             {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                         </div>
//                                         <div className="flex-grow overflow-y-auto py-1">
//                                             {displayedWorkspace.files.map(file => (
//                                                 <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                                     <FileIcon className="h-4 w-4 mr-2.5" /><span className="truncate">{file.name}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                                     <Panel defaultSize={80} minSize={30}>
//                                         <PanelGroup direction="vertical">
//                                             <Panel defaultSize={70} minSize={20}>
//                                                 <div className="h-full flex flex-col">
//                                                     <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                         <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                             <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                             <SelectContent>
//                                                                 <SelectItem value="javascript">JavaScript</SelectItem>
//                                                                 <SelectItem value="python">Python</SelectItem>
//                                                                 <SelectItem value="java">Java</SelectItem>
//                                                             </SelectContent>
//                                                         </Select>
//                                                         {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                                     </div>
//                                                     <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly }} />
//                                                 </div>
//                                             </Panel>
//                                             <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                             <Panel defaultSize={30} minSize={10}>
//                                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                                     <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                                 </div>
//                                             </Panel>
//                                         </PanelGroup>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>

//                             {isWhiteboardVisible && (
//                                 <>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={40} minSize={20}>
//                                         <WhiteboardPanel 
//                                             lines={whiteboardLines}
//                                             isTeacher={role === 'teacher'}
//                                             onDraw={handleDraw}
//                                         />
//                                     </Panel>
//                                 </>
//                             )}
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId}
//                             handleTakeControl={handleTakeControl}
//                             handleOpenChat={handleOpenChat}
//                             unreadMessages={unreadMessages}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Unlock } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);

//     // --- NEW: State for WebRTC call handling ---
//     const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit, username: string } | null>(null);

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();
    
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);

//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;

//     const isEditorReadOnly = 
//         (role === 'student' && !!spotlightedStudentId) ||
//         (role === 'teacher' && !!spotlightedStudentId && spotlightedStudentId !== controlledStudentId) ||
//         (role === 'student' && !spotlightedStudentId) ||
//         (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
        
//         const setupMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { 
//                 console.error("Could not get user media.", err);
//                 toast.error("Could not access camera/microphone. Please check permissions.");
//             }
//         };
//         setupMedia();
        
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     const sendWsMessage = (type: string, payload?: object) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type, payload }));
//         } else {
//             console.error("WebSocket is not open. Cannot send message:", type, payload);
//             toast.error("Connection lost. Please refresh the page.");
//         }
//     };

//     const createPeerConnection = (targetId: string) => {
//         console.log(`[WEBRTC] Creating new RTCPeerConnection for target: ${targetId}`);
//         if (peerConnection.current) {
//             console.log("[WEBRTC] Closing existing peer connection.");
//             peerConnection.current.close();
//         }

//         const pc = new RTCPeerConnection(stunServers);

//         pc.onicecandidate = (event) => {
//             if (event.candidate) {
//                 console.log(`[WEBRTC] Found ICE candidate. Sending to ${targetId}`);
//                 sendWsMessage('WEBRTC_ICE_CANDIDATE', { to: targetId, candidate: event.candidate });
//             }
//         };

//         pc.ontrack = (event) => {
//             console.log(`[WEBRTC] Received remote track. Displaying stream.`);
//             if (event.streams && event.streams[0]) {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) {
//                     remoteVideoRef.current.srcObject = event.streams[0];
//                 }
//             }
//         };
        
//         pc.onconnectionstatechange = () => {
//             console.log(`[WEBRTC] Connection state changed: ${pc.connectionState}`);
//             if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
//                 setRemoteStream(null);
//             }
//         };

//         if (localStreamRef.current) {
//             localStreamRef.current.getTracks().forEach(track => {
//                 console.log("[WEBRTC] Adding local track to peer connection.");
//                 pc.addTrack(track, localStreamRef.current!);
//             });
//         }

//         peerConnection.current = pc;
//         return pc;
//     };

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = async (event) => {
//             const message = JSON.parse(event.data);
//             console.log(`[CLIENT] Received:`, message);

//             switch (message.type) {
//                 case 'WEBRTC_OFFER':
//                     if (role === 'student') {
//                         console.log(`[WEBRTC] Received offer from teacher ${message.payload.username}`);
//                         setIncomingCall(message.payload);
//                     }
//                     break;
//                 case 'WEBRTC_ANSWER':
//                     if (peerConnection.current && peerConnection.current.signalingState === 'have-local-offer') {
//                         console.log(`[WEBRTC] Received answer from student. Setting remote description.`);
//                         await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.payload.answer));
//                     }
//                     break;
//                 case 'WEBRTC_ICE_CANDIDATE':
//                     if (peerConnection.current && peerConnection.current.remoteDescription) {
//                         try {
//                             console.log(`[WEBRTC] Received ICE candidate. Adding to peer connection.`);
//                             await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
//                         } catch (e) {
//                             console.error("[WEBRTC] Error adding received ice candidate", e);
//                         }
//                     }
//                     break;
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     break;
//                 case 'CONTROL_STATE_UPDATE':
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     if(message.payload.controlledStudentId) {
//                        toast.info(`Teacher has taken control of ${students.find(s => s.id === message.payload.controlledStudentId)?.username || 'a student'}'s editor.`);
//                     } else {
//                        toast.info("Teacher has released control.");
//                     }
//                     break;
//                 case 'FREEZE_STATE_UPDATE':
//                     setIsFrozen(message.payload.isFrozen);
//                     toast.warning(message.payload.isFrozen ? "Pencils Down! Editors are now locked." : "Editors have been unlocked.");
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'STUDENT_WORKSPACE_UPDATED':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => new Map(prev).set(studentId, { ...prev.get(studentId), ...workspace }));
//                     if (spotlightedStudentId === studentId) {
//                         setSpotlightWorkspace(workspace);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                     sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                     sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(message.payload));
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'SPOTLIGHT_UPDATE':
//                     setSpotlightedStudentId(message.payload.studentId);
//                     setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => {
//                         const newSet = new Set(prev);
//                         newSet.delete(message.payload.studentId);
//                         return newSet;
//                     });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//             }
//         };
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;
//         if (!homeworkFiles) {
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     setHomeworkFiles(data.files || []);
//                 } else {
//                     toast.error("Could not load lesson files.");
//                     return;
//                 }
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//         }
//     };
    
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, files: updatedFiles }});
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName });
//          }
//     };
    
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             sendWsMessage('TEACHER_DIRECT_EDIT', { studentId: viewingMode, workspace: { ...studentState, activeFileName: fileName }});
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              sendWsMessage('TEACHER_CODE_UPDATE', { files, activeFileName: fileName });
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher' || viewingMode !== 'teacher') return;
//         const newFileName = prompt("Enter new file name:");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             const newFile = { name: newFileName, language: 'javascript', content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             sendWsMessage('TEACHER_CODE_UPDATE', { files: updatedFiles, activeFileName: newFileName });
//         }
//     };

//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (lesson) {
//             sendWsMessage('ASSIGN_HOMEWORK', { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title });
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('TERMINAL_IN', data);
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             sendWsMessage('RUN_CODE', { language: activeFile.language, code: activeFile.content });
//         }
//     };

//     const handleRaiseHand = () => sendWsMessage('RAISE_HAND');
//     const handleSpotlightStudent = (studentId: string | null) => sendWsMessage('SPOTLIGHT_STUDENT', { studentId });
//     const handleTakeControl = (studentId: string | null) => sendWsMessage('TAKE_CONTROL', { studentId });
//     const handleToggleFreeze = () => sendWsMessage('TOGGLE_FREEZE');
    
//     const handleViewStudentCam = async (studentId: string) => {
//         console.log(`[WEBRTC] Teacher requesting to view cam for student: ${studentId}`);
//         if (!localStreamRef.current) {
//             toast.error("Your camera is not available. Please check permissions.");
//             return;
//         }
//         const pc = createPeerConnection(studentId);
//         try {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             console.log(`[WEBRTC] Created offer. Sending to student ${studentId}`);
//             sendWsMessage('WEBRTC_OFFER', { to: studentId, offer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating offer:", error);
//             toast.error("Failed to initiate video call.");
//         }
//     };
    
//     const handleAcceptCall = async () => {
//         if (!incomingCall || !localStreamRef.current) {
//             toast.error("Could not accept call. Your camera might not be ready.");
//             setIncomingCall(null);
//             return;
//         }
//         console.log(`[WEBRTC] Student accepting call from ${incomingCall.from}`);
//         const pc = createPeerConnection(incomingCall.from);
//         try {
//             await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             console.log(`[WEBRTC] Created answer. Sending back to teacher ${incomingCall.from}`);
//             sendWsMessage('WEBRTC_ANSWER', { to: incomingCall.from, answer: pc.localDescription });
//         } catch (error) {
//             console.error("[WEBRTC] Error creating answer:", error);
//             toast.error("Failed to answer video call.");
//         } finally {
//             setIncomingCall(null);
//         }
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                     currentUserId={currentUserId}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <AlertDialog open={!!incomingCall}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>Incoming Video Call</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             Your teacher ({incomingCall?.username}) would like to view your camera.
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel onClick={() => setIncomingCall(null)}>Decline</AlertDialogCancel>
//                         <AlertDialogAction onClick={handleAcceptCall}>Accept</AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
//             <Toaster richColors position="top-right" />
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && (
//                         <Badge variant="destructive" className="animate-pulse">
//                             <Star className="mr-2 h-4 w-4" />
//                             SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {isTeacherControllingThisStudent && (
//                         <Badge variant="destructive" className="animate-pulse">
//                            <Lock className="mr-2 h-4 w-4" />
//                             CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
                    
//                     {role === 'student' && (
//                         <Button variant="outline" size="sm" onClick={handleRaiseHand}>
//                             <Hand className="mr-2 h-4 w-4" />
//                             Raise Hand
//                         </Button>
//                     )}
//                      {role === 'teacher' && (
//                         <Button variant={isFrozen ? "destructive" : "outline"} size="sm" onClick={handleToggleFreeze}>
//                            {isFrozen ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
//                            {isFrozen ? "Unfreeze All" : "Freeze All"}
//                         </Button>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         <PanelGroup direction="horizontal" className="w-full h-full">
//                             <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                 <div className="p-3 border-b flex justify-between items-center">
//                                     <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                     {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                 </div>
//                                 <div className="flex-grow overflow-y-auto py-1">
//                                     {displayedWorkspace.files.map(file => (
//                                         <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                             <FileIcon className="h-4 w-4 mr-2.5" />
//                                             <span className="truncate">{file.name}</span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Panel>
//                             <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                             <Panel defaultSize={80} minSize={30}>
//                                 <PanelGroup direction="vertical">
//                                     <Panel defaultSize={70} minSize={20}>
//                                         <div className="h-full flex flex-col">
//                                             <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                 <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="javascript">JavaScript</SelectItem>
//                                                         <SelectItem value="python">Python</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                                 {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                             </div>
//                                             <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly }} />
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={30} minSize={10}>
//                                         <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                             <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                             <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                         </div>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId}
//                             handleTakeControl={handleTakeControl}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;
// 7.1
// src/pages/LiveTutorialPage.tsx
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star, Lock, Unlock } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';
//     const currentUserId = decodedToken?.user?.id || null;

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [controlledStudentId, setControlledStudentId] = useState<string | null>(null);
//     const [isFrozen, setIsFrozen] = useState<boolean>(false);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher' && viewingMode !== 'teacher') {
//             return studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();
    
//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);

//     const isTeacherViewingStudent = role === 'teacher' && viewingMode !== 'teacher';
//     const isTeacherControllingThisStudent = isTeacherViewingStudent && controlledStudentId === viewingMode;

//     const isEditorReadOnly = 
//         (role === 'student') ||
//         (spotlightedStudentId && role === 'student') ||
//         (isTeacherViewingStudent && !isTeacherControllingThisStudent);
    
//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         const setupMedia = async () => {
//             if (localStreamRef.current) return;
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { console.error("Could not get user media.", err); }
//         };
//         setupMedia();
//     }, []);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = (event) => {
//             const message = JSON.parse(event.data);
//             console.log(`[CLIENT] Received:`, message);

//             switch (message.type) {
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     setIsFrozen(message.payload.isFrozen);
//                     break;
//                 case 'CONTROL_STATE_UPDATE':
//                     setControlledStudentId(message.payload.controlledStudentId);
//                     if(message.payload.controlledStudentId) {
//                        toast.info(`Teacher has taken control of ${students.find(s => s.id === message.payload.controlledStudentId)?.username || 'a student'}'s editor.`);
//                     } else {
//                        toast.info("Teacher has released control.");
//                     }
//                     break;
//                 case 'FREEZE_STATE_UPDATE':
//                     setIsFrozen(message.payload.isFrozen);
//                     toast.warning(message.payload.isFrozen ? "Pencils Down! Editors are now locked." : "Editors have been unlocked.");
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                     sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                     sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(message.payload));
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'SPOTLIGHT_UPDATE':
//                     setSpotlightedStudentId(message.payload.studentId);
//                     setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => {
//                         const newSet = new Set(prev);
//                         newSet.delete(message.payload.studentId);
//                         return newSet;
//                     });
//                     break;
//                 case 'HOMEWORK_CODE_UPDATE':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existingState = newState.get(studentId) || { terminalOutput: '', files: [], activeFileName: '' };
//                         newState.set(studentId, { ...existingState, ...workspace });
//                         return newState;
//                     });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//             }
//         };
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;

//         if (!homeworkFiles) {
//             console.log("Fetching initial homework state...");
//             let filesToSet = null;
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });

//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     filesToSet = data.files || [];
//                 } else {
//                     console.error("Failed to fetch student-state. Falling back to base lesson files.");
//                     const lessonRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}`, {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (lessonRes.ok) {
//                         const lessonData = await lessonRes.json();
//                         filesToSet = lessonData.files || [];
//                     } else {
//                         console.error("Fallback lesson fetch also failed. Cannot start homework.");
//                         toast.error("Could not load lesson. Please try again later.");
//                         return;
//                     }
//                 }
//                 setHomeworkFiles(filesToSet);
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleWorkspaceChange = (value: string | undefined) => {
//         const newCode = value || '';
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;

//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, content: newCode } : f);
//             const payload = { 
//                 studentId: viewingMode, 
//                 workspace: { ...studentState, files: updatedFiles }
//             };
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_DIRECT_EDIT', payload }));
        
//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//             setFiles(updatedFiles);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//         }
//     };
    
//     const handleLanguageChange = (newLanguage: string) => {
//          if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const updatedFiles = studentState.files.map(f => f.name === studentState.activeFileName ? { ...f, language: newLanguage } : f);
//              const payload = {
//                 studentId: viewingMode,
//                 workspace: { ...studentState, files: updatedFiles }
//             };
//              ws.current?.send(JSON.stringify({ type: 'TEACHER_DIRECT_EDIT', payload }));
//          } else if (role === 'teacher' && viewingMode === 'teacher') {
//             const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//             setFiles(updatedFiles);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//          }
//     };
    
//     const handleActiveFileChange = (fileName: string) => {
//         if (isTeacherControllingThisStudent) {
//             const studentState = studentHomeworkStates.get(viewingMode);
//             if (!studentState) return;
//             const payload = { 
//                 studentId: viewingMode, 
//                 workspace: { ...studentState, activeFileName: fileName }
//             };
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_DIRECT_EDIT', payload }));

//         } else if (role === 'teacher' && viewingMode === 'teacher') {
//              setActiveFileName(fileName);
//              ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files, activeFileName: fileName } }));
//         }
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher') return;
//         if (viewingMode !== 'teacher') {
//             toast.error("You can only add files to your own workspace.");
//             return;
//         }
//         const newFileName = prompt("Enter new file name:");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             const newFile = { name: newFileName, language: 'plaintext', content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName: newFileName } }));
//         }
//     };

//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (ws.current && lesson) {
//             const payload = { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title };
//             console.log("[TEACHER] Sending ASSIGN_HOMEWORK message:", payload);
//             ws.current.send(JSON.stringify({ type: 'ASSIGN_HOMEWORK', payload }));
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current?.send(JSON.stringify({ type: 'RUN_CODE', payload: { language: activeFile.language, code: activeFile.content } }));
//         }
//     };

//     const handleRaiseHand = () => {
//         if (role === 'student' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'RAISE_HAND' }));
//         }
//     };

//     const handleSpotlightStudent = (studentId: string | null) => {
//         if (role === 'teacher' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'SPOTLIGHT_STUDENT', payload: { studentId } }));
//         }
//     };
    
//     const handleTakeControl = (studentId: string | null) => {
//         if (role === 'teacher' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'TAKE_CONTROL', payload: { studentId } }));
//         }
//     };

//     const handleToggleFreeze = () => {
//         if (role === 'teacher' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'TOGGLE_FREEZE' }));
//         }
//     };
    
//     const handleViewStudentCam = (studentId: string) => {
//         console.log("Requesting to view cam for student:", studentId);
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                     currentUserId={currentUserId}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <Toaster richColors position="top-right" />
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && (
//                         <Badge variant="destructive" className="animate-pulse">
//                             <Star className="mr-2 h-4 w-4" />
//                             SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {isTeacherControllingThisStudent && (
//                         <Badge variant="destructive" className="animate-pulse">
//                            <Lock className="mr-2 h-4 w-4" />
//                             CONTROLLING: {students.find(s => s.id === viewingMode)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {role === 'teacher' && !spotlightedStudentId && !isTeacherControllingThisStudent && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
                    
//                     {role === 'student' && (
//                         <Button variant="outline" size="sm" onClick={handleRaiseHand}>
//                             <Hand className="mr-2 h-4 w-4" />
//                             Raise Hand
//                         </Button>
//                     )}
//                      {role === 'teacher' && (
//                         <Button variant={isFrozen ? "destructive" : "outline"} size="sm" onClick={handleToggleFreeze}>
//                            {isFrozen ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
//                            {isFrozen ? "Unfreeze All" : "Freeze All"}
//                         </Button>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         <PanelGroup direction="horizontal" className="w-full h-full">
//                             <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                 <div className="p-3 border-b flex justify-between items-center">
//                                     <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                     {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                 </div>
//                                 <div className="flex-grow overflow-y-auto py-1">
//                                     {displayedWorkspace.files.map(file => (
//                                         <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                             <FileIcon className="h-4 w-4 mr-2.5" />
//                                             <span className="truncate">{file.name}</span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Panel>
//                             <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                             <Panel defaultSize={80} minSize={30}>
//                                 <PanelGroup direction="vertical">
//                                     <Panel defaultSize={70} minSize={20}>
//                                         <div className="h-full flex flex-col">
//                                             <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                 <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="javascript">JavaScript</SelectItem>
//                                                         <SelectItem value="python">Python</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                                 {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                             </div>
//                                             <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleWorkspaceChange} options={{ readOnly: isEditorReadOnly }} />
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={30} minSize={10}>
//                                         <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                             <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                             <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                         </div>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                             controlledStudentId={controlledStudentId}
//                             handleTakeControl={handleTakeControl}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;



// src/pages/LiveTutorialPage.tsx

// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [spotlightWorkspace, setSpotlightWorkspace] = useState<StudentHomeworkState | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && spotlightWorkspace) {
//             return spotlightWorkspace;
//         }
//         if (role === 'teacher') {
//             return viewingMode === 'teacher' 
//                 ? { files, activeFileName } 
//                 : studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();

//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isEditorReadOnly = (role === 'student' && !!spotlightedStudentId) || (role === 'teacher' && viewingMode !== 'teacher') || role === 'student';

//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         const setupMedia = async () => {
//             if (localStreamRef.current) return;
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { console.error("Could not get user media.", err); }
//         };
//         setupMedia();
//     }, []);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current) {
//             term.current.clear();
//             if (spotlightedStudentId && spotlightWorkspace) {
//                 term.current.write(spotlightWorkspace.terminalOutput || `\r\nViewing ${students.find(s => s.id === spotlightedStudentId)?.username || 'student'}'s spotlight...\r\n`);
//             } else if (role === 'teacher' && viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, spotlightedStudentId, spotlightWorkspace, studentHomeworkStates, role, students]);

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = (event) => {
//             const message = JSON.parse(event.data);
//             console.log(`[CLIENT] Received:`, message);

//             switch (message.type) {
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                     sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                     sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(message.payload));
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'SPOTLIGHT_UPDATE':
//                     setSpotlightedStudentId(message.payload.studentId);
//                     setSpotlightWorkspace(message.payload.workspace);
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => {
//                         const newSet = new Set(prev);
//                         newSet.delete(message.payload.studentId);
//                         return newSet;
//                     });
//                     break;
//                 case 'HOMEWORK_CODE_UPDATE':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existingState = newState.get(studentId) || { terminalOutput: '', files: [], activeFileName: '' };
//                         newState.set(studentId, { ...existingState, ...workspace });
//                         return newState;
//                     });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//                 // ... (WebRTC cases would go here if implemented)
//             }
//         };
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;

//         if (!homeworkFiles) {
//             console.log("Fetching initial homework state...");
//             let filesToSet = null;
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });

//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     filesToSet = data.files || [];
//                 } else {
//                     console.error("Failed to fetch student-state. Falling back to base lesson files.");
//                     const lessonRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}`, {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (lessonRes.ok) {
//                         const lessonData = await lessonRes.json();
//                         filesToSet = lessonData.files || [];
//                     } else {
//                         console.error("Fallback lesson fetch also failed. Cannot start homework.");
//                         toast.error("Could not load lesson. Please try again later.");
//                         return;
//                     }
//                 }
//                 setHomeworkFiles(filesToSet);
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleEditorChange = (value: string | undefined) => {
//         if (role !== 'teacher') return;
//         const newCode = value || '';
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleLanguageChange = (newLanguage: string) => {
//         if (role !== 'teacher') return;
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher') return;
//         const newFileName = prompt("Enter new file name:");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             const newFile = { name: newFileName, language: 'plaintext', content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName: newFileName } }));
//         }
//     };

//     const handleActiveFileChange = (fileName: string) => {
//         if (role !== 'teacher') return;
//         setActiveFileName(fileName);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files, activeFileName: fileName } }));
//     };
    
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (ws.current && lesson) {
//             const payload = { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title };
//             console.log("[TEACHER] Sending ASSIGN_HOMEWORK message:", payload);
//             ws.current.send(JSON.stringify({ type: 'ASSIGN_HOMEWORK', payload }));
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current?.send(JSON.stringify({ type: 'RUN_CODE', payload: { language: activeFile.language, code: activeFile.content } }));
//         }
//     };

//     const handleRaiseHand = () => {
//         if (role === 'student' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'RAISE_HAND' }));
//         }
//     };

//     const handleSpotlightStudent = (studentId: string | null) => {
//         if (role === 'teacher' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'SPOTLIGHT_STUDENT', payload: { studentId } }));
//         }
//     };
    
//     const handleViewStudentCam = (studentId: string) => {
//         // Placeholder for webcam logic
//         console.log("Requesting to view cam for student:", studentId);
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && (
//                         <Badge variant="destructive" className="animate-pulse">
//                             <Star className="mr-2 h-4 w-4" />
//                             SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {role === 'teacher' && !spotlightedStudentId && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && (
//                         <Button variant="outline" size="sm" onClick={handleRaiseHand}>
//                             <Hand className="mr-2 h-4 w-4" />
//                             Raise Hand
//                         </Button>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         {/* --- MAIN WORKSPACE LOGIC INLINED --- */}
//                         <PanelGroup direction="horizontal" className="w-full h-full">
//                             <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                 <div className="p-3 border-b flex justify-between items-center">
//                                     <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                     {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                 </div>
//                                 <div className="flex-grow overflow-y-auto py-1">
//                                     {displayedWorkspace.files.map(file => (
//                                         <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-default' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                             <FileIcon className="h-4 w-4 mr-2.5" />
//                                             <span className="truncate">{file.name}</span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Panel>
//                             <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                             <Panel defaultSize={80} minSize={30}>
//                                 <PanelGroup direction="vertical">
//                                     <Panel defaultSize={70} minSize={20}>
//                                         <div className="h-full flex flex-col">
//                                             <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                 <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="javascript">JavaScript</SelectItem>
//                                                         <SelectItem value="python">Python</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                                 {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                             </div>
//                                             <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleEditorChange} options={{ readOnly: isEditorReadOnly }} />
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={30} minSize={10}>
//                                         <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                             <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                             <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                         </div>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;


// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand, Star } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = (() => {
//         if (spotlightedStudentId && studentHomeworkStates.has(spotlightedStudentId)) {
//             return studentHomeworkStates.get(spotlightedStudentId)!;
//         }
//         if (role === 'teacher') {
//             return viewingMode === 'teacher' 
//                 ? { files, activeFileName } 
//                 : studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' };
//         }
//         return { files, activeFileName };
//     })();

//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isEditorReadOnly = role === 'student' || (role === 'teacher' && viewingMode !== 'teacher') || (role === 'student' && !!spotlightedStudentId);

//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         const setupMedia = async () => {
//             if (localStreamRef.current) return;
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 localStreamRef.current = stream;
//                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//             } catch (err) { console.error("Could not get user media.", err); }
//         };
//         setupMedia();
//     }, []);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current && role === 'teacher') {
//             term.current.clear();
//             if (viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, studentHomeworkStates, role, students]);

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = (event) => {
//             const message = JSON.parse(event.data);
//             console.log(`[CLIENT] Received:`, message);

//             switch (message.type) {
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     setSpotlightedStudentId(message.payload.spotlightedStudentId);
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student' && !spotlightedStudentId) {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                     sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                     sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(message.payload));
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'SPOTLIGHT_UPDATE':
//                     setSpotlightedStudentId(message.payload.studentId);
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => {
//                         const newSet = new Set(prev);
//                         newSet.delete(message.payload.studentId);
//                         return newSet;
//                     });
//                     break;
//                 case 'HOMEWORK_CODE_UPDATE':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existingState = newState.get(studentId) || { terminalOutput: '', files: [], activeFileName: '' };
//                         newState.set(studentId, { ...existingState, ...workspace });
//                         return newState;
//                     });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//                 // ... (WebRTC cases would go here if implemented)
//             }
//         };
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;

//         if (!homeworkFiles) {
//             console.log("Fetching initial homework state...");
//             let filesToSet = null;
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });

//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     filesToSet = data.files || [];
//                 } else {
//                     console.error("Failed to fetch student-state. Falling back to base lesson files.");
//                     const lessonRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}`, {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (lessonRes.ok) {
//                         const lessonData = await lessonRes.json();
//                         filesToSet = lessonData.files || [];
//                     } else {
//                         console.error("Fallback lesson fetch also failed. Cannot start homework.");
//                         toast.error("Could not load lesson. Please try again later.");
//                         return;
//                     }
//                 }
//                 setHomeworkFiles(filesToSet);
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleEditorChange = (value: string | undefined) => {
//         if (role !== 'teacher') return;
//         const newCode = value || '';
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleLanguageChange = (newLanguage: string) => {
//         if (role !== 'teacher') return;
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher') return;
//         const newFileName = prompt("Enter new file name:");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             const newFile = { name: newFileName, language: 'plaintext', content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName: newFileName } }));
//         }
//     };

//     const handleActiveFileChange = (fileName: string) => {
//         if (role !== 'teacher') return;
//         setActiveFileName(fileName);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files, activeFileName: fileName } }));
//     };
    
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (ws.current && lesson) {
//             const payload = { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title };
//             console.log("[TEACHER] Sending ASSIGN_HOMEWORK message:", payload);
//             ws.current.send(JSON.stringify({ type: 'ASSIGN_HOMEWORK', payload }));
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current?.send(JSON.stringify({ type: 'RUN_CODE', payload: { language: activeFile.language, code: activeFile.content } }));
//         }
//     };

//     const handleRaiseHand = () => {
//         if (role === 'student' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'RAISE_HAND' }));
//         }
//     };

//     const handleSpotlightStudent = (studentId: string | null) => {
//         if (role === 'teacher' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'SPOTLIGHT_STUDENT', payload: { studentId } }));
//         }
//     };
    
//     const handleViewStudentCam = (studentId: string) => {
//         // Placeholder for webcam logic
//         console.log("Requesting to view cam for student:", studentId);
//     };
    
//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {spotlightedStudentId && (
//                         <Badge variant="destructive" className="animate-pulse">
//                             <Star className="mr-2 h-4 w-4" />
//                             SPOTLIGHT ON: {students.find(s => s.id === spotlightedStudentId)?.username || 'Student'}
//                         </Badge>
//                     )}
//                     {role === 'teacher' && !spotlightedStudentId && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && (
//                         <Button variant="outline" size="sm" onClick={handleRaiseHand}>
//                             <Hand className="mr-2 h-4 w-4" />
//                             Raise Hand
//                         </Button>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         {/* --- MAIN WORKSPACE LOGIC INLINED --- */}
//                         <PanelGroup direction="horizontal" className="w-full h-full">
//                             <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                 <div className="p-3 border-b flex justify-between items-center">
//                                     <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                     {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                 </div>
//                                 <div className="flex-grow overflow-y-auto py-1">
//                                     {displayedWorkspace.files.map(file => (
//                                         <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-default' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                             <FileIcon className="h-4 w-4 mr-2.5" />
//                                             <span className="truncate">{file.name}</span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Panel>
//                             <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                             <Panel defaultSize={80} minSize={30}>
//                                 <PanelGroup direction="vertical">
//                                     <Panel defaultSize={70} minSize={20}>
//                                         <div className="h-full flex flex-col">
//                                             <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                 <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="javascript">JavaScript</SelectItem>
//                                                         <SelectItem value="python">Python</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                                 {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                             </div>
//                                             <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleEditorChange} options={{ readOnly: isEditorReadOnly }} />
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={30} minSize={10}>
//                                         <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                             <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                             <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                         </div>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             handleViewStudentCam={handleViewStudentCam}
//                             spotlightedStudentId={spotlightedStudentId}
//                             handleSpotlightStudent={handleSpotlightStudent}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;

// // LATEST with Raise Hand
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import child components
// import { HomeworkView } from '../components/classroom/HomeworkView';
// import { RosterPanel } from '../components/classroom/RosterPanel';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { PhoneOff, ChevronRight, FilePlus, Play, Terminal as TerminalIcon, File as FileIcon, Hand } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { toast, Toaster } from 'sonner';

// // Import types
// import { UserRole, ViewingMode, CodeFile, LessonFile, Student, Lesson, StudentHomeworkState } from '../types';

// // --- Helper function to decode JWT ---
// const simpleJwtDecode = (token: string) => {
//     try {
//         const base64Url = token.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         }).join(''));
//         return JSON.parse(jsonPayload);
//     } catch (error) {
//         console.error("Invalid token:", error);
//         return null;
//     }
// };

// const stunServers = {
//   iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
// };


// const LiveTutorialPage: React.FC = () => {
//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const token = localStorage.getItem('authToken');

//     const decodedToken = token ? simpleJwtDecode(token) : null;
//     const initialUserRole = decodedToken?.user?.role || 'unknown';

//     const [role, setRole] = useState<UserRole>(initialUserRole);
    
//     const [files, setFiles] = useState<CodeFile[]>([]);
//     const [activeFileName, setActiveFileName] = useState<string>('');
//     const [students, setStudents] = useState<Student[]>([]);
//     const [studentHomeworkStates, setStudentHomeworkStates] = useState<Map<string, StudentHomeworkState>>(new Map());
//     const [viewingMode, setViewingMode] = useState<ViewingMode>('teacher');
//     const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
//     const [assigningToStudentId, setAssigningToStudentId] = useState<string | null>(null);
    
//     const [pendingHomework, setPendingHomework] = useState<{ lessonId: string; teacherSessionId: string; title: string; } | null>(() => {
//         const saved = sessionStorage.getItem(`pendingHomework_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });
//     const [isDoingHomework, setIsDoingHomework] = useState<boolean>(() => {
//         const saved = sessionStorage.getItem(`isDoingHomework_${sessionId}`);
//         return saved === 'true';
//     });
//     const [homeworkFiles, setHomeworkFiles] = useState<LessonFile[] | null>(() => {
//         const saved = sessionStorage.getItem(`homeworkFiles_${sessionId}`);
//         return saved ? JSON.parse(saved) : null;
//     });

//     const [activeHomeworkStudents, setActiveHomeworkStudents] = useState<Set<string>>(new Set());
//     const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
//     const [connectionStatus, setConnectionStatus] = useState('Initializing...');
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//     const [isMuted, setIsMuted] = useState(false);
//     const [isCameraOff, setIsCameraOff] = useState(false);

//     const ws = useRef<WebSocket | null>(null);
//     const peerConnection = useRef<RTCPeerConnection | null>(null);
//     const localVideoRef = useRef<HTMLVideoElement>(null);
//     const remoteVideoRef = useRef<HTMLVideoElement>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const localStreamRef = useRef<MediaStream | null>(null);

//     const displayedWorkspace = role === 'teacher'
//         ? (viewingMode === 'teacher' ? { files, activeFileName } : studentHomeworkStates.get(viewingMode) || { files: [], activeFileName: '' })
//         : { files, activeFileName };

//     const activeFile = displayedWorkspace.files.find(file => file.name === displayedWorkspace.activeFileName);
//     const isEditorReadOnly = role === 'student' || (role === 'teacher' && viewingMode !== 'teacher');

//     useEffect(() => {
//         if (!token) {
//             navigate('/login');
//             return;
//         }
//         const wsUrl = `${getWebSocketUrl()}?sessionId=${sessionId}&token=${token}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;
//         initializeWebSocketEvents(currentWs);
//         return () => {
//             ws.current?.close();
//             localStreamRef.current?.getTracks().forEach(track => track.stop());
//             peerConnection.current?.close();
//             term.current?.dispose();
//         };
//     }, [sessionId, token, navigate]);

//     useEffect(() => {
//         if (role === 'student') {
//             sessionStorage.setItem(`isDoingHomework_${sessionId}`, String(isDoingHomework));
//             if (pendingHomework) {
//                 sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(pendingHomework));
//             }
//             if (homeworkFiles) {
//                 sessionStorage.setItem(`homeworkFiles_${sessionId}`, JSON.stringify(homeworkFiles));
//             }
//             if (!isDoingHomework) {
//                 sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                 sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                 sessionStorage.removeItem(`pendingHomework_${sessionId}`);
//             }
//         }
//     }, [isDoingHomework, homeworkFiles, pendingHomework, role, sessionId]);

//     useEffect(() => {
//         if (pendingHomework && isDoingHomework && !homeworkFiles) {
//             handleStartHomework();
//         }
//     }, [pendingHomework, isDoingHomework, homeworkFiles]);

//     useEffect(() => {
//         const setupMedia = async () => {
//             if (role === 'teacher') {
//                 try {
//                     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                     setLocalStream(stream);
//                     localStreamRef.current = stream;
//                     if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//                 } catch (err) { console.error("Could not get user media.", err); }
//             }
//         };
//         setupMedia();
//     }, [role]);

//     useEffect(() => {
//         if (role === 'teacher') {
//             const fetchLessons = async () => {
//                 const response = await fetch('http://localhost:5000/api/lessons/teacher/list', { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (response.ok) setAvailableLessons(await response.json());
//             };
//             fetchLessons();
//         }
//     }, [role, token]);
    
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e', foreground: '#d4d4d4' } });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData(onTerminalData);
//             term.current = newTerm;
//         }
//     }, []);

//     useEffect(() => {
//         if (term.current && role === 'teacher') {
//             term.current.clear();
//             if (viewingMode !== 'teacher') {
//                 const studentState = studentHomeworkStates.get(viewingMode);
//                 term.current.write(studentState?.terminalOutput || `\r\nWatching ${students.find(s => s.id === viewingMode)?.username || 'student'}'s terminal...\r\n`);
//             }
//         }
//     }, [viewingMode, studentHomeworkStates, role, students]);

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => setConnectionStatus('Connected');
//         currentWs.onclose = () => setConnectionStatus('Disconnected');
//         currentWs.onerror = () => setConnectionStatus('Connection Error');

//         currentWs.onmessage = (event) => {
//             const message = JSON.parse(event.data);
//             console.log(`[CLIENT] Received:`, message);

//             switch (message.type) {
//                 case 'ROLE_ASSIGNED':
//                     setRole(message.payload.role);
//                     setFiles(message.payload.files || []);
//                     setActiveFileName(message.payload.activeFile || '');
//                     break;
//                 case 'STUDENT_LIST_UPDATE':
//                     setStudents(message.payload.students);
//                     break;
//                 case 'TEACHER_WORKSPACE_UPDATE':
//                     if (role === 'student') {
//                         setFiles(message.payload.files);
//                         setActiveFileName(message.payload.activeFileName);
//                     }
//                     break;
//                 case 'HOMEWORK_ASSIGNED':
//                     setPendingHomework(message.payload);
//                     setHomeworkFiles(null);
//                     setIsDoingHomework(false);
//                     sessionStorage.removeItem(`isDoingHomework_${sessionId}`);
//                     sessionStorage.removeItem(`homeworkFiles_${sessionId}`);
//                     sessionStorage.setItem(`pendingHomework_${sessionId}`, JSON.stringify(message.payload));
//                     break;
//                 case 'HAND_RAISED_LIST_UPDATE':
//                     setHandsRaised(new Set(message.payload.studentsWithHandsRaised));
//                     break;
//                 case 'HOMEWORK_JOIN':
//                     setActiveHomeworkStudents(prev => new Set(prev).add(message.payload.studentId));
//                     break;
//                 case 'HOMEWORK_LEAVE':
//                     setActiveHomeworkStudents(prev => {
//                         const newSet = new Set(prev);
//                         newSet.delete(message.payload.studentId);
//                         return newSet;
//                     });
//                     break;
//                 case 'HOMEWORK_CODE_UPDATE':
//                     const { studentId, workspace } = message.payload;
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existingState = newState.get(studentId) || { terminalOutput: '', files: [], activeFileName: '' };
//                         newState.set(studentId, { ...existingState, ...workspace });
//                         return newState;
//                     });
//                     break;
//                 case 'HOMEWORK_TERMINAL_UPDATE':
//                     setStudentHomeworkStates(prev => {
//                         const newState = new Map(prev);
//                         const existing = newState.get(message.payload.studentId) || { files: [], activeFileName: '', terminalOutput: '' };
//                         existing.terminalOutput += message.payload.output;
//                         newState.set(message.payload.studentId, existing);
//                         return newState;
//                     });
//                     break;
//                 case 'TERMINAL_OUT':
//                     term.current?.write(message.payload);
//                     break;
//                 case 'INITIATE_CALL': initializePeerConnection(localStreamRef.current); createOffer(); break;
//                 case 'WEBRTC_OFFER': initializePeerConnection(localStreamRef.current); handleOffer(message.payload); break;
//                 case 'WEBRTC_ANSWER': handleAnswer(message.payload); break;
//                 case 'WEBRTC_ICE_CANDIDATE': handleNewIceCandidate(message.payload); break;
//                 case 'PEER_LEFT': handlePeerLeft(); break;
//             }
//         };
//     };

//     const handleStartHomework = async () => {
//         if (!pendingHomework) return;

//         if (!homeworkFiles) {
//             console.log("Fetching initial homework state...");
//             let filesToSet = null;
//             try {
//                 const stateRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });

//                 if (stateRes.ok) {
//                     const data = await stateRes.json();
//                     filesToSet = data.files || [];
//                 } else {
//                     console.error("Failed to fetch student-state. Falling back to base lesson files.");
//                     const lessonRes = await fetch(`http://localhost:5000/api/lessons/${pendingHomework.lessonId}`, {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (lessonRes.ok) {
//                         const lessonData = await lessonRes.json();
//                         filesToSet = lessonData.files || [];
//                     } else {
//                         console.error("Fallback lesson fetch also failed. Cannot start homework.");
//                         toast.error("Could not load lesson. Please try again later.");
//                         return;
//                     }
//                 }
//                 setHomeworkFiles(filesToSet);
//             } catch (error) {
//                 console.error("A network or other error occurred while fetching homework state:", error);
//                 toast.error("A network error occurred. Please check your connection.");
//                 return;
//             }
//         }
//         setIsDoingHomework(true);
//     };

//     const handleEditorChange = (value: string | undefined) => {
//         if (role !== 'teacher') return;
//         const newCode = value || '';
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, content: newCode } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleLanguageChange = (newLanguage: string) => {
//         if (role !== 'teacher') return;
//         const updatedFiles = files.map(f => f.name === activeFileName ? { ...f, language: newLanguage } : f);
//         setFiles(updatedFiles);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName } }));
//     };

//     const handleAddFile = () => {
//         if (role !== 'teacher') return;
//         const newFileName = prompt("Enter new file name:");
//         if (newFileName && !files.some(f => f.name === newFileName)) {
//             const newFile = { name: newFileName, language: 'plaintext', content: '' };
//             const updatedFiles = [...files, newFile];
//             setFiles(updatedFiles);
//             setActiveFileName(newFileName);
//             ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files: updatedFiles, activeFileName: newFileName } }));
//         }
//     };

//     const handleActiveFileChange = (fileName: string) => {
//         if (role !== 'teacher') return;
//         setActiveFileName(fileName);
//         ws.current?.send(JSON.stringify({ type: 'TEACHER_CODE_UPDATE', payload: { files, activeFileName: fileName } }));
//     };
    
//     const handleAssignHomework = (studentId: string, lessonId: number | string) => {
//         const lesson = availableLessons.find(l => l.id === lessonId);
//         if (ws.current && lesson) {
//             const payload = { studentId, lessonId, teacherSessionId: sessionId, title: lesson.title };
//             console.log("[TEACHER] Sending ASSIGN_HOMEWORK message:", payload);
//             ws.current.send(JSON.stringify({ type: 'ASSIGN_HOMEWORK', payload }));
//             setAssigningToStudentId(null);
//         }
//     };

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleRunCode = () => {
//         if (activeFile && role === 'teacher' && viewingMode === 'teacher') {
//             ws.current?.send(JSON.stringify({ type: 'RUN_CODE', payload: { language: activeFile.language, code: activeFile.content } }));
//         }
//     };

//     const handleRaiseHand = () => {
//         if (role === 'student' && ws.current) {
//             ws.current.send(JSON.stringify({ type: 'RAISE_HAND' }));
//         }
//     };
    
//     const initializePeerConnection = (stream: MediaStream | null) => {
//         if (peerConnection.current) return;
//         try {
//             peerConnection.current = new RTCPeerConnection(stunServers);
//             if (stream) {
//                 stream.getTracks().forEach(track => peerConnection.current?.addTrack(track, stream));
//             }
//             peerConnection.current.onicecandidate = event => {
//                 if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'WEBRTC_ICE_CANDIDATE', payload: event.candidate }));
//                 }
//             };
//             peerConnection.current.ontrack = event => {
//                 setRemoteStream(event.streams[0]);
//                 if (remoteVideoRef.current) {
//                     remoteVideoRef.current.srcObject = event.streams[0];
//                 }
//             };
//         } catch (error) {
//             console.error('Error initializing peer connection:', error);
//         }
//     };

//     const createOffer = async () => {
//         if (!peerConnection.current || !ws.current) return;
//         try {
//             const offer = await peerConnection.current.createOffer();
//             await peerConnection.current.setLocalDescription(offer);
//             ws.current.send(JSON.stringify({ type: 'WEBRTC_OFFER', payload: offer }));
//         } catch (error) {
//             console.error('Error creating and sending offer:', error);
//         }
//     };

//     const handleOffer = async (offer: RTCSessionDescriptionInit) => {
//         if (!peerConnection.current || !ws.current) return;
//         try {
//             await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
//             const answer = await peerConnection.current.createAnswer();
//             await peerConnection.current.setLocalDescription(answer);
//             ws.current.send(JSON.stringify({ type: 'WEBRTC_ANSWER', payload: answer }));
//         } catch (error) {
//             console.error('Error handling offer and sending answer:', error);
//         }
//     };

//     const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
//         if (peerConnection.current?.signalingState === 'have-local-offer') {
//             try {
//                 await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
//                 setConnectionStatus("Peer connected");
//             } catch (error) {
//                 console.error('Error handling answer:', error);
//             }
//         }
//     };

//     const handleNewIceCandidate = async (candidate: RTCIceCandidateInit) => {
//         if (peerConnection.current?.remoteDescription) {
//             try {
//                 await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
//             } catch (error) {
//                 console.error('Error adding new ICE candidate:', error);
//             }
//         }
//     };
    
//     const handlePeerLeft = () => {
//         if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
//         setRemoteStream(null);
//         if (peerConnection.current) {
//             peerConnection.current.close();
//             peerConnection.current = null;
//         }
//         setConnectionStatus("Peer has left");
//     };

//     const toggleMute = () => {
//         if (localStream) {
//             localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
//             setIsMuted(!isMuted);
//         }
//     };

//     const toggleCamera = () => {
//         if (localStream) {
//             localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
//             setIsCameraOff(!isCameraOff);
//         }
//     };

//     if (role === 'student' && isDoingHomework && pendingHomework && homeworkFiles) {
//         return <HomeworkView 
//                     lessonId={pendingHomework.lessonId} 
//                     teacherSessionId={pendingHomework.teacherSessionId} 
//                     token={token} 
//                     onLeave={() => setIsDoingHomework(false)} 
//                     initialFiles={homeworkFiles}
//                     onFilesChange={setHomeworkFiles}
//                 />;
//     }
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
//             <header className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b">
//                 <h1 className="text-lg font-bold">Interactive Classroom</h1>
//                 <div className="flex items-center gap-4">
//                     <Badge variant={role === 'teacher' ? 'default' : 'secondary'}>{role.toUpperCase()}</Badge>
//                     {role === 'teacher' && <Badge variant="outline">Viewing: {viewingMode === 'teacher' ? 'My Workspace' : students.find(s => s.id === viewingMode)?.username || 'Student'}</Badge>}
//                     {role === 'student' && (
//                         <Button variant="outline" size="sm" onClick={handleRaiseHand}>
//                             <Hand className="mr-2 h-4 w-4" />
//                             Raise Hand
//                         </Button>
//                     )}
//                 </div>
//                 <Button variant="destructive" onClick={() => navigate('/dashboard')}><PhoneOff className="mr-2 h-4 w-4" /> End Session</Button>
//             </header>

//             {pendingHomework && role === 'student' && (
//                 <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-blue-500">
//                     <AlertTitle className="font-bold">New Assignment!</AlertTitle>
//                     <AlertDescription className="flex items-center justify-between">
//                         Your teacher has assigned a new lesson: <strong>{pendingHomework.title}</strong>
//                         <Button size="sm" onClick={isDoingHomework ? () => setIsDoingHomework(false) : handleStartHomework}>
//                             {isDoingHomework ? 'Return to Classroom' : 'Start Lesson'}
//                             <ChevronRight className="ml-2 h-4 w-4" />
//                         </Button>
//                     </AlertDescription>
//                 </Alert>
//             )}

//             <main className="flex-grow flex flex-row overflow-hidden">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={75} minSize={30}>
//                         {/* --- MAIN WORKSPACE LOGIC INLINED --- */}
//                         <PanelGroup direction="horizontal" className="w-full h-full">
//                             <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
//                                 <div className="p-3 border-b flex justify-between items-center">
//                                     <h2 className="font-semibold text-sm uppercase">Explorer</h2>
//                                     {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
//                                 </div>
//                                 <div className="flex-grow overflow-y-auto py-1">
//                                     {displayedWorkspace.files.map(file => (
//                                         <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-default' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
//                                             <FileIcon className="h-4 w-4 mr-2.5" />
//                                             <span className="truncate">{file.name}</span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Panel>
//                             <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                             <Panel defaultSize={80} minSize={30}>
//                                 <PanelGroup direction="vertical">
//                                     <Panel defaultSize={70} minSize={20}>
//                                         <div className="h-full flex flex-col">
//                                             <div className="p-2 flex justify-between items-center bg-white border-b">
//                                                 <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
//                                                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="javascript">JavaScript</SelectItem>
//                                                         <SelectItem value="python">Python</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                                 {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
//                                             </div>
//                                             <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleEditorChange} options={{ readOnly: isEditorReadOnly }} />
//                                         </div>
//                                     </Panel>
//                                     <PanelResizeHandle className="h-1.5 bg-slate-200" />
//                                     <Panel defaultSize={30} minSize={10}>
//                                         <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                             <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
//                                             <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                         </div>
//                                     </Panel>
//                                 </PanelGroup>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                     <PanelResizeHandle className="w-1.5 bg-slate-200" />
//                     <Panel defaultSize={25} minSize={20} maxSize={35}>
//                         <RosterPanel
//                             role={role}
//                             students={students}
//                             viewingMode={viewingMode}
//                             setViewingMode={setViewingMode}
//                             activeHomeworkStudents={activeHomeworkStudents}
//                             handsRaised={handsRaised}
//                             assigningToStudentId={assigningToStudentId}
//                             setAssigningToStudentId={setAssigningToStudentId}
//                             availableLessons={availableLessons}
//                             handleAssignHomework={handleAssignHomework}
//                             localVideoRef={localVideoRef}
//                             remoteVideoRef={remoteVideoRef}
//                             remoteStream={remoteStream}
//                             isMuted={isMuted}
//                             toggleMute={toggleMute}
//                             isCameraOff={isCameraOff}
//                             toggleCamera={toggleCamera}
//                         />
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default LiveTutorialPage;



















