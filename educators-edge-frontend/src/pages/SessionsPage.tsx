// src/pages/SessionsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Calendar,
    Clock,
    User,
    DollarSign,
    Video,
    FileText,
    Code,
    CheckCircle,
    XCircle,
    AlertCircle,
    MessageSquare,
    ExternalLink,
    PlayCircle,
    Star,
    ArrowLeft,
    Filter,
    Search,
    Mail,
    Phone,
    Zap,
    Radio
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { LiveSessionModal } from '../components/modals/LiveSessionModal';

interface SessionRequest {
    id: string | number;  // Support both UUID and integer
    requester_id: string;
    mentor_id: string;
    session_type: string;
    description: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    created_at: string;
    responded_at?: string;
    scheduled_time?: string;
    preferred_datetime?: string;
    duration_minutes?: number;
    other_username?: string;
    other_display_name?: string;
    student_username?: string;
    student_display_name?: string;
    mentor_username?: string;
    mentor_display_name?: string;
    request_direction?: 'incoming' | 'outgoing';
    calendly_booking_url?: string;
    booking_method?: string;
}

interface Session {
    id: string | number;  // Support both UUID and integer
    student_id: string;
    mentor_id: string;
    session_type: string;
    session_mode?: 'code' | 'essay';  // Platform choice set by teacher when starting
    description?: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'no_show';
    scheduled_time?: string;
    started_at?: string;
    ended_at?: string;
    student_username: string;
    student_display_name?: string;
    mentor_username: string;
    mentor_display_name?: string;
    user_role_in_session: 'student' | 'mentor';
    session_data?: any;
}

