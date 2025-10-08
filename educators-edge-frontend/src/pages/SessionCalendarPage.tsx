import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Calendar, 
    Clock, 
    Video,
    MessageCircle,
    Check,
    X,
    Plus,
    Settings,
    Users,
    Link,
    Copy,
    Mail,
    Phone,
    AlertCircle,
    Inbox,
    Send,
    Archive,
    Star,
    StarOff,
    MoreHorizontal,
    Reply,
    Forward,
    Tag,
    Filter,
    Search,
    RefreshCw,
    Bell,
    Globe,
    CheckCircle,
    XCircle,
    Zap
} from 'lucide-react';
import { format, parseISO, isSameDay, addDays, startOfWeek } from 'date-fns';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import CalendlyBooking from '../components/CalendlyBooking';
import AppointmentManager from '../components/AppointmentManager';

interface SessionRequest {
    id: string;
    student_username: string;
    student_display_name?: string;
    session_type: string;
    description: string;
    preferred_datetime?: string;
    duration_minutes?: number;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
}

interface Appointment {
    id: number;
    student_id: string;
    student_username: string;
    student_display_name?: string;
    session_type: string;
    description?: string;
    scheduled_time?: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    session_url?: string;
    agora_channel?: string;
    agora_token?: string;
    created_at: string;
    source?: 'internal' | 'calendly';
    calendly_uri?: string;
    location?: any;
    invitees?: any[];
}

interface CalendlyEvent {
    id: string;
    name: string;
    status: string;
    start_time: string;
    end_time: string;
    event_type: string;
    location: any;
    invitees: any[];
    uri: string;
}

interface SessionThread {
    id: string;
    subject: string;
    participants: {
        id: string;
        username: string;
        display_name?: string;
        avatar?: string;
    }[];
    lastMessage: {
        content: string;
        timestamp: string;
        from: string;
    };
    status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    isRead: boolean;
    isStarred: boolean;
    labels: string[];
    messageCount: number;
    createdAt: string;
}

const SessionCalendarPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'calendar' | 'appointments' | 'calendly' | 'settings'>('inbox');
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [calendlyEvents, setCalendlyEvents] = useState<CalendlyEvent[]>([]);
    const [sessionThreads, setSessionThreads] = useState<SessionThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendlyLoading, setCalendlyLoading] = useState(false);
    const [showSessionLinkModal, setShowSessionLinkModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [selectedThread, setSelectedThread] = useState<SessionThread | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [calendlyUrl, setCalendlyUrl] = useState<string>('');
    const [calendlyToken, setCalendlyToken] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedRequestForScheduling, setSelectedRequestForScheduling] = useState<Appointment | null>(null);
    const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
    const [schedulingMethod, setSchedulingMethod] = useState<'manual' | 'calendly'>('manual');
    const [showCalendlyWidget, setShowCalendlyWidget] = useState(false);
    const [responseMessage, setResponseMessage] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
        fetchSessionData();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const response = await apiClient.get('/api/profiles');
            // The profile controller returns profile data directly in response.data
            setUserProfile(response.data);
            setCalendlyUrl(response.data.calendly_url || '');
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    const fetchSessionData = async () => {
        try {
            setLoading(true);
            
            // Fetch session requests for email-like threads
            const requestsResponse = await apiClient.get('/api/sessions/requests?type=incoming');
            if (requestsResponse.data.success) {
                const requests = requestsResponse.data.requests || [];
                setSessionRequests(requests.filter((r: any) => r.status === 'pending'));
                
                // Convert requests to email-like threads
                const threads = requests.map((request: any) => ({
                    id: request.id,
                    subject: `Session Request: ${request.session_type}`,
                    participants: [{
                        id: request.requester_id,
                        username: request.student_username,
                        display_name: request.student_display_name
                    }],
                    lastMessage: {
                        content: request.description,
                        timestamp: request.created_at,
                        from: request.student_username
                    },
                    status: request.status === 'pending' ? 'requested' : 
                            request.status === 'accepted' ? 'accepted' : 'cancelled',
                    priority: 'normal',
                    isRead: false,
                    isStarred: false,
                    labels: [request.session_type],
                    messageCount: 1,
                    createdAt: request.created_at
                }));
                setSessionThreads(threads);
            }

            // Fetch internal appointments
            const appointmentsResponse = await apiClient.get('/api/calendar/my-appointments');
            if (appointmentsResponse.data.success) {
                setAppointments(appointmentsResponse.data.appointments || []);
            }

            // Fetch unified appointments (internal + Calendly)
            await fetchUnifiedAppointments();
        } catch (error) {
            console.error('Failed to fetch session data:', error);
            toast.error('Failed to load session data');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnifiedAppointments = async () => {
        try {
            const response = await apiClient.get('/api/calendar/unified-appointments');
            if (response.data.success) {
                const { internal, calendly, unified } = response.data.appointments;
                setAppointments(internal);
                setCalendlyEvents(calendly);
            }
        } catch (error) {
            console.error('Failed to fetch unified appointments:', error);
        }
    };

    const fetchCalendlyEvents = async () => {
        try {
            setCalendlyLoading(true);
            const response = await apiClient.get('/api/calendar/calendly/events?timeframe=upcoming');
            if (response.data.success) {
                setCalendlyEvents(response.data.events);
            } else {
                console.warn('Calendly events fetch failed:', response.data.error);
            }
        } catch (error) {
            console.error('Failed to fetch Calendly events:', error);
        } finally {
            setCalendlyLoading(false);
        }
    };

    const connectCalendlyAccount = async () => {
        if (!calendlyToken.trim()) {
            toast.error('Please enter your Calendly personal access token');
            return;
        }

        try {
            setSaving(true);
            const response = await apiClient.post('/api/calendar/calendly/connect', {
                accessToken: calendlyToken.trim(),
                calendlyUrl: calendlyUrl.trim()
            });

            if (response.data.success) {
                toast.success('✅ Calendly account connected successfully!');
                setUserProfile(prev => ({ ...prev, calendly_connected: true }));
                await fetchCalendlyEvents();
            } else {
                toast.error(response.data.error || 'Failed to connect Calendly account');
            }
        } catch (error: any) {
            console.error('Failed to connect Calendly:', error);
            toast.error(error.response?.data?.error || 'Failed to connect Calendly account');
        } finally {
            setSaving(false);
        }
    };

    const validateCalendlyUrl = (url: string): boolean => {
        if (!url) return true; // Allow empty URL
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname === 'calendly.com';
        } catch {
            return false;
        }
    };

    const saveCalendlyUrl = async () => {
        try {
            const trimmedUrl = calendlyUrl.trim();
            
            // Validate URL format
            if (trimmedUrl && !validateCalendlyUrl(trimmedUrl)) {
                toast.error('Please enter a valid Calendly URL (https://calendly.com/...)');
                return;
            }

            setSaving(true);
            const response = await apiClient.put('/api/profiles/update', {
                calendly_url: trimmedUrl
            });

            if (response.data.success) {
                setUserProfile(prev => ({
                    ...prev,
                    calendly_url: trimmedUrl
                }));
                
                if (trimmedUrl) {
                    toast.success('✅ Calendly URL saved! Students can now book sessions with you.');
                } else {
                    toast.success('✅ Calendly URL removed.');
                }
                
                // Refresh the calendar component
                fetchUserProfile();
            } else {
                toast.error('Failed to save Calendly URL');
            }
        } catch (error) {
            console.error('Failed to save Calendly URL:', error);
            toast.error('Failed to save Calendly URL');
        } finally {
            setSaving(false);
        }
    };

    const generateSessionLink = async (appointmentId: number) => {
        try {
            console.log('Generating session link for appointment:', appointmentId);
            // Generate Agora token
            const tokenResponse = await apiClient.get(`/api/sessions/${appointmentId}/generate-token`);
            console.log('Token response:', tokenResponse.data);
            
            if (tokenResponse.data.success && tokenResponse.data.token) {
                const sessionUrl = `${window.location.origin}/video-session/${appointmentId}`;
                const channelName = tokenResponse.data.channelName || appointmentId.toString();
                
                // Update appointment with session details
                setAppointments(prev => 
                    prev.map(apt => 
                        apt.id === appointmentId 
                            ? { 
                                ...apt, 
                                session_url: sessionUrl,
                                agora_channel: channelName,
                                agora_token: tokenResponse.data.token,
                                agora_app_id: tokenResponse.data.appId,
                                agora_uid: tokenResponse.data.uid
                            }
                            : apt
                    )
                );

                return {
                    sessionUrl,
                    channelName,
                    token: tokenResponse.data.token,
                    appId: tokenResponse.data.appId,
                    uid: tokenResponse.data.uid
                };
            }
        } catch (error) {
            console.error('Failed to generate session link:', error);
            toast.error('Failed to generate session link');
            return null;
        }
    };

    const handleStartSession = async (appointment: Appointment) => {
        try {
            if (appointment.session_url && appointment.agora_channel) {
                // Session already exists, join it
                navigate(`/video-session/${appointment.id}`);
            } else {
                // Show loading state
                toast.loading('Starting video session...');
                
                // Generate new session
                const sessionData = await generateSessionLink(appointment.id);
                if (sessionData) {
                    toast.dismiss();
                    toast.success('Session started! Redirecting to video call...');
                    navigate(`/video-session/${appointment.id}`);
                } else {
                    toast.dismiss();
                    // Fallback: Navigate anyway but show warning
                    toast.warning('Video service not configured. Starting demo mode...');
                    navigate(`/video-session/${appointment.id}`);
                }
            }
        } catch (error) {
            console.error('Error starting session:', error);
            toast.error('Failed to start session. Please try again.');
        }
    };

    const copySessionLink = async (appointment: Appointment) => {
        let sessionUrl = appointment.session_url;
        
        if (!sessionUrl) {
            const sessionData = await generateSessionLink(appointment.id);
            sessionUrl = sessionData?.sessionUrl;
        }
        
        if (sessionUrl) {
            await navigator.clipboard.writeText(sessionUrl);
            toast.success('Session link copied to clipboard!');
        }
    };

    const sendSessionLinkEmail = async (appointment: Appointment) => {
        // This would integrate with your email service
        toast.success('Session link sent to student via email!');
    };

    const respondToRequest = async (threadId: string, action: 'accept' | 'decline') => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${threadId}/respond`, {
                action
            });

            if (response.data.success) {
                toast.success(`Session request ${action}ed successfully!`);
                
                // Update the thread status
                setSessionThreads(prev => 
                    prev.map(thread => 
                        thread.id === threadId 
                            ? { ...thread, status: action === 'accept' ? 'accepted' : 'cancelled', isRead: true }
                            : thread
                    )
                );

                // Refresh data to get updated appointments
                await fetchSessionData();
            }
        } catch (error: any) {
            console.error('Failed to respond to request:', error);
            toast.error(error.response?.data?.error || `Failed to ${action} request`);
        }
    };

    const scheduleAppointmentTime = async (requestId: string, scheduledTime: string) => {
        try {
            const response = await apiClient.put(`/api/sessions/requests/${requestId}/schedule`, {
                scheduledTime
            });

            if (response.data.success) {
                toast.success('Appointment time scheduled successfully!');
                fetchSessionData();
                setShowScheduleModal(false);
                setSelectedRequestForScheduling(null);
                setScheduledDateTime('');
            }
        } catch (error: any) {
            console.error('Schedule appointment time error:', error);
            toast.error(error.response?.data?.error || 'Failed to schedule appointment time');
        }
    };

    const openScheduleModal = (appointment: Appointment) => {
        setSelectedRequestForScheduling(appointment);
        setScheduledDateTime('');
        setSchedulingMethod('manual');
        setShowCalendlyWidget(false);
        setResponseMessage('');
        setShowScheduleModal(true);
    };

    const sendSchedulingResponseToStudent = async (requestId: string, message: string, schedulingType: 'calendly_link' | 'fixed_time', calendlyUrl?: string, scheduledTime?: string) => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/schedule-response`, {
                message,
                schedulingType,
                calendlyUrl,
                scheduledTime
            });

            if (response.data.success) {
                toast.success('Scheduling response sent to student!');
                fetchSessionData();
                setShowScheduleModal(false);
                setSelectedRequestForScheduling(null);
                setScheduledDateTime('');
                setResponseMessage('');
                setShowCalendlyWidget(false);
            }
        } catch (error: any) {
            console.error('Send scheduling response error:', error);
            toast.error(error.response?.data?.error || 'Failed to send scheduling response');
        }
    };

    const getUpcomingAppointments = () => {
        const today = new Date();
        const nextWeek = addDays(today, 7);
        
        return appointments.filter(apt => {
            const timeString = apt.scheduled_time || apt.preferred_datetime;
            return timeString && 
                parseISO(timeString) >= today && 
                parseISO(timeString) <= nextWeek;
        }).sort((a, b) => {
            const timeA = a.scheduled_time || a.preferred_datetime;
            const timeB = b.scheduled_time || b.preferred_datetime;
            return new Date(timeA!).getTime() - new Date(timeB!).getTime();
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">Loading session calendar...</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const upcomingAppointments = getUpcomingAppointments();
    const todayAppointments = appointments.filter(apt => {
        const timeString = apt.scheduled_time || apt.preferred_datetime;
        return timeString && isSameDay(parseISO(timeString), new Date());
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Session Calendar</h1>
                        <p className="text-slate-400">
                            Manage your teaching sessions, appointments, and availability
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {sessionRequests.length > 0 && (
                            <Badge className="bg-orange-500 text-white">
                                {sessionRequests.length} pending requests
                            </Badge>
                        )}
                        {todayAppointments.length > 0 && (
                            <Badge className="bg-blue-500 text-white">
                                {todayAppointments.length} sessions today
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Pending Requests</p>
                                    <p className="text-2xl font-bold text-white">{sessionRequests.length}</p>
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
                                    <p className="text-sm text-slate-400">Today's Sessions</p>
                                    <p className="text-2xl font-bold text-white">{todayAppointments.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <Clock className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Upcoming</p>
                                    <p className="text-2xl font-bold text-white">{upcomingAppointments.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Total Sessions</p>
                                    <p className="text-2xl font-bold text-white">{appointments.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Email-Style Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => fetchSessionData()}
                            variant="outline" 
                            size="sm"
                            className="border-slate-600 text-slate-300"
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                        </Button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search sessions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-64 bg-slate-800 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setFilterStatus(filterStatus === 'all' ? 'unread' : 'all')}
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300"
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            {filterStatus === 'all' ? 'All' : 'Unread'}
                        </Button>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                    <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-slate-700">
                        <TabsTrigger value="inbox" className="flex items-center gap-2">
                            <Inbox className="h-4 w-4" />
                            Inbox ({sessionThreads.filter(t => !t.isRead).length})
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendar
                        </TabsTrigger>
                        <TabsTrigger value="appointments" className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Appointments ({appointments.length})
                        </TabsTrigger>
                        <TabsTrigger value="calendly" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Calendly ({calendlyEvents.length})
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* Email-Like Inbox Tab */}
                    <TabsContent value="inbox" className="space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Thread List */}
                            <div className="xl:col-span-2">
                                <Card className="bg-slate-800/40 border-slate-700">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-white flex items-center gap-2">
                                                <Mail className="h-5 w-5" />
                                                Session Requests
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-orange-500 text-white">
                                                    {sessionThreads.filter(t => !t.isRead).length} unread
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-700">
                                            {sessionThreads.map((thread) => (
                                                <div
                                                    key={thread.id}
                                                    onClick={() => setSelectedThread(thread)}
                                                    className={cn(
                                                        "p-4 hover:bg-slate-700/50 cursor-pointer transition-colors border-l-4",
                                                        thread.priority === 'urgent' && "border-l-red-500",
                                                        thread.priority === 'high' && "border-l-orange-500", 
                                                        thread.priority === 'normal' && "border-l-blue-500",
                                                        thread.priority === 'low' && "border-l-gray-500",
                                                        !thread.isRead && "bg-slate-800/30",
                                                        selectedThread?.id === thread.id && "bg-slate-700"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Avatar className="h-10 w-10 flex-shrink-0">
                                                            <AvatarFallback className="bg-slate-600 text-white">
                                                                {thread.participants[0]?.display_name?.charAt(0) || 
                                                                 thread.participants[0]?.username?.charAt(0) || '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    {thread.status === 'requested' && <Clock className="h-3 w-3 text-orange-400" />}
                                                                    {thread.status === 'accepted' && <CheckCircle className="h-3 w-3 text-green-400" />}
                                                                    {thread.status === 'in_progress' && <Video className="h-3 w-3 text-blue-400" />}
                                                                    {thread.status === 'completed' && <Check className="h-3 w-3 text-gray-400" />}
                                                                    {thread.status === 'cancelled' && <XCircle className="h-3 w-3 text-red-400" />}
                                                                </div>
                                                                <p className={cn(
                                                                    "font-medium text-sm truncate",
                                                                    thread.isRead ? "text-slate-300" : "text-white"
                                                                )}>
                                                                    {thread.participants[0]?.display_name || thread.participants[0]?.username}
                                                                </p>
                                                                {thread.isStarred && (
                                                                    <Star className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                                                                )}
                                                                <span className="text-xs text-slate-400 ml-auto">
                                                                    {format(parseISO(thread.createdAt), 'MMM d')}
                                                                </span>
                                                            </div>
                                                            <p className={cn(
                                                                "text-sm truncate mb-1",
                                                                thread.isRead ? "text-slate-400" : "text-slate-200"
                                                            )}>
                                                                {thread.subject}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate line-clamp-1">
                                                                {thread.lastMessage.content}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-2">
                                                                {thread.labels.map((label) => (
                                                                    <Badge key={label} className="text-xs bg-blue-600/20 text-blue-300 border-0">
                                                                        {label}
                                                                    </Badge>
                                                                ))}
                                                                <span className="text-xs text-slate-500 ml-auto">
                                                                    {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {sessionThreads.length === 0 && (
                                                <div className="p-8 text-center text-slate-400">
                                                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                    <p>No session requests yet</p>
                                                    <p className="text-sm mt-2">Your inbox will show student requests here</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Thread Detail Panel */}
                            <div className="space-y-6">
                                {selectedThread ? (
                                    <Card className="bg-slate-800/40 border-slate-700">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm text-white">{selectedThread.subject}</CardTitle>
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSessionThreads(prev => 
                                                                prev.map(t => 
                                                                    t.id === selectedThread.id 
                                                                        ? { ...t, isStarred: !t.isStarred }
                                                                        : t
                                                                )
                                                            );
                                                        }}
                                                    >
                                                        {selectedThread.isStarred ? 
                                                            <Star className="h-3 w-3 text-yellow-400 fill-current" /> : 
                                                            <StarOff className="h-3 w-3" />
                                                        }
                                                    </Button>
                                                    <Button size="sm" variant="ghost">
                                                        <MoreHorizontal className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-slate-600 text-white text-xs">
                                                        {selectedThread.participants[0]?.display_name?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {selectedThread.participants[0]?.display_name || 
                                                         selectedThread.participants[0]?.username}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {format(parseISO(selectedThread.lastMessage.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-900/50 rounded p-3">
                                                <p className="text-sm text-slate-300">{selectedThread.lastMessage.content}</p>
                                            </div>

                                            {selectedThread.status === 'requested' && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="flex-1 bg-green-600 hover:bg-green-500"
                                                        onClick={() => respondToRequest(selectedThread.id, 'accept')}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Accept
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10"
                                                        onClick={() => respondToRequest(selectedThread.id, 'decline')}
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Decline
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="border-t border-slate-700 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" className="border-slate-600">
                                                        <Reply className="h-3 w-3 mr-1" />
                                                        Reply
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="border-slate-600">
                                                        <Forward className="h-3 w-3 mr-1" />
                                                        Forward
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="bg-slate-800/40 border-slate-700">
                                        <CardContent className="p-8 text-center text-slate-400">
                                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>Select a thread to view details</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Calendar with Booked Appointments */}
                            <div className="xl:col-span-2">
                                <Card className="bg-slate-800/40 border-slate-700">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-white flex items-center gap-2">
                                                <Calendar className="h-5 w-5" />
                                                Your Teaching Calendar
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-500 text-white">
                                                    {appointments.length + calendlyEvents.length} appointments
                                                </Badge>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => fetchUnifiedAppointments()}
                                                    className="border-slate-600"
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1" />
                                                    Refresh
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {/* Week View Calendar */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-7 gap-2 mb-4">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                                    <div key={day} className="text-center text-sm font-medium text-slate-400 p-2">
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Calendar Grid with Appointments */}
                                            <div className="grid grid-cols-7 gap-2">
                                                {Array.from({ length: 35 }, (_, i) => {
                                                    const date = addDays(startOfWeek(new Date()), i);
                                                    const dayAppointments = appointments.filter(apt => {
                                                        const timeString = apt.scheduled_time || apt.preferred_datetime;
                                                        return timeString && isSameDay(parseISO(timeString), date);
                                                    });
                                                    const dayCalendlyEvents = calendlyEvents.filter(event =>
                                                        isSameDay(parseISO(event.start_time), date)
                                                    );
                                                    const isToday = isSameDay(date, new Date());
                                                    
                                                    return (
                                                        <div 
                                                            key={i}
                                                            className={cn(
                                                                "min-h-[100px] p-2 border border-slate-700 rounded-lg",
                                                                isToday && "bg-blue-900/20 border-blue-500/50",
                                                                (dayAppointments.length > 0 || dayCalendlyEvents.length > 0) && "bg-slate-700/30"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "text-sm font-medium mb-1",
                                                                isToday ? "text-blue-300" : "text-white"
                                                            )}>
                                                                {format(date, 'd')}
                                                            </div>
                                                            
                                                            {/* Internal Appointments */}
                                                            {dayAppointments.map((apt, idx) => (
                                                                <div 
                                                                    key={`internal-${idx}`}
                                                                    className="text-xs bg-green-600/20 text-green-300 p-1 rounded mb-1 truncate cursor-pointer hover:bg-green-600/30"
                                                                    onClick={() => setSelectedAppointment(apt)}
                                                                    title={`${apt.student_display_name || apt.student_username} - ${apt.session_type}`}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <Video className="h-2 w-2" />
                                                                        <span className="truncate">
                                                                            {format(parseISO(apt.scheduled_time!), 'HH:mm')} - {apt.student_display_name?.split(' ')[0] || apt.student_username.split('@')[0]}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            
                                                            {/* Calendly Events */}
                                                            {dayCalendlyEvents.map((event, idx) => (
                                                                <div 
                                                                    key={`calendly-${idx}`}
                                                                    className="text-xs bg-blue-600/20 text-blue-300 p-1 rounded mb-1 truncate cursor-pointer hover:bg-blue-600/30"
                                                                    title={`Calendly: ${event.name}`}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <Globe className="h-2 w-2" />
                                                                        <span className="truncate">
                                                                            {format(parseISO(event.start_time), 'HH:mm')} - {event.name.substring(0, 10)}...
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Legend */}
                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <div className="w-3 h-3 bg-green-600/20 border border-green-600/30 rounded"></div>
                                                    <span>Internal Sessions ({appointments.length})</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <div className="w-3 h-3 bg-blue-600/20 border border-blue-600/30 rounded"></div>
                                                    <span>Calendly Events ({calendlyEvents.length})</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <div className="w-3 h-3 bg-blue-900/20 border border-blue-500/50 rounded"></div>
                                                    <span>Today</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Today's Sessions Sidebar */}
                            <div className="space-y-6">
                                {/* Urgent Requests */}
                                {sessionRequests.slice(0, 3).map((request) => (
                                    <Card key={request.id} className="bg-orange-900/20 border-orange-500/30">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                                <CardTitle className="text-sm text-orange-300">New Request</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="bg-slate-700 text-white text-xs">
                                                            {(request.student_display_name || request.student_username)?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            {request.student_display_name || request.student_username}
                                                        </p>
                                                        <p className="text-xs text-slate-400">{request.session_type}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-2">
                                                    {request.description}
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-green-600 hover:bg-green-500 text-xs"
                                                        onClick={() => respondToRequest(request.id, 'accept')}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 text-xs"
                                                        onClick={() => respondToRequest(request.id, 'decline')}
                                                    >
                                                        Decline
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {/* Today's Sessions */}
                                <Card className="bg-blue-900/20 border-blue-500/30">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-blue-300">
                                            <Clock className="h-4 w-4" />
                                            Today's Sessions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {todayAppointments.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-4">
                                                No sessions scheduled for today
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {todayAppointments.map((appointment) => (
                                                    <div key={appointment.id} className="bg-slate-800/50 rounded p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarFallback className="bg-slate-600 text-xs">
                                                                        {(appointment.student_display_name || appointment.student_username)?.charAt(0)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-medium text-white">
                                                                    {appointment.student_display_name || appointment.student_username}
                                                                </span>
                                                            </div>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {appointment.session_type}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mb-2">
                                                            {appointment.scheduled_time && 
                                                                format(parseISO(appointment.scheduled_time), 'h:mm a')
                                                            }
                                                        </p>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs"
                                                                onClick={() => handleStartSession(appointment)}
                                                            >
                                                                <Video className="h-3 w-3 mr-1" />
                                                                Start
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={() => copySessionLink(appointment)}
                                                            >
                                                                <Link className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="requests">
                        <AppointmentManager />
                    </TabsContent>

                    <TabsContent value="appointments" className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Your Teaching Appointments</h3>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-green-500 text-white">
                                    {appointments.filter(a => a.status === 'scheduled').length} upcoming
                                </Badge>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => fetchUnifiedAppointments()}
                                    className="border-slate-600"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {appointments.map((appointment) => {
                                // Check both scheduled_time and preferred_datetime for time information
                                const timeString = appointment.scheduled_time || appointment.preferred_datetime;
                                const scheduledTime = timeString ? parseISO(timeString) : null;
                                const isUpcoming = scheduledTime && scheduledTime > new Date();
                                const isPast = scheduledTime && scheduledTime < new Date();
                                const sessionLink = appointment.session_url || `${window.location.origin}/video-session/${appointment.id}`;
                                
                                return (
                                    <Card key={appointment.id} className="bg-slate-800/40 border-slate-700 hover:bg-slate-800/60 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback className="bg-slate-600 text-white">
                                                            {(appointment.student_display_name || appointment.student_username)?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <h4 className="font-semibold text-white text-lg">
                                                                {appointment.student_display_name || appointment.student_username}
                                                            </h4>
                                                            <p className="text-slate-400 capitalize">
                                                                {appointment.session_type} Session
                                                            </p>
                                                        </div>
                                                        
                                                        {/* Session Details */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                <Clock className="h-4 w-4" />
                                                                <span>
                                                                    {scheduledTime 
                                                                        ? format(scheduledTime, 'MMM d, yyyy \'at\' h:mm a')
                                                                        : 'Time TBD'
                                                                    }
                                                                </span>
                                                                {!scheduledTime && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs h-6 px-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                                                                        onClick={() => openScheduleModal(appointment)}
                                                                    >
                                                                        Schedule Time
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                <Link className="h-4 w-4" />
                                                                <span className="truncate">
                                                                    Meeting ID: {appointment.id}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                <Users className="h-4 w-4" />
                                                                <span>
                                                                    1-on-1 Session
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Session Description */}
                                                        {appointment.description && (
                                                            <div className="text-sm text-slate-400 bg-slate-900/30 p-3 rounded-lg">
                                                                <p>📝 {appointment.description}</p>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Meeting Link */}
                                                        <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg">
                                                            <Video className="h-4 w-4 text-blue-400" />
                                                            <div className="flex-1">
                                                                <p className="text-xs text-slate-400 mb-1">Meeting Link:</p>
                                                                <code className="text-xs text-blue-300 bg-slate-800 px-2 py-1 rounded truncate block">
                                                                    {sessionLink}
                                                                </code>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(sessionLink);
                                                                    toast.success('Meeting link copied!');
                                                                }}
                                                                className="border-slate-600"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Status and Actions */}
                                                <div className="flex flex-col items-end gap-3">
                                                    <Badge className={cn(
                                                        appointment.status === 'scheduled' && isUpcoming && "bg-green-500/20 text-green-300",
                                                        appointment.status === 'scheduled' && isPast && "bg-orange-500/20 text-orange-300",
                                                        appointment.status === 'active' && "bg-blue-500/20 text-blue-300",
                                                        appointment.status === 'completed' && "bg-gray-500/20 text-gray-300",
                                                        appointment.status === 'cancelled' && "bg-red-500/20 text-red-300"
                                                    )}>
                                                        {appointment.status === 'scheduled' && isUpcoming && 'Upcoming'}
                                                        {appointment.status === 'scheduled' && isPast && 'Ready to Start'}
                                                        {appointment.status === 'active' && 'In Progress'}
                                                        {appointment.status === 'completed' && 'Completed'}
                                                        {appointment.status === 'cancelled' && 'Cancelled'}
                                                    </Badge>
                                                    
                                                    <div className="flex flex-col gap-2">
                                                        {/* Message Student */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                // Open message modal or navigate to messaging
                                                                toast.info('Messaging feature - coming soon!');
                                                            }}
                                                            className="border-slate-600 text-slate-300 hover:text-white"
                                                        >
                                                            <MessageCircle className="h-3 w-3 mr-1" />
                                                            Message Student
                                                        </Button>
                                                        
                                                        {/* Session Actions */}
                                                        {appointment.status === 'scheduled' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleStartSession(appointment)}
                                                                    className="bg-green-600 hover:bg-green-500"
                                                                >
                                                                    <Video className="h-3 w-3 mr-1" />
                                                                    {isPast ? 'Start Session' : 'Start Early'}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const subject = encodeURIComponent(`Session Reminder: ${appointment.session_type}`);
                                                                        const body = encodeURIComponent(
                                                                            `Hi ${appointment.student_display_name || appointment.student_username},\n\n` +
                                                                            `This is a reminder about our upcoming ${appointment.session_type} session.\n\n` +
                                                                            `📅 Time: ${scheduledTime ? format(scheduledTime, 'MMMM d, yyyy \'at\' h:mm a') : 'TBD'}\n` +
                                                                            `🔗 Meeting Link: ${sessionLink}\n\n` +
                                                                            `See you there!\n\nBest regards`
                                                                        );
                                                                        window.open(`mailto:${appointment.student_username}?subject=${subject}&body=${body}`);
                                                                    }}
                                                                    className="border-slate-600"
                                                                >
                                                                    <Mail className="h-3 w-3 mr-1" />
                                                                    Email Reminder
                                                                </Button>
                                                            </>
                                                        )}
                                                        
                                                        {appointment.status === 'active' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleStartSession(appointment)}
                                                                className="bg-blue-600 hover:bg-blue-500"
                                                            >
                                                                <Video className="h-3 w-3 mr-1" />
                                                                Rejoin Session
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            
                            {appointments.length === 0 && (
                                <Card className="bg-slate-800/40 border-slate-700">
                                    <CardContent className="p-12 text-center">
                                        <Calendar className="h-16 w-16 mx-auto mb-6 text-slate-500 opacity-50" />
                                        <h3 className="text-xl font-medium text-white mb-2">No appointments yet</h3>
                                        <p className="text-slate-400 mb-6">
                                            When students book sessions with you, they'll appear here with all meeting details.
                                        </p>
                                        <div className="flex flex-col gap-2 items-center">
                                            <p className="text-sm text-slate-500">Make sure to:</p>
                                            <ul className="text-sm text-slate-400 space-y-1">
                                                <li>✓ Set up your Calendly URL in Settings</li>
                                                <li>✓ Accept student session requests</li>
                                                <li>✓ Share your booking link with students</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* Calendly Integration Tab */}
                    <TabsContent value="calendly" className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    Calendly Integration
                                </h3>
                                <p className="text-slate-400 mt-1">
                                    Connect your Calendly account to show external bookings alongside internal sessions
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {calendlyEvents.length > 0 && (
                                    <Badge className="bg-blue-500 text-white">
                                        {calendlyEvents.length} events
                                    </Badge>
                                )}
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={fetchCalendlyEvents}
                                    disabled={calendlyLoading}
                                    className="border-slate-600"
                                >
                                    {calendlyLoading ? (
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Sync Events
                                </Button>
                            </div>
                        </div>

                        {/* Connection Status */}
                        <Card className="bg-slate-800/40 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-3 rounded-full",
                                        userProfile?.calendly_access_token ? "bg-green-500/20" : "bg-orange-500/20"
                                    )}>
                                        {userProfile?.calendly_access_token ? (
                                            <CheckCircle className="h-6 w-6 text-green-400" />
                                        ) : (
                                            <AlertCircle className="h-6 w-6 text-orange-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">
                                            {userProfile?.calendly_access_token ? 'Connected to Calendly' : 'Not Connected'}
                                        </h4>
                                        <p className="text-sm text-slate-400">
                                            {userProfile?.calendly_access_token 
                                                ? 'Your Calendly events will appear in the unified calendar'
                                                : 'Connect your Calendly account to sync external bookings'
                                            }
                                        </p>
                                    </div>
                                </div>
                                
                                {!userProfile?.calendly_access_token && (
                                    <div className="mt-6 space-y-4">
                                        <div>
                                            <Label htmlFor="calendly-token" className="text-white">
                                                Calendly Personal Access Token
                                            </Label>
                                            <Input
                                                id="calendly-token"
                                                type="password"
                                                placeholder="Enter your Calendly personal access token"
                                                value={calendlyToken}
                                                onChange={(e) => setCalendlyToken(e.target.value)}
                                                className="mt-2 bg-slate-900 border-slate-600 text-white"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Get your token from Calendly → Settings → Integrations → API & Webhooks
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={connectCalendlyAccount}
                                            disabled={saving || !calendlyToken.trim()}
                                            className="bg-blue-600 hover:bg-blue-500"
                                        >
                                            {saving ? (
                                                <>
                                                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <Link className="h-3 w-3 mr-2" />
                                                    Connect Account
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Calendly Events List */}
                        {calendlyEvents.length > 0 && (
                            <Card className="bg-slate-800/40 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white">Upcoming Calendly Events</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {calendlyEvents.map((event) => (
                                        <div key={event.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-600/20 rounded">
                                                    <Globe className="h-4 w-4 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-white">{event.name}</h4>
                                                    <p className="text-sm text-slate-400">
                                                        {format(parseISO(event.start_time), 'MMM d, yyyy \'at\' h:mm a')}
                                                    </p>
                                                    {event.invitees.length > 0 && (
                                                        <p className="text-xs text-slate-500">
                                                            {event.invitees.length} invitee{event.invitees.length !== 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge className="bg-blue-600/20 text-blue-300">
                                                {event.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Calendar Settings
                                </CardTitle>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Configure your Calendly integration for professional booking
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <label htmlFor="calendly-url" className="block text-sm font-medium mb-2">
                                        Calendly URL
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="calendly-url"
                                            placeholder="https://calendly.com/your-username/30min"
                                            value={calendlyUrl}
                                            onChange={(e) => setCalendlyUrl(e.target.value)}
                                            className={`${calendlyUrl && !validateCalendlyUrl(calendlyUrl) ? 'border-red-300 focus:border-red-500' : ''}`}
                                        />
                                        <Button 
                                            onClick={saveCalendlyUrl}
                                            disabled={saving || (calendlyUrl && !validateCalendlyUrl(calendlyUrl))}
                                            className="min-w-[80px]"
                                        >
                                            {saving ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                    <span>Saving</span>
                                                </div>
                                            ) : (
                                                'Save'
                                            )}
                                        </Button>
                                        {calendlyUrl && validateCalendlyUrl(calendlyUrl) && (
                                            <Button 
                                                variant="outline" 
                                                onClick={() => window.open(calendlyUrl, '_blank')}
                                                className="min-w-[80px]"
                                            >
                                                Test
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Enter your Calendly scheduling URL to enable professional booking
                                    </p>
                                    {calendlyUrl && !validateCalendlyUrl(calendlyUrl) && (
                                        <p className="text-xs text-red-600 mt-1">
                                            ❌ Please enter a valid Calendly URL (https://calendly.com/...)
                                        </p>
                                    )}
                                    {calendlyUrl && validateCalendlyUrl(calendlyUrl) && calendlyUrl !== userProfile?.calendly_url && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            ⚠️ You have unsaved changes
                                        </p>
                                    )}
                                    {userProfile?.calendly_url && (
                                        <p className="text-xs text-green-600 mt-1">
                                            ✅ Currently saved: {userProfile.calendly_url}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        How to get your Calendly URL:
                                    </h4>
                                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                        <li>1. Go to calendly.com and create an account</li>
                                        <li>2. Create an event type (e.g., "30 Minute Meeting")</li>
                                        <li>3. Copy the scheduling link from your event</li>
                                        <li>4. Paste it here to enable professional booking</li>
                                    </ol>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-medium">Professional Features</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                                <Check className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Real-time Sync</div>
                                                <div className="text-xs text-slate-600">Automatic updates via webhooks</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                                <Calendar className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Professional Booking</div>
                                                <div className="text-xs text-slate-600">Seamless scheduling experience</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                                <Video className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Video Integration</div>
                                                <div className="text-xs text-slate-600">Automatic meeting links</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Smart Reminders</div>
                                                <div className="text-xs text-slate-600">Automated notifications</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Enhanced Schedule Time Modal */}
                <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Schedule Appointment with Student</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                            {selectedRequestForScheduling && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                    <div className="font-medium text-lg">{selectedRequestForScheduling.session_type}</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        📚 Student: {selectedRequestForScheduling.student_display_name || selectedRequestForScheduling.student_username}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        📝 Request: {selectedRequestForScheduling.description}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        Requested: {format(parseISO(selectedRequestForScheduling.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                                    </div>
                                </div>
                            )}

                            {/* Scheduling Method Selection */}
                            <div className="space-y-3">
                                <Label className="text-base font-medium">How would you like to schedule this appointment?</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Button
                                        variant={schedulingMethod === 'manual' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSchedulingMethod('manual');
                                            setShowCalendlyWidget(false);
                                        }}
                                        className="h-auto p-4 text-left justify-start"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Set Fixed Time
                                            </div>
                                            <div className="text-xs opacity-80">
                                                Choose a specific date/time and confirm directly
                                            </div>
                                        </div>
                                    </Button>
                                    
                                    <Button
                                        variant={schedulingMethod === 'calendly' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSchedulingMethod('calendly');
                                            setShowCalendlyWidget(true);
                                        }}
                                        className="h-auto p-4 text-left justify-start"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Send Calendly Link
                                            </div>
                                            <div className="text-xs opacity-80">
                                                Let student pick from your available times
                                            </div>
                                        </div>
                                    </Button>
                                </div>
                            </div>

                            {/* Manual Time Selection */}
                            {schedulingMethod === 'manual' && (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="scheduledDateTime">Select Date and Time</Label>
                                        <Input
                                            id="scheduledDateTime"
                                            type="datetime-local"
                                            value={scheduledDateTime}
                                            onChange={(e) => setScheduledDateTime(e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="mt-1"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="responseMessage">Message to Student (optional)</Label>
                                        <Textarea
                                            id="responseMessage"
                                            placeholder="Hi! I've scheduled our session for the time above. Looking forward to working with you!"
                                            value={responseMessage}
                                            onChange={(e) => setResponseMessage(e.target.value)}
                                            className="mt-1"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Calendly Integration */}
                            {schedulingMethod === 'calendly' && showCalendlyWidget && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                                    Calendly Scheduling
                                                </div>
                                                <div className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                                                    This will send your Calendly link to the student, allowing them to book a time that works for both of you.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="calendlyMessage">Message to Student</Label>
                                        <Textarea
                                            id="calendlyMessage"
                                            placeholder="Hi! Please use my Calendly link below to book a convenient time for our session. I look forward to working with you!"
                                            value={responseMessage}
                                            onChange={(e) => setResponseMessage(e.target.value)}
                                            className="mt-1"
                                            rows={3}
                                        />
                                    </div>

                                    {calendlyUrl && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="text-sm">
                                                <strong>Your Calendly Link:</strong> 
                                                <div className="mt-1 text-green-700 dark:text-green-200 break-all">
                                                    {calendlyUrl}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowScheduleModal(false);
                                        setSelectedRequestForScheduling(null);
                                        setScheduledDateTime('');
                                        setResponseMessage('');
                                        setShowCalendlyWidget(false);
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                
                                {schedulingMethod === 'manual' ? (
                                    <Button
                                        onClick={() => {
                                            if (selectedRequestForScheduling && scheduledDateTime) {
                                                const isoDateTime = new Date(scheduledDateTime).toISOString();
                                                if (responseMessage.trim()) {
                                                    // Send response to student with fixed time
                                                    sendSchedulingResponseToStudent(
                                                        selectedRequestForScheduling.id, 
                                                        responseMessage || `Your session has been scheduled for ${format(new Date(scheduledDateTime), 'MMMM d, yyyy \'at\' h:mm a')}`,
                                                        'fixed_time',
                                                        undefined,
                                                        isoDateTime
                                                    );
                                                } else {
                                                    // Just schedule the time without message
                                                    scheduleAppointmentTime(selectedRequestForScheduling.id, isoDateTime);
                                                }
                                            }
                                        }}
                                        disabled={!scheduledDateTime}
                                        className="flex-1 bg-orange-600 hover:bg-orange-500"
                                    >
                                        <Clock className="h-4 w-4 mr-2" />
                                        Confirm Time
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            if (selectedRequestForScheduling && calendlyUrl) {
                                                sendSchedulingResponseToStudent(
                                                    selectedRequestForScheduling.id,
                                                    responseMessage || `Please use my Calendly link to book a convenient time for our session: ${calendlyUrl}`,
                                                    'calendly_link',
                                                    calendlyUrl
                                                );
                                            }
                                        }}
                                        disabled={!calendlyUrl || !responseMessage.trim()}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Calendly Link
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default SessionCalendarPage;