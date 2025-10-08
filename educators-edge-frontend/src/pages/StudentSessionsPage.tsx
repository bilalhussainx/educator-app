import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Calendar,
    Clock,
    User,
    Video,
    MessageCircle,
    CheckCircle,
    AlertCircle,
    XCircle,
    Send,
    Bell,
    Phone,
    Mail
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import CalendlyBooking from '../components/CalendlyBooking';

interface SessionRequest {
    id: string;
    mentor_username: string;
    mentor_display_name?: string;
    session_type: string;
    description: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    responded_at?: string;
    scheduled_time?: string;
}

interface Appointment {
    id: string;
    mentor_id: string;
    mentor_username: string;
    mentor_display_name?: string;
    session_type: string;
    description?: string;
    scheduled_time?: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    session_url?: string;
    created_at: string;
}

interface Message {
    id: string;
    from_user_id: string;
    from_username: string;
    from_display_name?: string;
    to_user_id: string;
    message: string;
    created_at: string;
    session_id?: string;
}

const StudentSessionsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'calendar' | 'requests' | 'appointments' | 'messages'>('requests');
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [messageText, setMessageText] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            
            // Fetch outgoing session requests
            const requestsResponse = await apiClient.get('/api/sessions/requests?type=outgoing');
            if (requestsResponse.data.success) {
                const requests = requestsResponse.data.requests || [];
                console.log('Session requests fetched:', requests);
                setSessionRequests(requests);
            }

            // Fetch accepted appointments (sessions) - both from session_requests and sessions tables
            const [sessionsResponse, acceptedRequestsResponse] = await Promise.all([
                apiClient.get('/api/sessions'),
                apiClient.get('/api/sessions/requests?type=outgoing')
            ]);
            
            let allAppointments = [];

            // Get actual sessions (from sessions table)
            if (sessionsResponse.data.success) {
                const studentSessions = sessionsResponse.data.sessions
                    .filter((s: any) => s.user_role_in_session === 'student')
                    .map((s: any) => ({
                        ...s,
                        source: 'sessions_table'
                    }));
                allAppointments.push(...studentSessions);
            }

            // Get accepted session requests that haven't been converted to sessions yet
            if (acceptedRequestsResponse.data.success) {
                const acceptedRequests = acceptedRequestsResponse.data.requests
                    .filter((r: any) => r.status === 'accepted')
                    .map((r: any) => ({
                        id: r.id,
                        mentor_id: r.mentor_id,
                        mentor_username: r.mentor_username,
                        mentor_display_name: r.mentor_display_name,
                        session_type: r.session_type,
                        description: r.description,
                        scheduled_time: r.scheduled_time || r.preferred_datetime,
                        status: 'scheduled',
                        created_at: r.created_at,
                        source: 'session_requests'
                    }));
                allAppointments.push(...acceptedRequests);
            }

            console.log('All appointments fetched:', allAppointments);
            setAppointments(allAppointments);

            // Fetch messages
            try {
                const messagesResponse = await apiClient.get('/api/messages');
                if (messagesResponse.data.success) {
                    setMessages(messagesResponse.data.messages || []);
                }
            } catch (messageError) {
                console.log('Messages endpoint not available:', messageError);
                // Messages are optional, don't fail the whole load
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to fetch session data:', error);
            toast.error('Failed to load session data');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!selectedAppointment || !messageText.trim()) {
            toast.error('Please enter a message');
            return;
        }

        try {
            const response = await apiClient.post('/api/messages', {
                to_user_id: selectedAppointment.mentor_id,
                message: messageText.trim(),
                session_id: selectedAppointment.id
            });

            if (response.data.success) {
                toast.success('Message sent successfully!');
                setShowMessageModal(false);
                setMessageText('');
                setSelectedAppointment(null);
                fetchAllData(); // Refresh messages
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            toast.error(error.response?.data?.error || 'Failed to send message');
        }
    };

    const joinSession = async (appointment: Appointment) => {
        console.log('[StudentSessionsPage] ==================== JOIN SESSION ====================');
        console.log('[StudentSessionsPage] Full appointment object:', appointment);
        console.log('[StudentSessionsPage] Session ID:', appointment.id);
        console.log('[StudentSessionsPage] Session type:', appointment.session_type);
        console.log('[StudentSessionsPage] Session mode:', (appointment as any).session_mode);
        console.log('[StudentSessionsPage] Session status:', appointment.status);

        // Get session mode from appointment data
        const sessionMode = (appointment as any).session_mode;
        const sessionType = appointment.session_type;

        console.log('[StudentSessionsPage] Decision logic:');
        console.log('[StudentSessionsPage]   - Is video/mentoring/counseling?', ['video_call', 'mentoring', 'counseling'].includes(sessionType));
        console.log('[StudentSessionsPage]   - Is essay_editing?', sessionType === 'essay_editing');
        console.log('[StudentSessionsPage]   - Is essay?', sessionType === 'essay');
        console.log('[StudentSessionsPage]   - Session mode is essay?', sessionMode === 'essay');

        // Route based on session type and mode (same logic as teacher)
        if (sessionType === 'video_call' || sessionType === 'mentoring' || sessionType === 'counseling') {
            // Pure video sessions
            console.log('[StudentSessionsPage] ➡️ Routing to Video Session');
            navigate(`/video-session/${appointment.id}`);
            toast.success('Launching Video Call...');
        } else if (sessionType === 'essay_editing' || sessionType === 'essay' || sessionMode === 'essay') {
            // Essay editing sessions - route to UrgentEssaySessionPage
            console.log('[StudentSessionsPage] ➡️ Routing to Essay Editor');
            navigate(`/urgent-session/${appointment.id}/essay?session=${appointment.id}&mentor=teacher&type=live&role=student`);
            toast.success('Joining Essay Session...');
        } else {
            // Coding/tutoring sessions - route to LiveTutorialPage (AscentIDE)
            console.log('[StudentSessionsPage] ➡️ Routing to Code Editor (default)');
            navigate(`/session/${appointment.id}`);
            toast.success('Joining Code Session...');
        }
        console.log('[StudentSessionsPage] =========================================');
    };

    const getStatusBadge = (status: string, scheduledTime?: string) => {
        const isPastScheduled = scheduledTime && isPast(parseISO(scheduledTime));
        const isFutureScheduled = scheduledTime && isFuture(parseISO(scheduledTime));
        
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-500/20 text-yellow-300">Pending</Badge>;
            case 'accepted':
                return <Badge className="bg-green-500/20 text-green-300">Accepted</Badge>;
            case 'declined':
                return <Badge className="bg-red-500/20 text-red-300">Declined</Badge>;
            case 'scheduled':
                if (isPastScheduled) {
                    return <Badge className="bg-orange-500/20 text-orange-300">Waiting for Teacher</Badge>;
                } else if (isFutureScheduled) {
                    return <Badge className="bg-blue-500/20 text-blue-300">Upcoming</Badge>;
                }
                return <Badge className="bg-green-500/20 text-green-300">Scheduled</Badge>;
            case 'active':
                return <Badge className="bg-green-500/20 text-green-300">In Progress</Badge>;
            case 'completed':
                return <Badge className="bg-gray-500/20 text-gray-300">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-500/20 text-red-300">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getAppointmentActions = (appointment: Appointment) => {
        const isPastScheduled = appointment.scheduled_time && isPast(parseISO(appointment.scheduled_time));
        const isUpcoming = appointment.scheduled_time && isFuture(parseISO(appointment.scheduled_time));
        
        const actions = [];

        // Message teacher action (always available)
        actions.push(
            <Button
                key="message"
                size="sm"
                variant="outline"
                className="bg-blue-600/10 border-blue-600/30 text-blue-300 hover:bg-blue-600/20"
                onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowMessageModal(true);
                }}
            >
                <MessageCircle className="h-3 w-3 mr-1" />
                Message Teacher
            </Button>
        );

        // Join session actions based on status and time
        if (appointment.status === 'scheduled') {
            if (isPastScheduled) {
                actions.push(
                    <Button
                        key="waiting"
                        size="sm"
                        className="bg-orange-600/20 text-orange-300 cursor-not-allowed"
                        disabled
                    >
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting for Teacher
                    </Button>
                );
            } else if (isUpcoming) {
                actions.push(
                    <Button
                        key="scheduled"
                        size="sm"
                        className="bg-green-600/20 text-green-300 cursor-default"
                        disabled
                    >
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(parseISO(appointment.scheduled_time!), 'MMM d, h:mm a')}
                    </Button>
                );
            }
        }

        if (appointment.status === 'active' || (appointment.session_url && isPastScheduled)) {
            actions.push(
                <Button
                    key="join"
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 text-white"
                    onClick={() => joinSession(appointment)}
                >
                    <Video className="h-3 w-3 mr-1" />
                    Join Session
                </Button>
            );
        }

        return actions;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <Card className="bg-slate-800/40 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-center text-white">Loading your sessions...</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const pendingRequests = sessionRequests.filter(r => r.status === 'pending');
    const acceptedRequests = sessionRequests.filter(r => r.status === 'accepted');
    const upcomingAppointments = appointments.filter(a => 
        a.status === 'scheduled' && a.scheduled_time && isFuture(parseISO(a.scheduled_time))
    );
    const activeAppointments = appointments.filter(a => a.status === 'active');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Learning Sessions</h1>
                        <p className="text-slate-400">
                            Manage your session requests, appointments, and communication with teachers
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {pendingRequests.length > 0 && (
                            <Badge className="bg-orange-500/20 text-orange-300">
                                {pendingRequests.length} pending
                            </Badge>
                        )}
                        {upcomingAppointments.length > 0 && (
                            <Badge className="bg-blue-500/20 text-blue-300">
                                {upcomingAppointments.length} upcoming
                            </Badge>
                        )}
                        {activeAppointments.length > 0 && (
                            <Badge className="bg-green-500/20 text-green-300">
                                {activeAppointments.length} active
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Pending Requests</p>
                                    <p className="text-2xl font-bold text-white">{pendingRequests.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Accepted</p>
                                    <p className="text-2xl font-bold text-white">{acceptedRequests.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Appointments</p>
                                    <p className="text-2xl font-bold text-white">{appointments.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <MessageCircle className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Messages</p>
                                    <p className="text-2xl font-bold text-white">{messages.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                    <TabsList className="bg-slate-800 border-slate-700">
                        <TabsTrigger value="requests">
                            My Requests ({sessionRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="appointments">
                            Appointments ({appointments.length})
                        </TabsTrigger>
                        <TabsTrigger value="messages">
                            Messages ({messages.length})
                        </TabsTrigger>
                        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Session Requests</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Track the status of your session requests to teachers
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {sessionRequests.map((request) => (
                                        <Card key={request.id} className="bg-slate-700/50 border-slate-600">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback>
                                                                {(request.mentor_display_name || request.mentor_username)?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {request.mentor_display_name || request.mentor_username}
                                                            </p>
                                                            <p className="text-sm text-slate-400">
                                                                {request.session_type} • {format(parseISO(request.created_at), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(request.status, request.scheduled_time)}
                                                    </div>
                                                </div>
                                                {request.description && (
                                                    <p className="text-sm text-slate-300 mt-2 ml-12">
                                                        {request.description}
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {sessionRequests.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No session requests yet</p>
                                            <Button 
                                                onClick={() => navigate('/trust-graph-simple')}
                                                className="mt-4 bg-blue-600 hover:bg-blue-500"
                                            >
                                                Find Teachers
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="appointments" className="space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">My Appointments</CardTitle>
                                <CardDescription className="text-slate-400">
                                    View and join your scheduled learning sessions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {appointments.map((appointment) => (
                                        <Card key={appointment.id} className="bg-slate-700/50 border-slate-600">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback>
                                                                {(appointment.mentor_display_name || appointment.mentor_username)?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {appointment.mentor_display_name || appointment.mentor_username}
                                                            </p>
                                                            <p className="text-sm text-slate-400">
                                                                {appointment.session_type} • {
                                                                    appointment.scheduled_time 
                                                                        ? format(parseISO(appointment.scheduled_time), 'MMM d, yyyy \'at\' h:mm a')
                                                                        : 'Time TBD'
                                                                }
                                                            </p>
                                                            {appointment.description && (
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {appointment.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(appointment.status, appointment.scheduled_time)}
                                                        <div className="flex gap-2 ml-2">
                                                            {getAppointmentActions(appointment)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {appointments.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No appointments yet</p>
                                            <p className="text-sm mt-2">Request sessions to see them here once accepted</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="messages" className="space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Messages</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Communication with your teachers
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <Card key={message.id} className="bg-slate-700/50 border-slate-600">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <Avatar>
                                                        <AvatarFallback>
                                                            {(message.from_display_name || message.from_username)?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium text-white">
                                                                {message.from_display_name || message.from_username}
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                {format(parseISO(message.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-slate-300">
                                                            {message.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {messages.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No messages yet</p>
                                            <p className="text-sm mt-2">Start conversations with your teachers through appointments</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Calendar View</CardTitle>
                                <CardDescription className="text-slate-400">
                                    See all your sessions in calendar format
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-slate-400">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Calendar view coming soon</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Message Modal */}
                <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>
                                Message {selectedAppointment?.mentor_display_name || selectedAppointment?.mentor_username}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block text-slate-300">
                                    Your message
                                </label>
                                <Textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="bg-slate-800 border-slate-600 text-white"
                                    rows={4}
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-slate-600"
                                    onClick={() => setShowMessageModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={sendMessage}
                                    disabled={!messageText.trim()}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Message
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default StudentSessionsPage;