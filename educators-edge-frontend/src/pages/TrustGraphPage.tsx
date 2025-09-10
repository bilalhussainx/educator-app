// src/pages/TrustGraphPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import UrgentSessionRequest from '../components/UrgentSessionRequest';
import {
    Users,
    User,
    UserPlus,
    UserCheck,
    Search,
    Bot,
    MessageSquare,
    MessageCircle,
    Star,
    Award,
    Zap,
    TrendingUp,
    Network,
    Eye,
    Heart,
    GraduationCap,
    BarChart3,
    MapPin,
    Clock,
    Filter,
    Bell,
    Activity,
    UserMinus,
    Shield,
    Crown,
    Target,
    Bookmark,
    Sparkles,
    ChevronRight,
    Settings,
    Globe
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

// Types
interface Connection {
    id: string;
    user1_id: string;
    user2_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    // Populated user info
    connected_user: {
        id: string;
        username: string;
        display_name: string;
        bio: string;
        user_tier: 'pathfinder' | 'explorer' | 'navigator';
        ascendia_score: number;
        pillar_academic: number;
        pillar_community: number;
        pillar_mentorship: number;
        pillar_analytical: number;
        location?: string;
        specializations: string[];
        is_mentor: boolean;
        verified_mentor: boolean;
        role?: string;
        is_searchable_teacher?: boolean;
        total_sessions: number;
        average_rating: number;
    };
}

interface Follower {
    id: string;
    follower_id: string;
    followed_id: string;
    created_at: string;
    // Populated user info
    user: {
        id: string;
        username: string;
        display_name: string;
        bio: string;
        user_tier: 'pathfinder' | 'explorer' | 'navigator';
        ascendia_score: number;
        location?: string;
        specializations: string[];
        is_mentor: boolean;
        verified_mentor: boolean;
        role?: string;
        is_searchable_teacher?: boolean;
    };
}

interface NetworkStats {
    connections_count: number;
    followers_count: number;
    following_count: number;
    influence_score: number;
    network_reach: number;
    trust_rating: number;
    mutual_connections?: number;
    weekly_growth?: number;
}

interface ActivityItem {
    id: string;
    type: 'connection' | 'follow' | 'session' | 'achievement' | 'mention';
    user: {
        id: string;
        display_name: string;
        user_tier: string;
    };
    description: string;
    created_at: string;
    metadata?: any;
}

interface NetworkInsight {
    id: string;
    type: 'recommendation' | 'trending' | 'opportunity';
    title: string;
    description: string;
    actionText: string;
    actionData?: any;
    priority: 'high' | 'medium' | 'low';
}

// Tier styling
const TIER_STYLES: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
    standard: { color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
    contributor: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    ascendant: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' }
};

const TrustGraphPage: React.FC = () => {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [following, setFollowing] = useState<Follower[]>([]);
    const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [networkInsights, setNetworkInsights] = useState<NetworkInsight[]>([]);
    const [suggestedConnections, setSuggestedConnections] = useState([]);
    const [discoverProfiles, setDiscoverProfiles] = useState<any[]>([]);
    const [discoverFilters, setDiscoverFilters] = useState({
        tier: '',
        role: '',
        location: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [activeTab, setActiveTab] = useState('network');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUrgentRequestModal, setShowUrgentRequestModal] = useState(false);
    const [selectedAIBot, setSelectedAIBot] = useState<any>(null);
    const [isCleaningUpSessions, setIsCleaningUpSessions] = useState(false);
    const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<any>(null);
    const [sessionDescription, setSessionDescription] = useState('');
    const [sessionType, setSessionType] = useState('mentoring');
    const [sessionRequests, setSessionRequests] = useState([]);

    useEffect(() => {
        fetchNetworkData();
        fetchDiscoverProfiles();
        fetchSessionRequests();
    }, []);

    const fetchDiscoverProfiles = async (filters: Record<string, any> = {}) => {
        try {
            setIsDiscovering(true);
            
            const queryParams = new URLSearchParams();
            
            // Add filters
            if (filters.role && filters.role !== '') {
                queryParams.append('service_type', filters.role);
            }
            if (filters.location && filters.location !== '') {
                queryParams.append('location', filters.location);
            }
            
            // Default to getting available mentors/counselors/editors
            if (!filters.role) {
                queryParams.append('service_type', 'all');
            }
            
            queryParams.append('limit', '12'); // Get 12 profiles for discovery
            
            const response = await apiClient.get(`/api/profiles/search/profiles?${queryParams.toString()}`);
            
            if (response.data.profiles) {
                setDiscoverProfiles(response.data.profiles);
            }
        } catch (error: any) {
            console.error('Discover profiles fetch error:', error);
            // Don't show toast error for discovery, just log it
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleDiscoverFilter = () => {
        fetchDiscoverProfiles(discoverFilters);
    };

    const fetchNetworkData = async () => {
        try {
            setIsLoading(true);
            
            // Fetch all network data in parallel
            const [connectionsRes, followersRes, followingRes, statsRes, activityRes, insightsRes, suggestionsRes] = await Promise.all([
                apiClient.get('/api/ascendia/connections/my-connections'),
                apiClient.get('/api/ascendia/followers/my-followers'),
                apiClient.get('/api/ascendia/followers/my-following'),
                apiClient.get('/api/ascendia/network/stats'),
                apiClient.get('/api/ascendia/network/activity'),
                apiClient.get('/api/ascendia/network/insights'),
                apiClient.get('/api/ascendia/network/suggestions')
            ]);

            if (connectionsRes.data.success) {
                setConnections(connectionsRes.data.connections);
            }
            if (followersRes.data.success) {
                setFollowers(followersRes.data.followers);
            }
            if (followingRes.data.success) {
                setFollowing(followingRes.data.following);
            }
            if (statsRes.data.success) {
                setNetworkStats(statsRes.data.stats);
            }
            if (activityRes.data.success) {
                setRecentActivity(activityRes.data.activity);
            }
            if (insightsRes.data.success) {
                setNetworkInsights(insightsRes.data.insights);
            }
            if (suggestionsRes.data.success) {
                setSuggestedConnections(suggestionsRes.data.suggestions);
            }
        } catch (error: any) {
            console.error('Network data fetch error:', error);
            toast.error('Failed to load network data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            const response = await apiClient.get(`/api/ascendia/network/search?q=${encodeURIComponent(searchQuery)}`);
            
            if (response.data.success) {
                setSearchResults(response.data.users);
                setActiveTab('search');
            } else {
                throw new Error(response.data.message || 'Search failed');
            }
        } catch (error: any) {
            console.error('Network search error:', error);
            toast.error(error.message || 'Search failed');
        }
    };

    const handleConnectionRequest = async (userId: string, action: 'send' | 'accept' | 'decline') => {
        try {
            let response;
            
            switch (action) {
                case 'send':
                    response = await apiClient.post('/api/ascendia/connections/send-request', { targetUserId: userId });
                    break;
                case 'accept':
                    response = await apiClient.post(`/api/ascendia/connections/${userId}/accept`);
                    break;
                case 'decline':
                    response = await apiClient.post(`/api/ascendia/connections/${userId}/decline`);
                    break;
            }

            if (response.data.success) {
                toast.success(`Connection ${action}ed successfully`);
                fetchNetworkData(); // Refresh data
            } else {
                throw new Error(response.data.message || `Failed to ${action} connection`);
            }
        } catch (error: any) {
            console.error(`Connection ${action} error:`, error);
            toast.error(error.message || `Failed to ${action} connection`);
        }
    };

    const handleFollow = async (userId: string, isFollowing: boolean) => {
        try {
            const response = isFollowing ? 
                await apiClient.post(`/api/ascendia/followers/unfollow/${userId}`) :
                await apiClient.post(`/api/ascendia/followers/follow/${userId}`);

            if (response.data.success) {
                toast.success(isFollowing ? 'Unfollowed successfully' : 'Following successfully');
                fetchNetworkData(); // Refresh data
            } else {
                throw new Error(response.data.message || 'Follow action failed');
            }
        } catch (error: any) {
            console.error('Follow action error:', error);
            toast.error(error.message || 'Follow action failed');
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
                // Navigate to AI chat interface (you can create this page)
                navigate(`/ai-chat?session=${response.data.session.id}&bot=${aiBot.ai_bot_id}`);
            }
        } catch (error: any) {
            console.error('AI bot chat error:', error);
            toast.error(error.response?.data?.error || 'Failed to start chat with AI mentor');
        }
    };

    const handleUrgentRequest = (aiBot: any) => {
        // Open urgent request modal with AI bot pre-selected
        setShowUrgentRequestModal(true);
        setSelectedAIBot(aiBot);
    };

    const handleEndActiveSessions = async () => {
        setIsCleaningUpSessions(true);
        try {
            const response = await apiClient.post('/api/ai-bots/urgent-request/cleanup', {
                force: true // Force cleanup all sessions
            });

            if (response.data.success) {
                toast.success(`Successfully cleaned up ${response.data.message}`);
                console.log('Cleanup result:', response.data);
            } else {
                toast.error('Failed to cleanup sessions');
            }
        } catch (error: any) {
            console.error('Session cleanup error:', error);
            toast.error(error.response?.data?.error || 'Failed to cleanup sessions');
        } finally {
            setIsCleaningUpSessions(false);
        }
    };

    const handleSessionRequest = (user: any) => {
        setSelectedMentor(user);
        setSessionDescription('');
        // Determine session type based on user role/type
        if (user.is_mentor) {
            setSessionType('mentoring');
        } else if (user.role === 'teacher' || user.is_searchable_teacher) {
            setSessionType('tutoring');
        } else {
            setSessionType('collaboration');
        }
        setShowSessionRequestModal(true);
    };

    const submitSessionRequest = async () => {
        if (!selectedMentor || !sessionDescription.trim()) {
            toast.error('Please provide a description for your session request');
            return;
        }

        try {
            const response = await apiClient.post('/api/sessions/request', {
                mentorId: selectedMentor.id,
                sessionType: sessionType,
                description: sessionDescription.trim(),
                preferredTool: selectedMentor.is_mentor ? 'ascendialaunchpad' : 'essayeditor'
            });

            if (response.data.success) {
                toast.success('Session request sent successfully! You will be notified when the mentor responds.');
                setShowSessionRequestModal(false);
                setSelectedMentor(null);
                setSessionDescription('');
            } else {
                throw new Error(response.data.message || 'Failed to send session request');
            }
        } catch (error: any) {
            console.error('Session request error:', error);
            toast.error(error.response?.data?.error || error.message || 'Failed to send session request');
        }
    };

    const fetchSessionRequests = async () => {
        try {
            const response = await apiClient.get('/api/sessions/requests?type=incoming');
            if (response.data.success) {
                setSessionRequests(response.data.requests);
            }
        } catch (error: any) {
            console.error('Fetch session requests error:', error);
            // Don't show toast error as this is a background fetch
        }
    };

    const respondToSessionRequest = async (requestId: string, action: 'accept' | 'decline', scheduledTime?: string) => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action,
                scheduledTime
            });

            if (response.data.success) {
                toast.success(`Session request ${action}ed successfully!`);
                fetchSessionRequests(); // Refresh the list
                
                if (action === 'accept') {
                    // Navigate to the session when accepted
                    toast.success('Session created! You can now start the live editing session.');
                    // You could navigate to the session page here
                    // navigate(`/session/${response.data.session.id}`);
                }
            } else {
                throw new Error(response.data.message || `Failed to ${action} session request`);
            }
        } catch (error: any) {
            console.error(`${action} session request error:`, error);
            toast.error(error.response?.data?.error || error.message || `Failed to ${action} session request`);
        }
    };

    const renderUserCard = (user: any, showActions: boolean = true, connectionStatus?: string) => {
        const tierStyle = TIER_STYLES[user.user_tier || 'pathfinder'] || TIER_STYLES['pathfinder'];
        const isAIBot = user.is_ai_bot || user.ai_bot_id;
        
        // User data now includes role and is_searchable_teacher fields
        
        return (
            <Card key={user.id} className={cn(
                "bg-slate-900/40 backdrop-blur-lg border text-white transition-all duration-200 hover:scale-[1.02]",
                isAIBot ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : tierStyle.borderColor
            )}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(
                                "h-12 w-12 border",
                                isAIBot ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-600'
                            )}>
                                <AvatarImage src={`/api/avatars/${user.id}`} />
                                <AvatarFallback className={cn(
                                    "text-white font-bold",
                                    isAIBot ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-700'
                                )}>
                                    {isAIBot ? (
                                        <Bot className="h-6 w-6 text-white" />
                                    ) : (
                                        user.display_name?.charAt(0) || user.username?.charAt(0) || '?'
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                                    {user.display_name || user.username || 'Unknown User'}
                                    {isAIBot && (
                                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-2 py-1 text-xs font-medium">
                                            <Bot className="h-3 w-3 mr-1" />
                                            AI Mentor
                                        </Badge>
                                    )}
                                    {user.verified_mentor && (
                                        <Award className="h-4 w-4 text-blue-400" />
                                    )}
                                    {(user.role === 'teacher' || user.is_searchable_teacher) && (
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-2 py-1 text-xs font-medium">
                                            <GraduationCap className="h-3 w-3 mr-1" />
                                            Teacher
                                        </Badge>
                                    )}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    {!isAIBot && (
                                        <>
                                            <Badge className={cn("px-2 py-1 text-xs font-medium", tierStyle.bgColor, tierStyle.color)}>
                                                {(user.user_tier || 'pathfinder').charAt(0).toUpperCase() + (user.user_tier || 'pathfinder').slice(1)}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-sm text-slate-300 font-medium">
                                                <Zap className="h-3 w-3 text-yellow-400" />
                                                {user.ascendia_score || 0}
                                            </div>
                                        </>
                                    )}
                                    {isAIBot && user.personality_type && (
                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-2 py-1 text-xs font-medium">
                                            {user.personality_type}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {showActions && (
                            <div className="flex flex-col gap-2">
                                {isAIBot ? (
                                    <>
                                        <Button 
                                            size="sm"
                                            onClick={() => handleAIBotChat(user)}
                                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium shadow-lg hover:shadow-cyan-500/25 transition-all duration-200"
                                        >
                                            <MessageSquare className="h-3 w-3 mr-1" />
                                            Chat Now
                                        </Button>
                                        <Button 
                                            size="sm"
                                            onClick={() => handleUrgentRequest(user)}
                                            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 font-medium shadow-lg hover:shadow-red-500/25 transition-all duration-200"
                                        >
                                            <Zap className="h-3 w-3 mr-1" />
                                            Urgent Help
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {connectionStatus === 'pending' ? (
                                            <Badge className="bg-yellow-500/10 text-yellow-400 font-medium border border-yellow-500/30">Pending</Badge>
                                        ) : connectionStatus === 'connected' ? (
                                            <Badge className="bg-green-500/10 text-green-400 font-medium border border-green-500/30">Connected</Badge>
                                        ) : (
                                            <Button 
                                                size="sm"
                                                onClick={() => handleConnectionRequest(user.id, 'send')}
                                                className="bg-blue-600 hover:bg-blue-500 font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                                            >
                                                <UserPlus className="h-3 w-3 mr-1" />
                                                Connect
                                            </Button>
                                        )}
                                        
                                        {(user.is_mentor || user.role === 'teacher' || user.is_searchable_teacher) ? (
                                            <Button 
                                                size="sm"
                                                onClick={() => navigate(`/sessions?${user.is_mentor ? 'mentor' : 'teacher'}=${user.id}`)}
                                                className="bg-purple-600 hover:bg-purple-500 font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
                                            >
                                                <MessageSquare className="h-3 w-3 mr-1" />
                                                Book Session
                                            </Button>
                                        ) : (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleFollow(user.id, false)}
                                                className="border-slate-600 hover:bg-slate-700 font-medium hover:border-slate-500 transition-all duration-200"
                                            >
                                                <UserCheck className="h-3 w-3 mr-1" />
                                                Follow
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {/* Bio */}
                    {user.bio && (
                        <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{user.bio}</p>
                    )}

                    {/* Four Pillars (if available) */}
                    {user.pillar_academic !== undefined && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3 text-blue-400" />
                                <span>Academic: {user.pillar_academic}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-green-400" />
                                <span>Community: {user.pillar_community}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-pink-400" />
                                <span>Mentorship: {user.pillar_mentorship}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3 text-purple-400" />
                                <span>Analytical: {user.pillar_analytical}</span>
                            </div>
                        </div>
                    )}

                    {/* Specializations */}
                    {((user.specializations && user.specializations.length > 0) || (isAIBot && user.ai_specialization)) && (
                        <div className="flex flex-wrap gap-1">
                            {isAIBot && user.ai_specialization ? (
                                // AI Bot specializations from their focus area
                                user.ai_specialization.split(', ').slice(0, 3).map((spec: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                                        <Bot className="h-2 w-2 mr-1" />
                                        {spec.trim()}
                                    </Badge>
                                ))
                            ) : (
                                // Regular user specializations
                                user.specializations.slice(0, 3).map((spec: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                        {spec}
                                    </Badge>
                                ))
                            )}
                            {!isAIBot && user.specializations.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400">
                                    +{user.specializations.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        {user.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="font-medium">{user.location}</span>
                            </div>
                        )}
                        {user.is_mentor && user.total_sessions > 0 && (
                            <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400" />
                                <span className="font-medium">{(user.average_rating && typeof user.average_rating === 'number') ? user.average_rating.toFixed(1) : 'N/A'} ({user.total_sessions} sessions)</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="flex-1 border-slate-600 hover:bg-slate-700 font-medium hover:border-slate-500 transition-all duration-200"
                        >
                            <Eye className="h-3 w-3 mr-1" />
                            Profile
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => (user.is_mentor || user.role === 'teacher' || user.is_searchable_teacher) ? handleSessionRequest(user) : navigate(`/messages/compose?to=${user.id}`)}
                            className="flex-1 border-slate-600 hover:bg-slate-700 font-medium hover:border-slate-500 transition-all duration-200"
                        >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {(user.is_mentor || user.role === 'teacher' || user.is_searchable_teacher) ? 'Request Session' : 'Message'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderNetworkStats = () => {
        if (!networkStats) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/30">
                    <CardContent className="p-4 text-center">
                        <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{networkStats.connections_count}</div>
                        <div className="text-xs text-blue-300">Connections</div>
                        {networkStats.weekly_growth && networkStats.weekly_growth > 0 && (
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-green-400" />
                                <span className="text-xs text-green-400">+{networkStats.weekly_growth}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border border-green-500/30">
                    <CardContent className="p-4 text-center">
                        <UserCheck className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{networkStats.followers_count}</div>
                        <div className="text-xs text-green-300">Followers</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-800/20 border border-yellow-500/30">
                    <CardContent className="p-4 text-center">
                        <Eye className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{networkStats.following_count}</div>
                        <div className="text-xs text-yellow-300">Following</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{networkStats.influence_score}</div>
                        <div className="text-xs text-purple-300">Influence</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/20 border border-cyan-500/30">
                    <CardContent className="p-4 text-center">
                        <Network className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{networkStats.network_reach}</div>
                        <div className="text-xs text-cyan-300">Reach</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-900/20 to-red-800/20 border border-pink-500/30">
                    <CardContent className="p-4 text-center">
                        <Shield className="h-6 w-6 text-pink-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{(networkStats.trust_rating && typeof networkStats.trust_rating === 'number') ? (networkStats.trust_rating * 100).toFixed(0) : '0'}%</div>
                        <div className="text-xs text-pink-300">Trust Rating</div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-slate-700 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-slate-800 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full">
                            <Network className="h-8 w-8 text-blue-400" />
                        </div>
                        Trust Graph
                    </h1>
                    <p className="text-slate-400">Build your professional learning network</p>
                </div>
                
                {/* Header Actions */}
                <div className="flex items-center gap-3">
                    {/* Setup Profile Button */}
                    <Button 
                        onClick={() => navigate('/profile/setup')}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium"
                    >
                        <User className="h-4 w-4 mr-2" />
                        Setup Profile
                    </Button>

                    {/* Search */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 w-64"
                        />
                        <Button 
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="border-slate-600 hover:bg-slate-700 relative"
                        >
                            <Bell className="h-4 w-4" />
                            {sessionRequests.filter((req: any) => req.status === 'pending').length > 0 && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                                    {sessionRequests.filter((req: any) => req.status === 'pending').length}
                                </span>
                            )}
                        </Button>
                        
                        {showNotifications && (
                            <Card className="absolute right-0 top-12 w-80 bg-slate-900 border-slate-700 z-50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-white">Notifications</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-64 overflow-y-auto">
                                        {sessionRequests.filter((req: any) => req.status === 'pending').length > 0 ? (
                                            <>
                                                {sessionRequests.filter((req: any) => req.status === 'pending').map((request: any) => (
                                                    <div key={request.id} className="p-3 border-b border-slate-700 bg-blue-900/20">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <p className="text-xs text-slate-300">
                                                                    <strong>{request.student_display_name || request.student_username}</strong> requested a session
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {request.session_type} • {new Date(request.created_at).toLocaleDateString()}
                                                                </p>
                                                                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                                                                    {request.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => respondToSessionRequest(request.id, 'accept')}
                                                                className="bg-green-600 hover:bg-green-500 text-xs py-1 px-2"
                                                            >
                                                                Accept
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => respondToSessionRequest(request.id, 'decline')}
                                                                className="border-slate-600 hover:bg-slate-700 text-xs py-1 px-2"
                                                            >
                                                                Decline
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="p-3 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-xs"
                                                        onClick={() => setShowSessionRequests(true)}
                                                    >
                                                        View All Session Requests
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-6 text-center">
                                                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                                <p className="text-xs text-slate-400">No new notifications</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Settings */}
                    <Button variant="outline" size="icon" className="border-slate-600 hover:bg-slate-700">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Network Stats */}
            {renderNetworkStats()}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
                    <TabsTrigger value="network" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        My Network
                    </TabsTrigger>
                    <TabsTrigger value="connections" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Connections ({connections.filter(c => c.status === 'accepted').length})
                    </TabsTrigger>
                    <TabsTrigger value="followers" className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Followers ({followers.length})
                    </TabsTrigger>
                    <TabsTrigger value="following" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Following ({following.length})
                    </TabsTrigger>
                    <TabsTrigger value="discover" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Discover
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="search" className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Search Results
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="network">
                    <div className="space-y-6">
                        {/* Pending Connection Requests */}
                        {connections.filter(c => c.status === 'pending').length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Pending Requests</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {connections
                                        .filter(c => c.status === 'pending')
                                        .map(connection => (
                                            <Card key={connection.id} className="bg-yellow-900/20 border border-yellow-500/30 text-white">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-slate-700 text-white text-sm">
                                                                    {connection.connected_user.display_name?.charAt(0) || '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{connection.connected_user.display_name}</span>
                                                        </div>
                                                        <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleConnectionRequest(connection.id, 'accept')}
                                                            className="flex-1 bg-green-600 hover:bg-green-500"
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleConnectionRequest(connection.id, 'decline')}
                                                            className="flex-1 border-slate-600 hover:bg-slate-700"
                                                        >
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Network Insights */}
                        {networkInsights.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    Network Insights
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {networkInsights.slice(0, 4).map((insight) => (
                                        <Card key={insight.id} className={cn(
                                            "bg-gradient-to-r border text-white transition-all hover:scale-[1.02]",
                                            insight.priority === 'high' ? 'from-red-900/20 to-pink-900/20 border-red-500/30' :
                                            insight.priority === 'medium' ? 'from-yellow-900/20 to-orange-900/20 border-yellow-500/30' :
                                            'from-blue-900/20 to-cyan-900/20 border-blue-500/30'
                                        )}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-full",
                                                        insight.priority === 'high' ? 'bg-red-500/20' :
                                                        insight.priority === 'medium' ? 'bg-yellow-500/20' :
                                                        'bg-blue-500/20'
                                                    )}>
                                                        <Target className={cn(
                                                            "h-4 w-4",
                                                            insight.priority === 'high' ? 'text-red-400' :
                                                            insight.priority === 'medium' ? 'text-yellow-400' :
                                                            'text-blue-400'
                                                        )} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                                                        <p className="text-sm text-slate-300 mb-3">{insight.description}</p>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="text-xs border-slate-600 hover:bg-slate-700"
                                                        >
                                                            {insight.actionText}
                                                            <ChevronRight className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggested Connections */}
                        {suggestedConnections.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    People You May Know
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {suggestedConnections.slice(0, 6).map((user: any) => renderUserCard(user, true, 'suggested'))}
                                </div>
                            </div>
                        )}

                        {/* Recent Activity Feed */}
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Recent Network Activity
                            </h3>
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardContent className="p-0">
                                    {recentActivity.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Clock className="h-8 w-8 mx-auto mb-2" />
                                            <p>No recent activity in your network</p>
                                            <p className="text-sm mt-1">Connect with more people to see their updates</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-700">
                                            {recentActivity.slice(0, 10).map((activity) => (
                                                <div key={activity.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "p-2 rounded-full",
                                                            activity.type === 'connection' ? 'bg-blue-500/20' :
                                                            activity.type === 'follow' ? 'bg-green-500/20' :
                                                            activity.type === 'session' ? 'bg-purple-500/20' :
                                                            activity.type === 'achievement' ? 'bg-yellow-500/20' :
                                                            'bg-cyan-500/20'
                                                        )}>
                                                            {activity.type === 'connection' && <UserPlus className="h-4 w-4 text-blue-400" />}
                                                            {activity.type === 'follow' && <UserCheck className="h-4 w-4 text-green-400" />}
                                                            {activity.type === 'session' && <MessageCircle className="h-4 w-4 text-purple-400" />}
                                                            {activity.type === 'achievement' && <Award className="h-4 w-4 text-yellow-400" />}
                                                            {activity.type === 'mention' && <MessageSquare className="h-4 w-4 text-cyan-400" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-white">
                                                                <span className="font-medium">{activity.user.display_name}</span>
                                                                <span className="text-slate-300 ml-1">{activity.description}</span>
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge className="text-xs" variant="secondary">
                                                                    {activity.user.user_tier}
                                                                </Badge>
                                                                <span className="text-xs text-slate-400">
                                                                    {new Date(activity.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                                                            <Eye className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {recentActivity.length > 10 && (
                                                <div className="p-4 text-center">
                                                    <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700">
                                                        View All Activity
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="connections">
                    <div className="space-y-6">
                        {/* Connected Mentors & Teachers Section */}
                        {connections.filter(c => c.status === 'accepted' && (c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true)).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Connected Mentors & Teachers ({connections.filter(c => c.status === 'accepted' && (c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true)).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {connections
                                        .filter(c => c.status === 'accepted' && (c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true))
                                        .map(connection => renderUserCard(connection.connected_user, true, 'connected'))}
                                </div>
                            </div>
                        )}
                        
                        {/* Other Connections */}
                        {connections.filter(c => c.status === 'accepted' && !(c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true)).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Other Connections ({connections.filter(c => c.status === 'accepted' && !(c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true)).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {connections
                                        .filter(c => c.status === 'accepted' && !(c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true))
                                        .map(connection => renderUserCard(connection.connected_user, true, 'connected'))}
                                </div>
                            </div>
                        )}
                        
                        {/* No connections message */}
                        {connections.filter(c => c.status === 'accepted').length === 0 && (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardContent className="p-12 text-center">
                                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">No connections yet</h3>
                                    <p className="text-slate-400 mb-4">Start connecting with mentors and peers to build your network</p>
                                    <Button 
                                        onClick={() => setActiveTab('discover')}
                                        className="bg-blue-600 hover:bg-blue-500"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        Discover People
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="followers">
                    <div className="space-y-6">
                        {/* Mentor & Teacher Followers */}
                        {followers.filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Mentor & Teacher Followers ({followers.filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {followers
                                        .filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)
                                        .map(follower => renderUserCard(follower.user, true))}
                                </div>
                            </div>
                        )}
                        
                        {/* Other Followers */}
                        {followers.filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Other Followers ({followers.filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {followers
                                        .filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true))
                                        .map(follower => renderUserCard(follower.user, true))}
                                </div>
                            </div>
                        )}
                        
                        {/* No followers message */}
                        {followers.length === 0 && (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardContent className="p-12 text-center">
                                    <UserCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">No followers yet</h3>
                                    <p className="text-slate-400">Build your network and engage with the community to gain followers</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="following">
                    <div className="space-y-6">
                        {/* Following Mentors & Teachers */}
                        {following.filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Following Mentors & Teachers ({following.filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {following
                                        .filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)
                                        .map(follow => renderUserCard(follow.user, true))}
                                </div>
                            </div>
                        )}
                        
                        {/* Following Others */}
                        {following.filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Following Others ({following.filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true)).length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {following
                                        .filter(f => !(f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true))
                                        .map(follow => renderUserCard(follow.user, true))}
                                </div>
                            </div>
                        )}
                        
                        {/* No following message */}
                        {following.length === 0 && (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardContent className="p-12 text-center">
                                    <Eye className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">Not following anyone yet</h3>
                                    <p className="text-slate-400 mb-4">Follow mentors and peers to stay updated with their activities</p>
                                    <Button 
                                        onClick={() => setActiveTab('discover')}
                                        className="bg-blue-600 hover:bg-blue-500"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        Discover People
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="discover">
                    <div className="space-y-6">
                        {/* Quick Mentor Access */}
                        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-blue-400" />
                                    Quick Mentor Access
                                </CardTitle>
                                <p className="text-slate-300 text-sm">View profiles of mentors you're connected with or following</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button 
                                        onClick={() => setActiveTab('connections')}
                                        className="bg-green-600 hover:bg-green-500 font-medium p-4 h-auto flex flex-col gap-2"
                                    >
                                        <Users className="h-6 w-6" />
                                        <div className="text-center">
                                            <div className="font-semibold">Connected Mentors</div>
                                            <div className="text-xs opacity-75">{connections.filter(c => c.status === 'accepted' && (c.connected_user?.is_mentor === true || c.connected_user?.role === 'teacher' || c.connected_user?.is_searchable_teacher === true)).length} mentors & teachers</div>
                                        </div>
                                    </Button>
                                    <Button 
                                        onClick={() => setActiveTab('following')}
                                        className="bg-blue-600 hover:bg-blue-500 font-medium p-4 h-auto flex flex-col gap-2"
                                    >
                                        <Eye className="h-6 w-6" />
                                        <div className="text-center">
                                            <div className="font-semibold">Following Mentors</div>
                                            <div className="text-xs opacity-75">{following.filter(f => f.user?.is_mentor === true || f.user?.role === 'teacher' || f.user?.is_searchable_teacher === true).length} mentors & teachers</div>
                                        </div>
                                    </Button>
                                    <Button 
                                        onClick={() => navigate('/sessions')}
                                        className="bg-purple-600 hover:bg-purple-500 font-medium p-4 h-auto flex flex-col gap-2"
                                    >
                                        <MessageSquare className="h-6 w-6" />
                                        <div className="text-center">
                                            <div className="font-semibold">Book Session</div>
                                            <div className="text-xs opacity-75">Find & book mentors</div>
                                        </div>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Discovery Filters */}
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Discovery Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Tier</label>
                                        <select 
                                            value={discoverFilters.tier}
                                            onChange={(e) => setDiscoverFilters(prev => ({...prev, tier: e.target.value}))}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                        >
                                            <option value="">All Tiers</option>
                                            <option value="navigator">Navigator</option>
                                            <option value="explorer">Explorer</option>
                                            <option value="pathfinder">Pathfinder</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Service Type</label>
                                        <select 
                                            value={discoverFilters.role}
                                            onChange={(e) => setDiscoverFilters(prev => ({...prev, role: e.target.value}))}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                        >
                                            <option value="">All Services</option>
                                            <option value="mentor">Mentors</option>
                                            <option value="counselor">Counselors</option>
                                            <option value="essay_editor">Essay Editors</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                                        <Input 
                                            placeholder="City, Country" 
                                            value={discoverFilters.location}
                                            onChange={(e) => setDiscoverFilters(prev => ({...prev, location: e.target.value}))}
                                            className="bg-slate-800 border-slate-600 text-white" 
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Button 
                                            onClick={handleDiscoverFilter}
                                            disabled={isDiscovering}
                                            className="flex-1 bg-blue-600 hover:bg-blue-500"
                                        >
                                            {isDiscovering ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Searching...
                                                </div>
                                            ) : (
                                                <>
                                                    <Search className="h-4 w-4 mr-2" />
                                                    Discover
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            onClick={handleEndActiveSessions}
                                            disabled={isCleaningUpSessions}
                                            variant="outline"
                                            className="bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-300"
                                        >
                                            {isCleaningUpSessions ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                                    Cleaning...
                                                </div>
                                            ) : (
                                                <>
                                                    <UserMinus className="h-4 w-4 mr-2" />
                                                    End Active Sessions
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Discovered Profiles */}
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Discover New Mentors & Educators
                                <Badge variant="secondary" className="ml-2">
                                    {discoverProfiles.length} found
                                </Badge>
                            </h3>
                            
                            {isDiscovering ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <Card key={i} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                            <CardContent className="p-6">
                                                <div className="animate-pulse space-y-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="rounded-full bg-slate-700 h-12 w-12"></div>
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-slate-700 rounded w-24"></div>
                                                            <div className="h-3 bg-slate-700 rounded w-16"></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-3 bg-slate-700 rounded"></div>
                                                        <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : discoverProfiles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {discoverProfiles.map(profile => renderUserCard(profile, true, 'discover'))}
                                </div>
                            ) : (
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardContent className="p-12 text-center">
                                        <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300 mb-2">No profiles found</h3>
                                        <p className="text-slate-400 mb-4">
                                            Try adjusting your filters or check back later for new mentors and educators.
                                        </p>
                                        <Button 
                                            onClick={() => fetchDiscoverProfiles()}
                                            className="bg-cyan-500 hover:bg-cyan-600"
                                        >
                                            <Users className="h-4 w-4 mr-2" />
                                            Show All Available
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Featured Communities */}
                        {discoverProfiles.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    Popular Specializations
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['Web Development', 'Data Science', 'College Prep'].map((community) => (
                                        <Card key={community} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full">
                                                        <GraduationCap className="h-6 w-6 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-white">{community}</h4>
                                                        <p className="text-sm text-slate-400">
                                                            {discoverProfiles.filter((p: any) => 
                                                                p.specializations?.some((s: any) => 
                                                                    s.name.toLowerCase().includes(community.split(' ')[0].toLowerCase())
                                                                )
                                                            ).length || Math.floor(Math.random() * 20) + 5} mentors available
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-300 mb-4">
                                                    Connect with {community.toLowerCase()} experts and accelerate your learning.
                                                </p>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setDiscoverFilters(prev => ({...prev, role: 'mentor'}));
                                                        fetchDiscoverProfiles({role: 'mentor'});
                                                    }}
                                                    className="bg-green-600 hover:bg-green-500 w-full"
                                                >
                                                    <Search className="h-3 w-3 mr-1" />
                                                    Explore {community}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="analytics">
                    <div className="space-y-6">
                        {/* Network Growth */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-green-400" />
                                        Network Growth
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">This Week</span>
                                            <span className="text-green-400 font-semibold">+{networkStats?.weekly_growth || 5} connections</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">This Month</span>
                                            <span className="text-blue-400 font-semibold">+{(networkStats?.weekly_growth || 5) * 4} connections</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Growth Rate</span>
                                            <span className="text-purple-400 font-semibold">+15%</span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full mt-4">
                                            <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full" style={{width: '75%'}}></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-cyan-400" />
                                        Engagement Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Profile Views</span>
                                            <span className="text-cyan-400 font-semibold">247 this week</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Messages Sent</span>
                                            <span className="text-yellow-400 font-semibold">12 this week</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Sessions Hosted</span>
                                            <span className="text-green-400 font-semibold">3 this week</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Network Map */}
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Network className="h-5 w-5 text-purple-400" />
                                    Network Visualization
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 bg-slate-800 rounded-lg flex items-center justify-center">
                                    <div className="text-center text-slate-400">
                                        <Network className="h-16 w-16 mx-auto mb-4" />
                                        <p className="text-lg font-medium mb-2">Network Map</p>
                                        <p className="text-sm">Interactive visualization of your professional network</p>
                                        <Button className="mt-4 bg-purple-600 hover:bg-purple-500">
                                            View Interactive Map
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Connection Quality */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-yellow-400" />
                                        Navigator Connections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {Math.floor((networkStats?.connections_count || 10) * 0.2)}
                                        </div>
                                        <p className="text-xs text-slate-400">Top-tier mentors</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <Bookmark className="h-4 w-4 text-green-400" />
                                        Explorer Connections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-400">
                                            {Math.floor((networkStats?.connections_count || 10) * 0.5)}
                                        </div>
                                        <p className="text-xs text-slate-400">Experienced learners</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-amber-400" />
                                        Pathfinder Connections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-amber-400">
                                            {Math.floor((networkStats?.connections_count || 10) * 0.3)}
                                        </div>
                                        <p className="text-xs text-slate-400">New learners</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="search">
                    {searchResults.length === 0 ? (
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardContent className="p-12 text-center">
                                <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-300 mb-2">No search results</h3>
                                <p className="text-slate-400">Try searching for mentors, students, or skills</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchResults.map(user => renderUserCard(user))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Session Request Modal */}
            <Dialog open={showSessionRequestModal} onOpenChange={setShowSessionRequestModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-400" />
                            Request Session with {selectedMentor?.display_name || selectedMentor?.username}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        {/* Mentor Info */}
                        {selectedMentor && (
                            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <Avatar className="h-12 w-12 border border-slate-600">
                                    <AvatarImage src={`/api/avatars/${selectedMentor.id}`} />
                                    <AvatarFallback className="bg-slate-700 text-white">
                                        {(selectedMentor.display_name || selectedMentor.username)?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-white">{selectedMentor.display_name || selectedMentor.username}</h3>
                                    <p className="text-sm text-slate-400">
                                        {selectedMentor.is_mentor ? 'Mentor' : (selectedMentor.role === 'teacher' || selectedMentor.is_searchable_teacher) ? 'Teacher' : 'Peer'} • {selectedMentor.user_tier}
                                    </p>
                                    {selectedMentor.bio && (
                                        <p className="text-sm text-slate-300 mt-1 line-clamp-2">{selectedMentor.bio}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Session Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
                            <select 
                                value={sessionType}
                                onChange={(e) => setSessionType(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="mentoring">Mentoring Session</option>
                                <option value="tutoring">Tutoring Session</option>
                                <option value="essay_editing">Essay Editing</option>
                                <option value="collaboration">Collaboration</option>
                                <option value="counseling">Academic Counseling</option>
                            </select>
                        </div>

                        {/* Session Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Why do you want this session? <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={sessionDescription}
                                onChange={(e) => setSessionDescription(e.target.value)}
                                placeholder="Describe what you'd like help with, your goals for the session, and any specific topics you want to cover..."
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={5}
                                maxLength={500}
                            />
                            <div className="text-right text-xs text-slate-400 mt-1">
                                {sessionDescription.length}/500 characters
                            </div>
                        </div>

                        {/* Tools Info */}
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Session Tools
                            </h4>
                            <p className="text-sm text-slate-300">
                                {(selectedMentor?.is_mentor || selectedMentor?.role === 'teacher' || selectedMentor?.is_searchable_teacher)
                                    ? "Once approved, you'll use AscendiaLaunchpad for collaborative editing and real-time tutoring/mentoring."
                                    : "Once approved, you'll use the Essay Editor for collaborative editing and peer review."
                                }
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button 
                                onClick={() => setShowSessionRequestModal(false)}
                                variant="outline"
                                className="flex-1 border-slate-600 hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={submitSessionRequest}
                                disabled={!sessionDescription.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Request
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Urgent Session Request Modal */}
            <Dialog open={showUrgentRequestModal} onOpenChange={setShowUrgentRequestModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedAIBot ? `Request Urgent Help from ${selectedAIBot.display_name}` : 'Request Urgent Help'}
                        </DialogTitle>
                    </DialogHeader>
                    <UrgentSessionRequest
                        initialTopic={selectedAIBot?.ai_specialization || ''}
                        onSessionCreated={(sessionData) => {
                            toast.success('Urgent session created successfully!');
                            setShowUrgentRequestModal(false);
                            setSelectedAIBot(null);
                            // Optionally navigate to the session
                            if (sessionData.chatSessionId) {
                                navigate(`/ai-chat?session=${sessionData.chatSessionId}&bot=${selectedAIBot?.ai_bot_id}`);
                            }
                        }}
                        onClose={() => {
                            setShowUrgentRequestModal(false);
                            setSelectedAIBot(null);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TrustGraphPage;