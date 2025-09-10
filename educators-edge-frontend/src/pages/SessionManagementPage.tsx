// src/pages/SessionManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Calendar,
    Clock,
    User,
    Star,
    Video,
    CheckCircle,
    XCircle,
    AlertCircle,
    Zap,
    DollarSign,
    Filter,
    Download,
    Plus,
    Eye
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Types
interface Session {
    id: string;
    student_id: string;
    mentor_id: string;
    session_type: 'individual' | 'group';
    service_type: 'mentoring' | 'counseling' | 'essay_editing';
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    payment_method: 'sparks' | 'usd' | 'free';
    payment_amount: number;
    payment_status: 'pending' | 'completed' | 'failed';
    scheduled_at: string;
    duration_minutes: number;
    description: string;
    mentor_notes?: string;
    student_notes?: string;
    rating?: number;
    review_text?: string;
    created_at: string;
    updated_at: string;
    // Populated fields
    student_name: string;
    mentor_name: string;
    mentor_tier: 'pathfinder' | 'explorer' | 'navigator';
}

interface SessionFilters {
    status: string;
    service_type: string;
    payment_method: string;
    date_range: string;
}

// Status styling configuration
const STATUS_STYLES = {
    pending: { 
        color: 'text-yellow-400', 
        bgColor: 'bg-yellow-500/10', 
        borderColor: 'border-yellow-500/20',
        icon: AlertCircle
    },
    confirmed: { 
        color: 'text-blue-400', 
        bgColor: 'bg-blue-500/10', 
        borderColor: 'border-blue-500/20',
        icon: CheckCircle
    },
    in_progress: { 
        color: 'text-green-400', 
        bgColor: 'bg-green-500/10', 
        borderColor: 'border-green-500/20',
        icon: Video
    },
    completed: { 
        color: 'text-emerald-400', 
        bgColor: 'bg-emerald-500/10', 
        borderColor: 'border-emerald-500/20',
        icon: CheckCircle
    },
    cancelled: { 
        color: 'text-red-400', 
        bgColor: 'bg-red-500/10', 
        borderColor: 'border-red-500/20',
        icon: XCircle
    }
};

const TIER_STYLES = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' }
};

