import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Calendar, 
    Clock, 
    User, 
    Settings, 
    ExternalLink,
    CheckCircle,
    XCircle,
    AlertCircle,
    Video,
    MessageSquare,
    Sparkles,
    Award,
    BookOpen,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import CalendlyBooking from '../components/CalendlyBooking';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

interface SessionRequest {
    id: string;
    requester_id: string;
    mentor_id: string;
    session_type: string;
    description: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'canceled';
    created_at: string;
    scheduled_time?: string;
    booking_method?: 'manual' | 'calendly';
    calendly_event_uri?: string;
    calendly_booking_url?: string;
    other_username?: string;
    other_display_name?: string;
    request_direction?: 'incoming' | 'outgoing';
}

interface Session {
    id: string;
    student_id: string;
    mentor_id: string;
    session_type: string;
    description: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    scheduled_time?: string;
    created_at: string;
    student_username: string;
    student_display_name?: string;
    mentor_username: string;
    mentor_display_name?: string;
    user_role_in_session: 'student' | 'mentor';
}

interface CalendlyEvent {
    uri: string;
    name: string;
    start_time: string;
    end_time: string;
    status: string;
    event_type: string;
    meeting_url?: string;
}

interface UserProfile {
    id: string;
    username: string;
    display_name?: string;
    calendly_url?: string;
    is_mentor: boolean;
    is_searchable_teacher: boolean;
}

const SessionCalendarPagePro: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [calendlyEvents, setCalendlyEvents] = useState<CalendlyEvent[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCalendlySetup, setShowCalendlySetup] = useState(false);
    const [calendlyUrl, setCalendlyUrl] = useState('');
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch user profile, session requests, and actual sessions in parallel
            const [profileResponse, requestsResponse, sessionsResponse] = await Promise.all([
                apiClient.get('/api/profiles/me'),
                apiClient.get('/api/sessions/requests?type=all'),
                apiClient.get('/api/sessions')
            ]);

            if (profileResponse.data.success) {
                setUserProfile(profileResponse.data.profile);
                setCalendlyUrl(profileResponse.data.profile.calendly_url || '');
            }

            if (requestsResponse.data.success) {
                setSessionRequests(requestsResponse.data.requests);
            }

            if (sessionsResponse.data.success) {
                setSessions(sessionsResponse.data.sessions);
            }

            // Try to fetch Calendly events if user is connected
            if (profileResponse.data.profile?.calendly_url) {
                try {
                    const calendlyResponse = await apiClient.get(`/api/calendly/events/${profileResponse.data.profile.id}`);
                    if (calendlyResponse.data.success) {
                        setCalendlyEvents(calendlyResponse.data.events);
                    }
                } catch (error) {
                    console.log('Calendly events not available:', error);
                }
            }

        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    const updateCalendlyUrl = async () => {
        try {
            const response = await apiClient.put('/api/profiles/me', {
                calendly_url: calendlyUrl
            });

            if (response.data.success) {
                toast.success('Calendly URL updated successfully!');
                setShowCalendlySetup(false);
                setUserProfile(prev => prev ? { ...prev, calendly_url: calendlyUrl } : null);
            }
        } catch (error) {
            console.error('Failed to update Calendly URL:', error);
            toast.error('Failed to update Calendly URL');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'accepted':
            case 'confirmed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'declined':
            case 'canceled':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getBookingMethodIcon = (method: string) => {
        switch (method) {
            case 'calendly':
                return <Sparkles className="h-3 w-3" />;
            case 'manual':
                return <Calendar className="h-3 w-3" />;
            default:
                return <Clock className="h-3 w-3" />;
        }
    };

    const renderOverview = () => {
        const pendingRequests = sessionRequests.filter(req => req.status === 'pending');
        const upcomingMeetings = sessionRequests.filter(req => 
            req.status === 'accepted' || req.status === 'confirmed'
        );
        const completedSessions = sessionRequests.filter(req => req.status === 'completed');

        return (
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Pending Requests</p>
                                    <p className="text-2xl font-bold">{pendingRequests.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Calendar className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Upcoming</p>
                                    <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Completed</p>
                                    <p className="text-2xl font-bold">{completedSessions.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Success Rate</p>
                                    <p className="text-2xl font-bold">
                                        {sessionRequests.length > 0 
                                            ? Math.round((completedSessions.length / sessionRequests.length) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Button
                                onClick={() => setActiveTab('booking')}
                                className="flex items-center gap-2 h-auto p-4"
                                variant="outline"
                            >
                                <Calendar className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">Book Session</div>
                                    <div className="text-xs text-slate-600">Schedule with mentor</div>
                                </div>
                            </Button>

                            <Button
                                onClick={() => setShowCalendlySetup(true)}
                                className="flex items-center gap-2 h-auto p-4"
                                variant="outline"
                            >
                                <Settings className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">Setup Calendly</div>
                                    <div className="text-xs text-slate-600">Configure your calendar</div>
                                </div>
                            </Button>

                            <Button
                                onClick={() => setActiveTab('requests')}
                                className="flex items-center gap-2 h-auto p-4"
                                variant="outline"
                            >
                                <Users className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">Manage Requests</div>
                                    <div className="text-xs text-slate-600">Review pending requests</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sessionRequests.slice(0, 5).map((request) => (
                                <div key={request.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                        {getBookingMethodIcon(request.booking_method || 'manual')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {request.session_type} with {request.other_display_name || request.other_username}
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {format(parseISO(request.created_at), 'MMM d, yyyy at h:mm a')}
                                        </div>
                                    </div>
                                    <Badge className={getStatusColor(request.status)}>
                                        {request.status}
                                    </Badge>
                                </div>
                            ))}
                            {sessionRequests.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    No session requests yet. Book your first session to get started!
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderSessionsSection = () => {
        const scheduledSessions = sessions.filter(session => session.status === 'scheduled');
        const activeSessions = sessions.filter(session => session.status === 'active');
        const completedSessions = sessions.filter(session => session.status === 'completed');

        const handleJoinSession = (sessionId: string) => {
            // Navigate to video session page
            window.location.href = `/session/${sessionId}`;
        };

        return (
            <div className="space-y-6">
                {/* Active Sessions */}
                {activeSessions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                                <Video className="h-5 w-5" />
                                Active Sessions ({activeSessions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activeSessions.map((session) => (
                                    <div key={session.id} className="border rounded-lg p-4 bg-green-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                                        {session.session_type}
                                                    </Badge>
                                                    <Badge className="bg-green-600">LIVE</Badge>
                                                </div>
                                                <h3 className="font-medium mt-2">
                                                    {session.user_role_in_session === 'student' 
                                                        ? `Session with ${session.mentor_display_name || session.mentor_username}`
                                                        : `Session with ${session.student_display_name || session.student_username}`
                                                    }
                                                </h3>
                                                <p className="text-sm text-slate-600">{session.description}</p>
                                            </div>
                                            <Button 
                                                onClick={() => handleJoinSession(session.id)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Video className="h-4 w-4 mr-2" />
                                                Join Session
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Scheduled Sessions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Scheduled Sessions ({scheduledSessions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {scheduledSessions.length > 0 ? (
                                scheduledSessions.map((session) => (
                                    <div key={session.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">
                                                        {session.session_type}
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                                        Scheduled
                                                    </Badge>
                                                </div>
                                                <h3 className="font-medium mt-2">
                                                    {session.user_role_in_session === 'student' 
                                                        ? `Session with ${session.mentor_display_name || session.mentor_username}`
                                                        : `Session with ${session.student_display_name || session.student_username}`
                                                    }
                                                </h3>
                                                <p className="text-sm text-slate-600">{session.description}</p>
                                                {session.scheduled_time && (
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        <Clock className="h-3 w-3 inline mr-1" />
                                                        {format(parseISO(session.scheduled_time), 'PPp')}
                                                    </p>
                                                )}
                                            </div>
                                            <Button 
                                                onClick={() => handleJoinSession(session.id)}
                                                variant="outline"
                                            >
                                                <Video className="h-4 w-4 mr-2" />
                                                Start Session
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    No scheduled sessions. Book a session to get started!
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Completed Sessions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Completed Sessions ({completedSessions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {completedSessions.length > 0 ? (
                                completedSessions.slice(0, 5).map((session) => (
                                    <div key={session.id} className="border rounded-lg p-4 bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">
                                                        {session.session_type}
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                                        Completed
                                                    </Badge>
                                                </div>
                                                <h3 className="font-medium mt-2">
                                                    {session.user_role_in_session === 'student' 
                                                        ? `Session with ${session.mentor_display_name || session.mentor_username}`
                                                        : `Session with ${session.student_display_name || session.student_username}`
                                                    }
                                                </h3>
                                                <p className="text-sm text-slate-600">{session.description}</p>
                                                {session.scheduled_time && (
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        <Clock className="h-3 w-3 inline mr-1" />
                                                        {format(parseISO(session.scheduled_time), 'PPp')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    No completed sessions yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderBookingSection = () => {
        if (!userProfile) return null;

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Professional Booking System
                        </CardTitle>
                        <p className="text-sm text-slate-600">
                            Book sessions with mentors using our integrated Calendly system for seamless scheduling.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Your Calendar */}
                            <div>
                                <h3 className="font-semibold mb-3">Your Calendar</h3>
                                {userProfile.calendly_url ? (
                                    <CalendlyBooking
                                        mentorId={userProfile.id}
                                        mentorName={userProfile.display_name || userProfile.username}
                                        mentorCalendlyUrl={userProfile.calendly_url}
                                        mode="inline"
                                        className="h-96"
                                    />
                                ) : (
                                    <Card className="h-96 flex items-center justify-center">
                                        <CardContent className="text-center">
                                            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                                            <p className="text-slate-600 mb-4">Set up your Calendly to start receiving bookings</p>
                                            <Button onClick={() => setShowCalendlySetup(true)}>
                                                Setup Calendly
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Find Mentors */}
                            <div>
                                <h3 className="font-semibold mb-3">Find Mentors</h3>
                                <Card className="h-96">
                                    <CardContent className="p-4">
                                        <div className="text-center mb-4">
                                            <User className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                                            <p className="text-slate-600 mb-4">Search for available mentors</p>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <Input placeholder="Search mentors by name or expertise..." />
                                            <Button className="w-full" variant="outline">
                                                Browse All Mentors
                                            </Button>
                                        </div>

                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-xs text-slate-500 mb-2">Popular Categories:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {['Trading', 'Coding', 'Business', 'Marketing'].map(category => (
                                                    <Badge key={category} variant="secondary" className="text-xs">
                                                        {category}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading your calendar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Session Calendar
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Manage your mentoring sessions with professional scheduling
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Pro System
                        </Badge>
                        {userProfile?.calendly_url && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(userProfile.calendly_url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View My Calendar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="booking">Booking</TabsTrigger>
                    <TabsTrigger value="requests">Requests</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    {renderOverview()}
                </TabsContent>

                <TabsContent value="sessions">
                    {renderSessionsSection()}
                </TabsContent>

                <TabsContent value="booking">
                    {renderBookingSection()}
                </TabsContent>

                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Session Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sessionRequests.map((request) => (
                                    <div key={request.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {request.session_type} with {request.other_display_name || request.other_username}
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {request.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                <span className="text-xs text-slate-500">
                                                    {format(parseISO(request.created_at), 'MMM d, yyyy at h:mm a')}
                                                </span>
                                                {request.booking_method && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {getBookingMethodIcon(request.booking_method)}
                                                        <span className="ml-1">{request.booking_method}</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calendar Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="calendly-url">Calendly URL</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id="calendly-url"
                                        placeholder="https://calendly.com/your-username/30min"
                                        value={calendlyUrl}
                                        onChange={(e) => setCalendlyUrl(e.target.value)}
                                    />
                                    <Button onClick={updateCalendlyUrl}>Save</Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Enter your Calendly scheduling URL to enable professional booking
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Calendly Setup Modal */}
            <Dialog open={showCalendlySetup} onOpenChange={setShowCalendlySetup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setup Calendly Integration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="calendly-setup-url">Your Calendly URL</Label>
                            <Input
                                id="calendly-setup-url"
                                placeholder="https://calendly.com/your-username/30min"
                                value={calendlyUrl}
                                onChange={(e) => setCalendlyUrl(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">How to get your Calendly URL:</h4>
                            <ol className="text-sm text-blue-800 space-y-1">
                                <li>1. Go to calendly.com and create an account</li>
                                <li>2. Create an event type (e.g., "30 Minute Meeting")</li>
                                <li>3. Copy the scheduling link from your event</li>
                                <li>4. Paste it here to enable professional booking</li>
                            </ol>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowCalendlySetup(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={updateCalendlyUrl} className="flex-1">
                                Save & Connect
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SessionCalendarPagePro;