const SessionsPage: React.FC = () => {
    const navigate = useNavigate();
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('requests');
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [proposedPrice, setProposedPrice] = useState<number | null>(null);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);

    // LiveSessionModal state
    const [showLiveSessionModal, setShowLiveSessionModal] = useState(false);
    const [selectedSessionForStart, setSelectedSessionForStart] = useState<Session | null>(null);

    // Get current user info
    const token = localStorage.getItem('authToken');
    const user = token ? (() => {
        try {
            const decoded: any = JSON.parse(atob(token.split('.')[1]));
            return decoded.user || { id: decoded.userId, username: decoded.username, role: decoded.role };
        } catch {
            return null;
        }
    })() : null;

    useEffect(() => {
        fetchData();

        // Initialize Socket.IO connection
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log('[Socket.IO] Initializing connection to http://localhost:5000');
            const socketConnection = io('http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socketConnection.on('connect', () => {
                console.log('[Socket.IO] ✅ Connected to server, socket ID:', socketConnection.id);
            });

            socketConnection.on('connect_error', (error) => {
                console.error('[Socket.IO] ❌ Connection error:', error);
            });

            socketConnection.on('session_started', (data) => {
                console.log('[Socket.IO] =====================================');
                console.log('[Socket.IO] 🎉 SESSION STARTED EVENT RECEIVED!');
                console.log('[Socket.IO] Session ID:', data.sessionId);
                console.log('[Socket.IO] Session Mode:', data.sessionMode);
                console.log('[Socket.IO] Session Type:', data.sessionType);
                console.log('[Socket.IO] Full data:', data);
                console.log('[Socket.IO] =====================================');

                // Update the session status in real-time
                setSessions(prevSessions =>
                    prevSessions.map(s =>
                        s.id.toString() === data.sessionId.toString()
                            ? {
                                ...s,
                                status: 'active' as const,
                                started_at: data.startedAt,
                                session_mode: data.sessionMode as 'code' | 'essay'
                              }
                            : s
                    )
                );

                // Determine route based on session_mode (prioritize over session_type)
                const editorUrl = data.sessionMode === 'essay'
                    ? `/urgent-session/${data.sessionId}/essay?session=${data.sessionId}&mentor=teacher&type=live&role=student`
                    : `/session/${data.sessionId}`;

                // Show notification with join button
                toast.success('🎉 Session Started!', {
                    description: `${data.message || 'Teacher has started the session'}`,
                    action: {
                        label: 'Join Now',
                        onClick: () => navigate(editorUrl)
                    },
                    duration: 15000 // Show for 15 seconds
                });

                // Also refresh to ensure we have latest data
                setTimeout(() => fetchData(), 500);
            });

            socketConnection.on('session_ended', (data) => {
                console.log('[Socket.IO] Session ended notification:', data);

                // Remove the session from the list (since it's deleted)
                setSessions(prevSessions =>
                    prevSessions.filter(s => s.id.toString() !== data.sessionId.toString())
                );

                // Show notification
                toast.info('Session Ended', {
                    description: data.message || 'The session has been ended and removed',
                    duration: 5000
                });

                // Refresh to get latest data to ensure sync
                setTimeout(() => fetchData(), 500);
            });

            socketConnection.on('disconnect', () => {
                console.log('[Socket.IO] Disconnected from server');
            });

            setSocket(socketConnection);

            return () => {
                socketConnection.disconnect();
            };
        }
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);

            console.log('[SessionsPage] Fetching session data...');

            const [requestsRes, sessionsRes] = await Promise.all([
                apiClient.get('/api/sessions/requests?type=all'),
                apiClient.get('/api/sessions?status=all')
            ]);

            console.log('[SessionsPage] Requests response:', requestsRes.data);
            console.log('[SessionsPage] Sessions response:', sessionsRes.data);

            if (requestsRes.data.success) {
                console.log('[SessionsPage] Setting session requests:', requestsRes.data.requests);
                setSessionRequests(requestsRes.data.requests);
            }

            if (sessionsRes.data.success) {
                console.log('[SessionsPage] Setting sessions:', sessionsRes.data.sessions);
                setSessions(sessionsRes.data.sessions);
            }
        } catch (error: any) {
            console.error('[SessionsPage] Failed to fetch session data:', error);
            console.error('[SessionsPage] Error details:', error.response?.data);
            toast.error('Failed to load session data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRespondToRequest = async (requestId: string | number, action: 'accept' | 'decline') => {
        try {
            console.log('[SessionsPage] ==================== RESPOND TO REQUEST ====================');
            console.log('[SessionsPage] Request ID:', requestId);
            console.log('[SessionsPage] Action:', action);
            console.log('[SessionsPage] Scheduled Time:', scheduledDateTime);
            console.log('[SessionsPage] User:', user);

            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action,
                scheduledTime: action === 'accept' && scheduledDateTime ? scheduledDateTime : null
            });

            console.log('[SessionsPage] Response received:', response.data);

            if (response.data.success) {
                toast.success(`Session request ${action}ed successfully!`);
                if (action === 'accept' && response.data.session) {
                    console.log('[SessionsPage] ✅ Session created:', response.data.session);
                    toast.success(`Session created! ID: ${response.data.session.id}`);
                }
                setShowResponseModal(false);
                setSelectedRequest(null);
                setResponseMessage('');
                setProposedPrice(null);
                setScheduledDateTime('');

                // Refresh data after a short delay to ensure database is updated
                setTimeout(() => {
                    console.log('[SessionsPage] Refreshing session data...');
                    fetchData();
                }, 500);
            } else {
                console.error('[SessionsPage] ❌ Response success was false:', response.data);
                toast.error(response.data.error || response.data.message || 'Failed to process request');
            }
            console.log('[SessionsPage] =========================================');
        } catch (error: any) {
            console.error('[SessionsPage] ❌ ERROR responding to request:', error);
            console.error('[SessionsPage] Error response:', error.response);
            console.error('[SessionsPage] Error data:', error.response?.data);
            toast.error(error.response?.data?.error || error.response?.data?.message || `Failed to ${action} request`);
        }
    };

    const handleJoinSession = (session: Session) => {
        console.log('[SessionsPage] ==================== JOIN SESSION ====================');
        console.log('[SessionsPage] Full session object:', session);
        console.log('[SessionsPage] Session ID:', session.id);
        console.log('[SessionsPage] Session type:', session.session_type);
        console.log('[SessionsPage] Session mode:', session.session_mode);
        console.log('[SessionsPage] Session status:', session.status);
        console.log('[SessionsPage] User role:', session.user_role_in_session);

        // Validation
        if (!session || !session.id) {
            toast.error('Invalid session data');
            console.error('[SessionsPage] ❌ Invalid session:', session);
            return;
        }

        const sessionMode = session.session_mode;
        const sessionType = session.session_type;
        const isTeacher = session.user_role_in_session === 'mentor';
        const isActive = session.status === 'active';

        // Check if session is in a joinable state
        if (session.status === 'completed') {
            toast.warning('This session has already ended');
            return;
        }

        if (session.status === 'cancelled') {
            toast.error('This session has been cancelled');
            return;
        }

        // PRIORITY 1: If teacher and session not started yet (no mode set), show modal to choose mode
        if (isTeacher && !sessionMode) {
            console.log('[SessionsPage] ✅ Teacher needs to choose mode - opening LiveSessionModal');
            console.log('[SessionsPage] Reason: No session_mode set yet');
            setSelectedSessionForStart(session);
            setShowLiveSessionModal(true);
            return;
        }

        // PRIORITY 2: Route based on session_mode if set (teacher already chose)
        if (sessionMode === 'essay') {
            console.log('[SessionsPage] ➡️ Routing to Essay Editor (session_mode=essay)');
            const roleParam = isTeacher ? 'teacher' : 'student';
            navigate(`/urgent-session/${session.id}/essay?session=${session.id}&mentor=teacher&type=live&role=${roleParam}`);
            toast.success('Joining Essay Session...');
            console.log('[SessionsPage] =========================================');
            return;
        }

        if (sessionMode === 'code') {
            console.log('[SessionsPage] ➡️ Routing to Code Editor (session_mode=code)');
            navigate(`/session/${session.id}`);
            toast.success('Joining Code Session...');
            console.log('[SessionsPage] =========================================');
            return;
        }

        // PRIORITY 3: Fallback to session_type for legacy sessions or specific types
        console.log('[SessionsPage] No session_mode set, using session_type fallback');

        if (sessionType === 'video_call' || sessionType === 'mentoring' || sessionType === 'counseling') {
            console.log('[SessionsPage] ➡️ Routing to Video Session');
            navigate(`/video-session/${session.id}`);
            toast.success('Launching Video Call...');
        } else if (sessionType === 'essay_editing' || sessionType === 'essay') {
            console.log('[SessionsPage] ➡️ Routing to Essay Editor (legacy)');
            const roleParam = isTeacher ? 'teacher' : 'student';
            navigate(`/urgent-session/${session.id}/essay?session=${session.id}&mentor=teacher&type=live&role=${roleParam}`);
            toast.success('Joining Essay Session...');
        } else {
            // Default to Code Editor for tutoring, coding, and unknown types
            console.log('[SessionsPage] ➡️ Routing to Code Editor (default)');
            navigate(`/session/${session.id}`);
            toast.success('Joining Code Session...');
        }
        console.log('[SessionsPage] =========================================');
    };

    const getSessionTypeBadge = (type: string) => {
        const types: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            essay_editing: { label: 'Essay', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: <FileText className="h-3 w-3" /> },
            essay: { label: 'Essay', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: <FileText className="h-3 w-3" /> },
            coding: { label: 'Code', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: <Code className="h-3 w-3" /> },
            tutoring: { label: 'Tutoring', color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: <Code className="h-3 w-3" /> },
            mentoring: { label: 'Mentoring', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: <MessageSquare className="h-3 w-3" /> },
            counseling: { label: 'Counseling', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', icon: <MessageSquare className="h-3 w-3" /> },
            collaboration: { label: 'Collab', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: <User className="h-3 w-3" /> },
        };

        const typeConfig = types[type] || types.mentoring;

        return (
            <Badge className={typeConfig.color}>
                {typeConfig.icon}
                <span className="ml-1">{typeConfig.label}</span>
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, { color: string; icon: React.ReactNode }> = {
            pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: <Clock className="h-3 w-3" /> },
            accepted: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: <CheckCircle className="h-3 w-3" /> },
            declined: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: <XCircle className="h-3 w-3" /> },
            cancelled: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: <XCircle className="h-3 w-3" /> },
            scheduled: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: <Calendar className="h-3 w-3" /> },
            active: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: <PlayCircle className="h-3 w-3" /> },
            completed: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: <CheckCircle className="h-3 w-3" /> },
            no_show: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: <AlertCircle className="h-3 w-3" /> },
        };

        const statusConfig = statuses[status] || statuses.pending;

        return (
            <Badge className={statusConfig.color}>
                {statusConfig.icon}
                <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
            </Badge>
        );
    };

    const renderRequestCard = (request: SessionRequest) => {
        // Determine if this is an incoming request (someone requesting from you)
        // request_direction is set by the backend when type=all
        const isIncoming = request.request_direction === 'incoming';

        // Get the other user's name based on direction
        const otherUserName = isIncoming
            ? (request.student_display_name || request.student_username || request.other_display_name || request.other_username)
            : (request.mentor_display_name || request.mentor_username || request.other_display_name || request.other_username);

        console.log('[SessionsPage] Rendering request card:', {
            id: request.id,
            isIncoming,
            request_direction: request.request_direction,
            otherUserName,
            status: request.status
        });

        return (
            <Card key={request.id} className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-slate-600">
                                <AvatarImage src={`/api/avatars/${isIncoming ? request.requester_id : request.mentor_id}`} />
                                <AvatarFallback className="bg-slate-700 text-white">
                                    {otherUserName?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base font-semibold">{otherUserName || 'Unknown User'}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    {getSessionTypeBadge(request.session_type)}
                                    {getStatusBadge(request.status)}
                                    {isIncoming && (
                                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                                            Incoming
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(request.created_at).toLocaleDateString()}
                            </div>
                            {request.preferred_datetime && (
                                <div className="flex items-center gap-1 mt-1 text-blue-400">
                                    <Clock className="h-3 w-3" />
                                    {new Date(request.preferred_datetime).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-slate-300">{request.description}</p>

                    {request.booking_method === 'calendly' && request.calendly_booking_url && (
                        <div className="flex items-center gap-2 text-xs text-blue-400">
                            <ExternalLink className="h-3 w-3" />
                            <a href={request.calendly_booking_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                View Calendly Booking
                            </a>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {request.status === 'pending' && isIncoming && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setShowResponseModal(true);
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespondToRequest(request.id, 'decline')}
                                className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                            </Button>
                        </div>
                    )}

                    {request.status === 'accepted' && (
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                            <CheckCircle className="h-5 w-5 text-green-400 mx-auto mb-1" />
                            <p className="text-sm text-green-300">Request accepted! Session will be created.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderSessionCard = (session: Session) => {
        const isStudent = session.user_role_in_session === 'student';
        const otherUserName = isStudent
            ? (session.mentor_display_name || session.mentor_username)
            : (session.student_display_name || session.student_username);

        const canJoin = session.status === 'scheduled' || session.status === 'active';

        return (
            <Card key={session.id} className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-slate-600">
                                <AvatarImage src={`/api/avatars/${isStudent ? session.mentor_id : session.student_id}`} />
                                <AvatarFallback className="bg-slate-700 text-white">
                                    {otherUserName?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base font-semibold">{otherUserName || 'Unknown User'}</CardTitle>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {getSessionTypeBadge(session.session_type)}
                                    {getStatusBadge(session.status)}
                                    <Badge className="bg-slate-700 text-slate-300 text-xs">
                                        {isStudent ? 'Student' : 'Teacher'}
                                    </Badge>
                                    {session.session_mode && (
                                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">
                                            {session.session_mode === 'essay' ? '📝 Essay' : '💻 Code'}
                                        </Badge>
                                    )}
                                    {session.status === 'active' && (
                                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs animate-pulse">
                                            <Radio className="h-3 w-3 mr-1" />
                                            LIVE NOW
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Session ID: {session.id}
                                </div>
                            </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                            {session.scheduled_time && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(session.scheduled_time).toLocaleDateString()}
                                </div>
                            )}
                            {session.scheduled_time && (
                                <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(session.scheduled_time).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {session.description && (
                        <p className="text-sm text-slate-300">{session.description}</p>
                    )}

                    {/* Session Duration */}
                    {session.started_at && session.ended_at && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            Duration: {Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} minutes
                        </div>
                    )}

                    {/* Action Buttons */}
                    {canJoin && (
                        <div className="space-y-2">
                            <Button
                                onClick={() => handleJoinSession(session)}
                                className={`w-full ${
                                    session.status === 'active'
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 animate-pulse'
                                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                                }`}
                            >
                                {session.status === 'active' ? (
                                    <>
                                        <Radio className="h-4 w-4 mr-2" />
                                        Join Live Session Now
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Join Session
                                    </>
                                )}
                            </Button>
                            {session.user_role_in_session === 'mentor' && session.status === 'active' && (
                                <Button
                                    onClick={async () => {
                                        try {
                                            console.log('[SessionsPage] Ending and deleting session:', session.id);

                                            const response = await apiClient.post(`/api/sessions/${session.id}/end`, {
                                                deleteSession: true  // Delete the session completely
                                            });

                                            if (response.data.success) {
                                                console.log('[SessionsPage] ✅ Session ended and deleted');
                                                toast.success('Session ended and removed successfully');

                                                // Remove from UI immediately
                                                setSessions(prevSessions =>
                                                    prevSessions.filter(s => s.id.toString() !== session.id.toString())
                                                );

                                                // Refresh to ensure sync
                                                setTimeout(() => fetchData(), 500);
                                            } else {
                                                throw new Error(response.data.error || 'Failed to end session');
                                            }
                                        } catch (error: any) {
                                            console.error('[SessionsPage] ❌ Failed to end session:', error);
                                            toast.error(error.response?.data?.error || error.message || 'Failed to end session');
                                        }
                                    }}
                                    variant="outline"
                                    className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    End Session
                                </Button>
                            )}
                        </div>
                    )}

                    {session.status === 'completed' && (
                        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-purple-300">
                                    <CheckCircle className="h-4 w-4" />
                                    Completed
                                </div>
                                <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10">
                                    <Star className="h-3 w-3 mr-1" />
                                    Rate
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="ghost"
                            className="text-white hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-white">My Sessions</h1>
                            <p className="text-slate-300">Manage your learning sessions and requests</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/trust-graph')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Find Teachers
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur-lg border border-slate-700">
                        <TabsTrigger value="requests" className="data-[state=active]:bg-slate-700">
                            Session Requests
                            {sessionRequests.filter(r => r.status === 'pending').length > 0 && (
                                <Badge className="ml-2 bg-red-500 text-white text-xs">
                                    {sessionRequests.filter(r => r.status === 'pending').length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-700">
                            Active & Completed Sessions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="mt-6">
                        {sessionRequests.length === 0 ? (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                                <CardContent className="p-12 text-center">
                                    <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Session Requests</h3>
                                    <p className="text-slate-400 mb-6">Start by finding teachers in the Trust Graph</p>
                                    <Button onClick={() => navigate('/trust-graph')} className="bg-blue-600 hover:bg-blue-700">
                                        Browse Teachers
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessionRequests.map(renderRequestCard)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="sessions" className="mt-6">
                        {sessions.length === 0 ? (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                                <CardContent className="p-12 text-center">
                                    <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Sessions Yet</h3>
                                    <p className="text-slate-400 mb-6">Your scheduled and completed sessions will appear here</p>
                                    <Button onClick={() => navigate('/trust-graph')} className="bg-green-600 hover:bg-green-700">
                                        Find a Teacher
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessions.map(renderSessionCard)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Response Modal */}
            <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Accept Session Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-300 mb-2 block">Schedule Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-300 mb-2 block">Proposed Rate (Optional)</label>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-slate-400" />
                                <input
                                    type="number"
                                    placeholder="Hourly rate in USD"
                                    value={proposedPrice || ''}
                                    onChange={(e) => setProposedPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Leave blank for free session</p>
                        </div>
                        <div>
                            <label className="text-sm text-slate-300 mb-2 block">Message to Student (Optional)</label>
                            <Textarea
                                placeholder="Add any notes or instructions..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResponseModal(false)} className="border-slate-700">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => selectedRequest && handleRespondToRequest(selectedRequest.id, 'accept')}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Accept & Create Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* LiveSessionModal for teachers to choose mode */}
            <LiveSessionModal
                user={user}
                isOpen={showLiveSessionModal}
                onClose={() => {
                    setShowLiveSessionModal(false);
                    setSelectedSessionForStart(null);
                }}
                existingSessionId={selectedSessionForStart?.id}
            />
        </div>
    );
};

export default SessionsPage;