const SessionManagementPage: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [filters, setFilters] = useState<SessionFilters>({
        status: 'all',
        service_type: 'all',
        payment_method: 'all',
        date_range: 'all'
    });
    const [reviewText, setReviewText] = useState('');
    const [rating, setRating] = useState(5);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [sessions, filters, activeTab]);

    const fetchSessions = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/api/ascendia/sessions/my-sessions');
            
            if (response.data.success) {
                setSessions(response.data.sessions);
            } else {
                throw new Error(response.data.message || 'Failed to fetch sessions');
            }
        } catch (error: any) {
            console.error('Session fetch error:', error);
            toast.error(error.message || 'Failed to load sessions');
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = sessions;

        // Tab-based filtering
        if (activeTab !== 'all') {
            filtered = filtered.filter(session => session.status === activeTab);
        }

        // Additional filters
        if (filters.status !== 'all') {
            filtered = filtered.filter(session => session.status === filters.status);
        }
        if (filters.service_type !== 'all') {
            filtered = filtered.filter(session => session.service_type === filters.service_type);
        }
        if (filters.payment_method !== 'all') {
            filtered = filtered.filter(session => session.payment_method === filters.payment_method);
        }
        
        // Date range filtering
        if (filters.date_range !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            
            switch (filters.date_range) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(session => 
                        new Date(session.scheduled_at) >= filterDate
                    );
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    filtered = filtered.filter(session => 
                        new Date(session.scheduled_at) >= filterDate
                    );
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    filtered = filtered.filter(session => 
                        new Date(session.scheduled_at) >= filterDate
                    );
                    break;
            }
        }

        setFilteredSessions(filtered);
    };

    const handleSessionAction = async (sessionId: string, action: 'confirm' | 'cancel' | 'complete', data?: any) => {
        try {
            let response;
            
            switch (action) {
                case 'confirm':
                    response = await apiClient.post(`/api/ascendia/sessions/${sessionId}/confirm`);
                    break;
                case 'cancel':
                    response = await apiClient.post(`/api/ascendia/sessions/${sessionId}/cancel`, {
                        reason: data?.reason || 'No reason provided'
                    });
                    break;
                case 'complete':
                    response = await apiClient.post(`/api/ascendia/sessions/${sessionId}/complete`, {
                        mentor_notes: data?.notes,
                        rating: data?.rating,
                        review_text: data?.review_text
                    });
                    break;
            }

            if (response?.data.success) {
                toast.success(`Session ${action}ed successfully`);
                fetchSessions(); // Refresh the list
            } else {
                throw new Error(response?.data.message || `Failed to ${action} session`);
            }
        } catch (error: any) {
            console.error(`Session ${action} error:`, error);
            toast.error(error.message || `Failed to ${action} session`);
        }
    };

    const renderSessionCard = (session: Session) => {
        const statusStyle = STATUS_STYLES[session.status];
        const StatusIcon = statusStyle.icon;
        const tierStyle = TIER_STYLES[session.mentor_tier];

        return (
            <Card key={session.id} className={cn(
                "bg-slate-900/40 backdrop-blur-lg border text-white transition-all duration-200 hover:scale-[1.02]",
                statusStyle.borderColor
            )}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", statusStyle.bgColor)}>
                                <StatusIcon className={cn("h-5 w-5", statusStyle.color)} />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-white">
                                    {session.service_type.replace('_', ' ').toUpperCase()} Session
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    with {session.mentor_name}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge className={cn("mb-1", statusStyle.bgColor, statusStyle.color)}>
                                {session.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div className={cn("text-xs px-2 py-1 rounded", tierStyle.bgColor, tierStyle.color)}>
                                {session.mentor_tier.charAt(0).toUpperCase() + session.mentor_tier.slice(1)} Tier
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Session Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="h-4 w-4 text-blue-400" />
                            {new Date(session.scheduled_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <Clock className="h-4 w-4 text-green-400" />
                            {session.duration_minutes} minutes
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            {session.payment_method === 'sparks' ? 
                                <Zap className="h-4 w-4 text-yellow-400" /> :
                                <DollarSign className="h-4 w-4 text-green-400" />
                            }
                            {session.payment_amount} {session.payment_method === 'sparks' ? 'Sparks' : 'USD'}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <User className="h-4 w-4 text-purple-400" />
                            {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                        </div>
                    </div>

                    {/* Description */}
                    {session.description && (
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-sm text-slate-300">{session.description}</p>
                        </div>
                    )}

                    {/* Rating for completed sessions */}
                    {session.status === 'completed' && session.rating && (
                        <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span className="text-slate-300">{session.rating}/5 stars</span>
                            {session.review_text && (
                                <span className="text-slate-400 text-xs">• "{session.review_text}"</span>
                            )}
                        </div>
                    )}

                    <Separator className="bg-slate-700" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {session.status === 'pending' && (
                            <>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleSessionAction(session.id, 'confirm')}
                                    className="bg-green-600 hover:bg-green-500"
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirm
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleSessionAction(session.id, 'cancel', { reason: 'Cancelled by user' })}
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </>
                        )}

                        {session.status === 'confirmed' && (
                            <Button 
                                size="sm" 
                                onClick={() => handleSessionAction(session.id, 'complete')}
                                className="bg-blue-600 hover:bg-blue-500"
                            >
                                <Video className="h-4 w-4 mr-1" />
                                Start Session
                            </Button>
                        )}

                        {session.status === 'completed' && !session.rating && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="border-slate-600 hover:bg-slate-700">
                                        <Star className="h-4 w-4 mr-1" />
                                        Rate Session
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                                    <DialogHeader>
                                        <DialogTitle>Rate Your Session</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Rating</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Button
                                                        key={star}
                                                        variant={rating >= star ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setRating(star)}
                                                    >
                                                        <Star className="h-4 w-4" />
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Review (Optional)</label>
                                            <Textarea
                                                value={reviewText}
                                                onChange={(e) => setReviewText(e.target.value)}
                                                placeholder="How was your session?"
                                                className="bg-slate-800 border-slate-600"
                                            />
                                        </div>
                                        <Button 
                                            onClick={() => {
                                                handleSessionAction(session.id, 'complete', {
                                                    rating,
                                                    review_text: reviewText
                                                });
                                                setReviewText('');
                                                setRating(5);
                                            }}
                                            className="w-full"
                                        >
                                            Submit Rating
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-slate-600 hover:bg-slate-700"
                            onClick={() => setSelectedSession(session)}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderFilters = () => (
        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                    <Filter className="h-5 w-5" />
                    Filters
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={filters.service_type} onValueChange={(value) => setFilters(prev => ({...prev, service_type: value}))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Service Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            <SelectItem value="mentoring">Mentoring</SelectItem>
                            <SelectItem value="counseling">Counseling</SelectItem>
                            <SelectItem value="essay_editing">Essay Editing</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.payment_method} onValueChange={(value) => setFilters(prev => ({...prev, payment_method: value}))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="sparks">Sparks</SelectItem>
                            <SelectItem value="usd">USD</SelectItem>
                            <SelectItem value="free">Free</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.date_range} onValueChange={(value) => setFilters(prev => ({...prev, date_range: value}))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button 
                        onClick={() => setFilters({
                            status: 'all',
                            service_type: 'all',
                            payment_method: 'all',
                            date_range: 'all'
                        })}
                        variant="outline"
                        className="border-slate-600 hover:bg-slate-700"
                    >
                        Clear Filters
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-slate-700 rounded w-1/4"></div>
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
                    <h1 className="text-3xl font-bold text-white">Session Management</h1>
                    <p className="text-slate-400">Manage your mentoring and learning sessions</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => navigate('/talent-crucible')}
                        className="bg-purple-600 hover:bg-purple-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Find Mentor
                    </Button>
                    <Button 
                        variant="outline" 
                        className="border-slate-600 hover:bg-slate-700"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {renderFilters()}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-800 border-slate-700">
                    <TabsTrigger value="all">All Sessions ({sessions.length})</TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending ({sessions.filter(s => s.status === 'pending').length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed">
                        Confirmed ({sessions.filter(s => s.status === 'confirmed').length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({sessions.filter(s => s.status === 'completed').length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-6">
                    {filteredSessions.length === 0 ? (
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardContent className="p-12 text-center">
                                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-300 mb-2">No sessions found</h3>
                                <p className="text-slate-400 mb-4">
                                    {activeTab === 'all' ? 
                                        'You haven\'t booked any sessions yet.' :
                                        `No ${activeTab} sessions found.`
                                    }
                                </p>
                                <Button 
                                    onClick={() => navigate('/talent-crucible')}
                                    className="bg-purple-600 hover:bg-purple-500"
                                >
                                    Find a Mentor
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSessions.map(renderSessionCard)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SessionManagementPage;