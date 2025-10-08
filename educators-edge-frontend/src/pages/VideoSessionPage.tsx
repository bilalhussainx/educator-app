import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
    Video, 
    VideoOff, 
    Mic, 
    MicOff,
    Phone,
    PhoneOff,
    Users,
    MessageCircle,
    Settings,
    Share,
    MoreVertical,
    Clock,
    User
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';

interface SessionInfo {
    id: number;
    student_id: string;
    student_username: string;
    student_display_name?: string;
    session_type: string;
    description?: string;
    scheduled_time?: string;
    status: string;
    agora_channel: string;
    agora_token: string;
}

interface ChatMessage {
    id: string;
    sender: 'teacher' | 'student';
    message: string;
    timestamp: Date;
    senderName: string;
}

const VideoSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    
    // Session data
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionDuration, setSessionDuration] = useState(0);
    
    // Video controls
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    // Chat
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    // Agora
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [joined, setJoined] = useState(false);
    
    // References
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (sessionId) {
            fetchSessionInfo();
        }
        
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            leaveCall();
        };
    }, [sessionId]);

    useEffect(() => {
        if (sessionInfo && sessionInfo.agora_channel) {
            initializeAgora();
        }
    }, [sessionInfo]);

    const fetchSessionInfo = async () => {
        try {
            setLoading(true);
            
            // Get session details and Agora token
            const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
            
            if (response.data.success) {
                setSessionInfo({
                    id: parseInt(sessionId!),
                    student_id: response.data.session?.student_id || '',
                    student_username: response.data.session?.student_username || 'Student',
                    student_display_name: response.data.session?.student_display_name,
                    session_type: response.data.session?.session_type || 'tutoring',
                    description: response.data.session?.description,
                    scheduled_time: response.data.session?.scheduled_time,
                    status: response.data.session?.status || 'active',
                    agora_channel: response.data.channelName,
                    agora_token: response.data.token
                });
            }
        } catch (error) {
            console.error('Failed to fetch session info:', error);
            toast.error('Failed to load session information');
            navigate('/sessions');
        } finally {
            setLoading(false);
        }
    };

    const initializeAgora = async () => {
        try {
            // Create Agora client
            const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            setClient(agoraClient);
            
            // Set up event listeners
            agoraClient.on('user-published', async (user, mediaType) => {
                await agoraClient.subscribe(user, mediaType);
                
                if (mediaType === 'video') {
                    const remoteVideoTrack = user.videoTrack;
                    if (remoteVideoTrack && remoteVideoRef.current) {
                        remoteVideoTrack.play(remoteVideoRef.current);
                    }
                }
                
                if (mediaType === 'audio') {
                    const remoteAudioTrack = user.audioTrack;
                    if (remoteAudioTrack) {
                        remoteAudioTrack.play();
                    }
                }
                
                setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
            });
            
            agoraClient.on('user-unpublished', (user) => {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            });
            
            agoraClient.on('user-left', (user) => {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            });
            
        } catch (error) {
            console.error('Failed to initialize Agora:', error);
            toast.error('Failed to initialize video session');
        }
    };

    const joinCall = async () => {
        if (!client || !sessionInfo) {
            toast.error('Session not ready');
            return;
        }
        
        try {
            const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
            if (!agoraAppId) {
                throw new Error("Agora App ID is not configured in environment variables.");
            }
            
            // Join the channel
            await client.join(
                agoraAppId,
                sessionInfo.agora_channel,
                sessionInfo.agora_token,
                `teacher_${Date.now()}`
            );
            
            // Create and publish local tracks
            const [videoTrack, audioTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
            
            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);
            
            // Play local video
            if (localVideoRef.current) {
                videoTrack.play(localVideoRef.current);
            }
            
            // Publish tracks
            await client.publish([videoTrack, audioTrack]);
            
            setJoined(true);
            setSessionStarted(true);
            
            // Start duration timer
            durationIntervalRef.current = setInterval(() => {
                setSessionDuration(prev => prev + 1);
            }, 1000);
            
            toast.success('Joined video session successfully');
            
        } catch (error) {
            console.error('Failed to join call:', error);
            toast.error('Failed to join video session');
        }
    };

    const leaveCall = async () => {
        try {
            if (localVideoTrack) {
                localVideoTrack.close();
            }
            if (localAudioTrack) {
                localAudioTrack.close();
            }
            if (client) {
                await client.leave();
            }
            
            setJoined(false);
            setSessionStarted(false);
            setLocalVideoTrack(null);
            setLocalAudioTrack(null);
            setRemoteUsers([]);
            
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            
        } catch (error) {
            console.error('Failed to leave call:', error);
        }
    };

    const toggleVideo = async () => {
        if (localVideoTrack) {
            if (isVideoOn) {
                await localVideoTrack.setEnabled(false);
            } else {
                await localVideoTrack.setEnabled(true);
            }
            setIsVideoOn(!isVideoOn);
        }
    };

    const toggleAudio = async () => {
        if (localAudioTrack) {
            if (isAudioOn) {
                await localAudioTrack.setEnabled(false);
            } else {
                await localAudioTrack.setEnabled(true);
            }
            setIsAudioOn(!isAudioOn);
        }
    };

    const endSession = async () => {
        await leaveCall();
        
        // Update session status
        try {
            await apiClient.post(`/api/sessions/${sessionId}/complete`, {
                duration: sessionDuration,
                status: 'completed'
            });
        } catch (error) {
            console.error('Failed to update session status:', error);
        }
        
        navigate('/sessions');
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const sendChatMessage = () => {
        if (!newMessage.trim()) return;
        
        const message: ChatMessage = {
            id: Date.now().toString(),
            sender: 'teacher',
            message: newMessage.trim(),
            timestamp: new Date(),
            senderName: 'You'
        };
        
        setChatMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // TODO: Send message to student via websocket or API
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                        <div className="text-center text-white">Loading session...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!sessionInfo) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                        <div className="text-center text-white">Session not found</div>
                        <Button 
                            className="mt-4 w-full"
                            onClick={() => navigate('/sessions')}
                        >
                            Return to Sessions
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarFallback>
                                {(sessionInfo.student_display_name || sessionInfo.student_username).charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Session with {sessionInfo.student_display_name || sessionInfo.student_username}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <Badge variant="secondary">{sessionInfo.session_type}</Badge>
                                {sessionStarted && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDuration(sessionDuration)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{remoteUsers.length + (joined ? 1 : 0)} participants</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowChat(!showChat)}
                            className="text-slate-300 border-slate-600"
                        >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={endSession}
                        >
                            End Session
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Video Area */}
                <div className="flex-1 relative">
                    {/* Remote Video */}
                    <div className="w-full h-full bg-slate-800">
                        {remoteUsers.length > 0 ? (
                            <video 
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center text-slate-400">
                                    <User className="h-24 w-24 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg mb-2">Waiting for student to join...</p>
                                    <p className="text-sm">Share the session link with your student</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Local Video (Picture in Picture) */}
                    <div className="absolute bottom-4 right-4 w-48 h-36 bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600">
                        <video 
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {!isVideoOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                <VideoOff className="h-8 w-8 text-slate-400" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="text-white font-semibold">Session Chat</h3>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex",
                                        msg.sender === 'teacher' ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-lg p-3 text-sm",
                                            msg.sender === 'teacher'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-700 text-slate-100'
                                        )}
                                    >
                                        <p>{msg.message}</p>
                                        <p className="text-xs opacity-75 mt-1">
                                            {msg.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Message Input */}
                        <div className="p-4 border-t border-slate-700">
                            <div className="flex gap-2">
                                <Textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="bg-slate-700 border-slate-600 text-white"
                                    rows={2}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendChatMessage();
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    onClick={sendChatMessage}
                                    disabled={!newMessage.trim()}
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Control Bar */}
            <div className="bg-slate-800 border-t border-slate-700 p-4">
                <div className="flex items-center justify-center gap-4">
                    {!joined ? (
                        <Button
                            size="lg"
                            onClick={joinCall}
                            className="bg-green-600 hover:bg-green-500 px-8"
                        >
                            <Video className="h-5 w-5 mr-2" />
                            Join Session
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant={isVideoOn ? "default" : "destructive"}
                                size="lg"
                                onClick={toggleVideo}
                                className="rounded-full w-12 h-12 p-0"
                            >
                                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                            </Button>
                            
                            <Button
                                variant={isAudioOn ? "default" : "destructive"}
                                size="lg"
                                onClick={toggleAudio}
                                className="rounded-full w-12 h-12 p-0"
                            >
                                {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </Button>
                            
                            <Button
                                variant="destructive"
                                size="lg"
                                onClick={endSession}
                                className="rounded-full w-12 h-12 p-0"
                            >
                                <PhoneOff className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoSessionPage;