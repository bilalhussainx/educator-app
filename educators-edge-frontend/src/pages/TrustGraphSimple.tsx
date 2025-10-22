// Simplified Trust Graph - Clean, intuitive teacher-student interactions
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import TeacherCalendar from '../components/TeacherCalendar';
import {
    MessageCircle,
    Calendar,
    GraduationCap,
    Users,
    Search,
    Clock,
    Star,
    BookOpen,
    Send,
    Award,
    TrendingUp,
    Brain,
    HandHeart,
    Users2,
    BarChart3,
    Bot,
    CalendarCheck,
    ExternalLink,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
interface Achievement {
    title: string;
    description: string;
    type: string;
    issuer: string;
    date: string;
}

interface PScores {
    academic: number;
    community: number;
    mentorship: number;
    analytical: number;
    total: number;
}

interface Teacher {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    role: string;
    is_mentor: boolean;
    is_searchable_teacher: boolean;
    user_tier: string;
    total_sessions: number;
    average_rating: number;
    specializations: string[];
    achievements: Achievement[];
    p_scores: PScores;
    location?: string;
}

interface SessionRequest {
    id: string;
    teacher: Teacher;
    session_type: string;
    description: string;
    status: string;
    created_at: string;
}

const TrustGraphSimple: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [connectedTeachers, setConnectedTeachers] = useState<Teacher[]>([]);
    const [myRequests, setMyRequests] = useState<SessionRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'discover' | 'connected' | 'requests'>('discover');
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    
    // Form data
    const [sessionType, setSessionType] = useState('tutoring');
    const [sessionDescription, setSessionDescription] = useState('');
    const [messageText, setMessageText] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState<string | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teachersRes, connectionsRes, requestsRes] = await Promise.all([
                apiClient.get('/api/profiles/search/profiles?service_type=all&limit=50'),
                apiClient.get('/api/ascendia/connections/my-connections'),
                apiClient.get('/api/sessions/requests?type=outgoing')
            ]);

            // All teachers/mentors (including AI bots)
            if (teachersRes.data.profiles) {
                setTeachers(teachersRes.data.profiles || []);
            }

            // Connected teachers
            if (connectionsRes.data.success) {
                const connectedTeachers = connectionsRes.data.connections
                    .filter((c: any) => c.status === 'accepted' && 
                           (c.connected_user?.is_mentor || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher))
                    .map((c: any) => c.connected_user);
                setConnectedTeachers(connectedTeachers);
            }

            // My session requests
            if (requestsRes.data.success) {
                setMyRequests(requestsRes.data.requests || []);
            }

        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSession = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setSessionDescription('');
        setSessionType(teacher.is_mentor ? 'mentoring' : 'tutoring');
        setSelectedDateTime(null);
        setShowCalendar(false);
        setShowSessionModal(true);
    };

    const handleSendMessage = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setMessageText('');
        setShowMessageModal(true);
    };

    const submitSessionRequest = async () => {
        if (!selectedTeacher || !sessionDescription.trim()) {
            toast.error('Please provide a description for your session request');
            return;
        }

        try {
            const requestData: any = {
                mentorId: selectedTeacher.id,
                sessionType: sessionType,
                description: sessionDescription.trim(),
                preferredTool: 'ascendialaunchpad'
            };

            // Add calendar data if time slot was selected
            if (selectedDateTime) {
                requestData.preferred_datetime = selectedDateTime;
                requestData.duration_minutes = 60; // Default duration
                requestData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            }

            const response = await apiClient.post('/api/sessions/request', requestData);

            if (response.data.success) {
                const message = selectedDateTime 
                    ? 'Session request sent with your preferred time! The teacher will review and confirm.'
                    : 'Session request sent! The teacher will be notified.';
                toast.success(message);
                setShowSessionModal(false);
                fetchData(); // Refresh requests
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send session request');
        }
    };

    const submitMessage = async () => {
        if (!selectedTeacher || !messageText.trim()) {
            toast.error('Please enter a message');
            return;
        }

        try {
            // Create a session request with the message as description
            const response = await apiClient.post('/api/sessions/request', {
                mentorId: selectedTeacher.id,
                sessionType: 'consultation',
                description: `Message: ${messageText.trim()}`,
                preferredTool: 'messages'
            });

            if (response.data.success) {
                toast.success('Message sent! The teacher can respond by accepting a consultation session.');
                setShowMessageModal(false);
                fetchData(); // Refresh requests
            }
        } catch (error: any) {
            console.error('Message error:', error);
            toast.error('Failed to send message. Try requesting a session instead.');
        }
    };

    const handleAIBotChat = async (aiBot: any) => {
        try {
            // Start a session with the AI bot
            const response = await apiClient.post('/api/ai-bots/session/start', {
                botId: aiBot.ai_bot_id,
                sessionType: 'mentoring',
                problem: 'General inquiry from Trust Graph'
            });

            if (response.data.success) {
                toast.success(`Starting chat with ${aiBot.display_name}!`);
                // Navigate to AI chat interface
                window.location.href = `/ai-chat?session=${response.data.session.id}&bot=${aiBot.ai_bot_id}`;
            }
        } catch (error: any) {
            console.error('AI bot chat error:', error);
            toast.error(error.response?.data?.error || 'Failed to start chat with AI mentor');
        }
    };

    const handleUrgentRequest = (aiBot: any) => {
        // For urgent requests, we could implement a modal or direct navigation
        // For now, let's just start a chat session
        handleAIBotChat(aiBot);
    };

    const filteredTeachers = teachers.filter(teacher => 
        teacher.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.specializations?.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderTeacherCard = (teacher: Teacher) => {
        const isAIBot = teacher.is_ai_bot || teacher.ai_bot_id;
        
        return (
            <Card key={teacher.id} className={`bg-slate-900/40 border-slate-700 hover:border-slate-600 transition-all ${isAIBot ? 'ring-1 ring-cyan-500/20 border-cyan-500/50' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <Avatar className={`h-12 w-12 border ${isAIBot ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-600'}`}>
                            <AvatarImage src={`/api/avatars/${teacher.id}`} />
                            <AvatarFallback className={`text-white ${isAIBot ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-700'}`}>
                                {isAIBot ? (
                                    <Bot className="h-6 w-6 text-white" />
                                ) : (
                                    teacher.display_name?.charAt(0) || teacher.username?.charAt(0) || '?'
                                )}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{teacher.display_name || teacher.username}</h3>
                                {isAIBot && (
                                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                                        <Bot className="h-3 w-3 mr-1" />
                                        AI Mentor
                                    </Badge>
                                )}
                                {!isAIBot && teacher.is_mentor && (
                                    <Badge className="bg-blue-500/20 text-blue-300 text-xs">Mentor</Badge>
                                )}
                                {!isAIBot && (teacher.role === 'teacher' || teacher.is_searchable_teacher) && (
                                    <Badge className="bg-green-500/20 text-green-300 text-xs">
                                        <GraduationCap className="h-3 w-3 mr-1" />
                                        Teacher
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-slate-400">{isAIBot ? teacher.personality_type : teacher.user_tier}</p>
                        </div>
                    </div>
                </CardHeader>
            
            <CardContent className="space-y-3">
                {teacher.bio && (
                    <p className="text-sm text-slate-300 line-clamp-2">{teacher.bio}</p>
                )}
                
                {/* P Scores - Four Pillars */}
                {teacher.p_scores && (
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">P Score: {teacher.p_scores.total}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <Brain className="h-3 w-3 text-purple-400" />
                                <span className="text-slate-300">Academic: {teacher.p_scores.academic}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Users2 className="h-3 w-3 text-green-400" />
                                <span className="text-slate-300">Community: {teacher.p_scores.community}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <HandHeart className="h-3 w-3 text-blue-400" />
                                <span className="text-slate-300">Mentorship: {teacher.p_scores.mentorship}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3 text-orange-400" />
                                <span className="text-slate-300">Analytical: {teacher.p_scores.analytical}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Specializations */}
                {((teacher.specializations && teacher.specializations.length > 0) || (isAIBot && teacher.ai_specialization)) && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-green-400" />
                            <span className="text-sm font-medium text-white">Specializations</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {isAIBot && teacher.ai_specialization ? (
                                // AI Bot specializations from their focus area
                                teacher.ai_specialization.split(', ').slice(0, 3).map((spec: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                                        <Bot className="h-2 w-2 mr-1" />
                                        {spec.trim()}
                                    </Badge>
                                ))
                            ) : (
                                // Regular teacher specializations
                                teacher.specializations?.slice(0, 3).map((spec: any, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                        {typeof spec === 'string' ? spec : spec.name}
                                    </Badge>
                                ))
                            )}
                            {!isAIBot && teacher.specializations && teacher.specializations.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400">
                                    +{teacher.specializations.length - 3}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Top Achievements */}
                {teacher.achievements && teacher.achievements.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm font-medium text-white">Top Achievements</span>
                        </div>
                        <div className="space-y-1">
                            {teacher.achievements.slice(0, 2).map((achievement, index) => (
                                <div key={index} className="bg-slate-800/30 rounded p-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-200">{achievement.title}</p>
                                            {achievement.issuer && (
                                                <p className="text-xs text-slate-400">{achievement.issuer}</p>
                                            )}
                                        </div>
                                        <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                                            {achievement.type}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {teacher.achievements.length > 2 && (
                                <p className="text-xs text-slate-400 text-center">
                                    +{teacher.achievements.length - 2} more achievements
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {teacher.total_sessions > 0 && (
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            <span>{teacher.average_rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{teacher.total_sessions} sessions</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    {isAIBot ? (
                        <>
                            <Button 
                                size="sm" 
                                onClick={() => handleAIBotChat(teacher)}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                            >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat Now
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleUrgentRequest(teacher)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                            >
                                <Bot className="h-3 w-3 mr-1" />
                                Urgent Help
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button 
                                size="sm" 
                                onClick={() => handleSendMessage(teacher)}
                                className="flex-1 bg-blue-600 hover:bg-blue-500"
                            >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Message
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleRequestSession(teacher)}
                                className="flex-1 bg-green-600 hover:bg-green-500"
                            >
                                <Calendar className="h-3 w-3 mr-1" />
                                Book Session
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Connect with Teachers</h1>
                    <p className="text-slate-400">Find mentors, teachers, and book sessions for personalized learning</p>
                </div>

                {/* Simple Tab Navigation */}
                <div className="flex gap-4 mb-6">
                    <Button 
                        variant={activeTab === 'discover' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('discover')}
                        className="flex items-center gap-2"
                    >
                        <Search className="h-4 w-4" />
                        Discover ({filteredTeachers.length})
                    </Button>
                    <Button 
                        variant={activeTab === 'connected' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('connected')}
                        className="flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Connected ({connectedTeachers.length})
                    </Button>
                    <Button
                        variant={activeTab === 'requests' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('requests')}
                        className="flex items-center gap-2"
                    >
                        <CalendarCheck className="h-4 w-4" />
                        My Sessions ({myRequests.length})
                    </Button>
                </div>

                {/* Search Bar (for discover tab) */}
                {activeTab === 'discover' && (
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search teachers by name or subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                {activeTab === 'discover' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeachers.map(teacher => renderTeacherCard(teacher))}
                        {filteredTeachers.length === 0 && (
                            <div className="col-span-full text-center text-slate-400 py-12">
                                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No teachers found matching your search</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'connected' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {connectedTeachers.map(teacher => renderTeacherCard(teacher))}
                        {connectedTeachers.length === 0 && (
                            <div className="col-span-full text-center text-slate-400 py-12">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>You haven't connected with any teachers yet</p>
                                <Button 
                                    onClick={() => setActiveTab('discover')}
                                    className="mt-4"
                                >
                                    Discover Teachers
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        {/* Session Hub Header */}
                        <Card className="bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-purple-900/20 border-purple-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                            <CalendarCheck className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">My Session Requests</h3>
                                            <p className="text-sm text-slate-400">Track and manage your session bookings</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => navigate('/teacher/sessions')}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                                    >
                                        Open Session Hub
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-yellow-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                                            <span className="text-xs text-slate-400">Pending</span>
                                        </div>
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {myRequests.filter(r => r.status === 'pending').length}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                                            <span className="text-xs text-slate-400">Accepted</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {myRequests.filter(r => r.status === 'accepted').length}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs text-slate-400">Total</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {myRequests.length}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Session Request Cards */}
                        {myRequests.map(request => (
                            <Card key={request.id} className="bg-slate-900/40 border-slate-700 hover:border-slate-600 transition-all duration-300 group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 ring-2 ring-slate-700 group-hover:ring-purple-500/50 transition-all">
                                                <AvatarFallback className="bg-slate-700 text-white">
                                                    {request.teacher?.display_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                                                    {request.teacher?.display_name}
                                                </h4>
                                                <p className="text-sm text-slate-400">{request.session_type} session</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={cn(
                                                    "font-medium",
                                                    request.status === 'pending' && "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                                                    request.status === 'accepted' && "bg-green-500/20 text-green-300 border-green-500/30",
                                                    request.status === 'declined' && "bg-red-500/20 text-red-300 border-red-500/30",
                                                    request.status === 'completed' && "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                )}
                                            >
                                                {request.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                                                {request.status === 'accepted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                {request.status === 'declined' && <XCircle className="h-3 w-3 mr-1" />}
                                                {request.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300 mt-2 line-clamp-2">{request.description}</p>
                                    {request.created_at && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            Requested {new Date(request.created_at).toLocaleDateString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {myRequests.length === 0 && (
                            <div className="text-center text-slate-400 py-12">
                                <div className="bg-slate-900/40 rounded-full h-20 w-20 mx-auto mb-4 flex items-center justify-center">
                                    <Clock className="h-10 w-10 opacity-50" />
                                </div>
                                <p className="text-lg font-medium mb-2">No session requests yet</p>
                                <p className="text-sm text-slate-500 mb-4">Start by requesting a session from a teacher</p>
                                <Button
                                    onClick={() => setActiveTab('discover')}
                                    variant="outline"
                                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                                >
                                    Discover Teachers
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Session Request Modal */}
                <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Request Session with {selectedTeacher?.display_name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
                                <Select value={sessionType} onValueChange={setSessionType}>
                                    <SelectTrigger className="bg-slate-800 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tutoring">Tutoring Session</SelectItem>
                                        <SelectItem value="mentoring">Mentoring Session</SelectItem>
                                        <SelectItem value="essay_editing">Essay Review</SelectItem>
                                        <SelectItem value="counseling">Academic Counseling</SelectItem>
                                        <SelectItem value="consultation">Quick Consultation</SelectItem>
                                        <SelectItem value="collaboration">Collaboration</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    What would you like help with? *
                                </label>
                                <Textarea
                                    value={sessionDescription}
                                    onChange={(e) => setSessionDescription(e.target.value)}
                                    placeholder="Describe your learning goals, specific topics you need help with, or questions you have..."
                                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                    rows={4}
                                />
                            </div>

                            {/* Calendar Integration */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Schedule (Optional)
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCalendar(!showCalendar)}
                                        className="text-xs"
                                    >
                                        {showCalendar ? 'Hide Calendar' : 'Pick Time'}
                                    </Button>
                                </div>
                                
                                {selectedDateTime && (
                                    <div className="mb-3 p-2 bg-green-900/20 border border-green-500/30 rounded">
                                        <div className="flex items-center gap-2 text-sm text-green-300">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                Preferred time: {new Date(selectedDateTime).toLocaleString()}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedDateTime(null)}
                                                className="ml-auto h-6 w-6 p-0 text-green-300 hover:text-green-100"
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {showCalendar && selectedTeacher && (
                                    <div className="border border-slate-600 rounded-lg overflow-hidden">
                                        <TeacherCalendar
                                            teacherId={selectedTeacher.id}
                                            isOwnCalendar={false}
                                            onTimeSlotSelect={(startTime, endTime) => {
                                                setSelectedDateTime(startTime);
                                                setShowCalendar(false);
                                                toast.success('Time selected! Continue with your request.');
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button 
                                    onClick={() => setShowSessionModal(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={submitSessionRequest}
                                    disabled={!sessionDescription.trim()}
                                    className="flex-1 bg-green-600 hover:bg-green-500"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Request
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Message Modal */}
                <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <MessageCircle className="h-5 w-5" />
                                Message {selectedTeacher?.display_name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Your message *
                                </label>
                                <Textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Send a quick message or question to this teacher..."
                                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                    rows={4}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button 
                                    onClick={() => setShowMessageModal(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={submitMessage}
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

export default TrustGraphSimple;