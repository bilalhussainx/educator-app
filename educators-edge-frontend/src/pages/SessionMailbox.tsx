import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
    Search,
    Plus,
    Inbox,
    Send,
    FileText,
    Archive,
    Trash2,
    Clock,
    Calendar,
    Video,
    MessageCircle,
    Star,
    MoreVertical,
    Filter,
    Tag,
    Reply,
    ReplyAll,
    Forward,
    Paperclip,
    Minimize2,
    Maximize2,
    X,
    CheckCircle,
    AlertCircle,
    Users,
    User,
    Phone,
    Mail,
    Globe,
    Settings,
    Bell,
    BellOff,
    FolderOpen,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    Zap,
    Bot,
    RefreshCw,
    Link,
    Copy
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { format, parseISO, isToday, isYesterday, isPast, isFuture, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Types
interface SessionThread {
    id: string;
    participants: User[];
    subject: string;
    lastMessage: SessionMessage;
    messageCount: number;
    isRead: boolean;
    isStarred: boolean;
    labels: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'active' | 'archived' | 'deleted';
    sessionType: string;
    scheduledTime?: string;
    sessionStatus: 'requested' | 'accepted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

interface SessionMessage {
    id: string;
    threadId: string;
    fromUser: User;
    toUsers: User[];
    subject: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    attachments?: Attachment[];
    sessionData?: SessionData;
    messageType: 'request' | 'response' | 'update' | 'reminder' | 'system';
}

interface User {
    id: string;
    username: string;
    displayName?: string;
    email?: string;
    uniqueSessionId?: string;
    avatar?: string;
    role: 'student' | 'teacher' | 'mentor';
    isOnline: boolean;
}

interface SessionData {
    id: string;
    type: string;
    description: string;
    scheduledTime?: string;
    duration?: number;
    location?: string;
    joinUrl?: string;
    status: string;
}

interface Attachment {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
}

const SessionMailbox: React.FC = () => {
    // State management
    const [currentView, setCurrentView] = useState<'inbox' | 'sent' | 'drafts' | 'scheduled' | 'archived'>('inbox');
    const [threads, setThreads] = useState<SessionThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<SessionThread | null>(null);
    const [messages, setMessages] = useState<SessionMessage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeMinimized, setComposeMinimized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    // Compose state
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeContent, setComposeContent] = useState('');
    const [composeSessionType, setComposeSessionType] = useState('tutoring');
    const [composeScheduledTime, setComposeScheduledTime] = useState('');
    const [composeDuration, setComposeDuration] = useState('60');

    const navigate = useNavigate();
    const composeRef = useRef<HTMLDivElement>(null);

    // Simulated data for demonstration
    useEffect(() => {
        fetchInitialData();
        if (autoRefresh) {
            const interval = setInterval(fetchThreads, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchUserProfile(),
                fetchThreads()
            ]);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            toast.error('Failed to load mailbox data');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const response = await apiClient.get('/api/profiles');
            setUser({
                id: response.data.id,
                username: response.data.username,
                displayName: response.data.display_name,
                email: response.data.email,
                uniqueSessionId: response.data.unique_session_id,
                role: response.data.role || 'student',
                isOnline: true
            });
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    const fetchThreads = async () => {
        try {
            // This would integrate with the enhanced session requests API
            const response = await apiClient.get('/api/sessions/threads');
            
            // For now, simulate data since the API doesn't exist yet
            const simulatedThreads: SessionThread[] = [
                {
                    id: '1',
                    participants: [
                        {
                            id: '2',
                            username: 'bilalhussain.v1@gmail.com',
                            displayName: 'Bilal Hussain',
                            role: 'teacher',
                            isOnline: true,
                            uniqueSessionId: 'bil0001'
                        }
                    ],
                    subject: 'Session Request: JavaScript Fundamentals',
                    lastMessage: {
                        id: '1',
                        threadId: '1',
                        fromUser: {
                            id: '2',
                            username: 'bilalhussain.v1@gmail.com',
                            displayName: 'Bilal Hussain',
                            role: 'teacher',
                            isOnline: true
                        },
                        toUsers: [],
                        subject: 'Session Request: JavaScript Fundamentals',
                        content: 'I can help you with JavaScript fundamentals. When would you like to schedule?',
                        isRead: false,
                        createdAt: new Date().toISOString(),
                        messageType: 'response'
                    },
                    messageCount: 3,
                    isRead: false,
                    isStarred: true,
                    labels: ['urgent', 'javascript'],
                    priority: 'high',
                    status: 'active',
                    sessionType: 'tutoring',
                    scheduledTime: '2025-01-15T15:00:00Z',
                    sessionStatus: 'accepted',
                    createdAt: '2025-01-14T10:00:00Z',
                    updatedAt: new Date().toISOString()
                }
            ];
            
            setThreads(simulatedThreads);
        } catch (error) {
            console.error('Failed to fetch threads:', error);
        }
    };

    const sendSessionRequest = async () => {
        if (!composeTo.trim() || !composeSubject.trim() || !composeContent.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            // This integrates with the existing session request API
            const response = await apiClient.post('/api/sessions/request', {
                mentorId: composeTo, // This would be resolved from unique ID
                sessionType: composeSessionType,
                description: composeContent,
                preferredTool: 'ascendialaunchpad',
                subject: composeSubject,
                scheduledTime: composeScheduledTime || null,
                duration: parseInt(composeDuration)
            });

            if (response.data.success) {
                toast.success('Session request sent successfully!');
                setComposeOpen(false);
                resetCompose();
                fetchThreads(); // Refresh threads
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send session request');
        }
    };

    const resetCompose = () => {
        setComposeTo('');
        setComposeSubject('');
        setComposeContent('');
        setComposeSessionType('tutoring');
        setComposeScheduledTime('');
        setComposeDuration('60');
    };

    const getThreadIcon = (thread: SessionThread) => {
        switch (thread.sessionStatus) {
            case 'requested':
                return <Clock className="h-4 w-4 text-orange-400" />;
            case 'accepted':
                return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'confirmed':
                return <Calendar className="h-4 w-4 text-blue-400" />;
            case 'in_progress':
                return <Video className="h-4 w-4 text-green-500" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-gray-400" />;
            case 'cancelled':
                return <X className="h-4 w-4 text-red-400" />;
            default:
                return <MessageCircle className="h-4 w-4 text-slate-400" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'border-l-red-500';
            case 'high':
                return 'border-l-orange-500';
            case 'normal':
                return 'border-l-blue-500';
            case 'low':
                return 'border-l-gray-500';
            default:
                return 'border-l-slate-500';
        }
    };

    const formatTime = (dateString: string) => {
        const date = parseISO(dateString);
        if (isToday(date)) {
            return format(date, 'h:mm a');
        } else if (isYesterday(date)) {
            return 'Yesterday';
        } else {
            return format(date, 'MMM d');
        }
    };

    const renderSidebar = () => (
        <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                        <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">Session Mailbox</h2>
                        <p className="text-xs text-slate-400">Advanced Session Management</p>
                    </div>
                </div>
            </div>

            {/* Compose Button */}
            <div className="p-4">
                <Button 
                    onClick={() => setComposeOpen(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Session Request
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2">
                <div className="space-y-1">
                    {[
                        { key: 'inbox', icon: Inbox, label: 'Inbox', count: threads.filter(t => !t.isRead).length },
                        { key: 'sent', icon: Send, label: 'Sent', count: 0 },
                        { key: 'drafts', icon: FileText, label: 'Drafts', count: 0 },
                        { key: 'scheduled', icon: Calendar, label: 'Scheduled', count: threads.filter(t => t.sessionStatus === 'confirmed').length },
                        { key: 'archived', icon: Archive, label: 'Archived', count: 0 }
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setCurrentView(item.key as any)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                currentView === item.key
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </div>
                            {item.count > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs">
                                    {item.count}
                                </Badge>
                            )}
                        </button>
                    ))}
                </div>

                <Separator className="my-4 bg-slate-700" />

                {/* Labels */}
                <div className="space-y-1">
                    <h3 className="px-3 text-xs font-medium text-slate-500 uppercase">Labels</h3>
                    {['urgent', 'javascript', 'python', 'math', 'physics'].map((label) => (
                        <button
                            key={label}
                            className="w-full flex items-center gap-2 px-3 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <Tag className="h-3 w-3" />
                            <span className="capitalize">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-slate-400">Online</span>
                    </div>
                    <Button size="sm" variant="ghost" className="p-1">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderThreadList = () => (
        <div className="w-96 bg-slate-800 border-r border-slate-700 flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-700">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-600 text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                        <Filter className="h-3 w-3 mr-1" />
                        Filter
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {threads.map((thread) => (
                    <div
                        key={thread.id}
                        onClick={() => setSelectedThread(thread)}
                        className={cn(
                            "p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors border-l-4",
                            selectedThread?.id === thread.id ? "bg-slate-700" : "",
                            getPriorityColor(thread.priority)
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-slate-600 text-white text-xs">
                                    {thread.participants[0]?.displayName?.charAt(0) || thread.participants[0]?.username?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {getThreadIcon(thread)}
                                    <p className={cn(
                                        "font-medium text-sm truncate",
                                        thread.isRead ? "text-slate-300" : "text-white"
                                    )}>
                                        {thread.participants[0]?.displayName || thread.participants[0]?.username}
                                    </p>
                                    {thread.isStarred && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                                    <span className="text-xs text-slate-400 ml-auto">
                                        {formatTime(thread.updatedAt)}
                                    </span>
                                </div>
                                <p className={cn(
                                    "text-sm truncate mb-1",
                                    thread.isRead ? "text-slate-400" : "text-slate-200"
                                )}>
                                    {thread.subject}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {thread.lastMessage.content}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="text-xs bg-slate-600 text-slate-200">
                                        {thread.sessionType}
                                    </Badge>
                                    {thread.scheduledTime && (
                                        <Badge className="text-xs bg-blue-600 text-white">
                                            {format(parseISO(thread.scheduledTime), 'MMM d, h:mm a')}
                                        </Badge>
                                    )}
                                    {thread.labels.slice(0, 2).map((label) => (
                                        <Badge key={label} className="text-xs bg-purple-600 text-white">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {threads.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No sessions in {currentView}</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderMessageView = () => (
        <div className="flex-1 flex flex-col bg-slate-900">
            {selectedThread ? (
                <>
                    {/* Message Header */}
                    <div className="p-4 border-b border-slate-700 bg-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                {getThreadIcon(selectedThread)}
                                <h2 className="font-semibold text-white">{selectedThread.subject}</h2>
                                <Badge className="bg-blue-600 text-white">
                                    {selectedThread.sessionType}
                                </Badge>
                                <Badge className={cn(
                                    selectedThread.sessionStatus === 'in_progress' && "bg-green-500",
                                    selectedThread.sessionStatus === 'accepted' && "bg-blue-500",
                                    selectedThread.sessionStatus === 'completed' && "bg-gray-500",
                                    selectedThread.sessionStatus === 'cancelled' && "bg-red-500",
                                    "text-white"
                                )}>
                                    {selectedThread.sessionStatus}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedThread.sessionStatus === 'in_progress' && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-500">
                                        <Video className="h-3 w-3 mr-1" />
                                        Join Session
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                                    <Reply className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>With {selectedThread.participants[0]?.displayName}</span>
                            <span>•</span>
                            <span>{selectedThread.messageCount} messages</span>
                            {selectedThread.scheduledTime && (
                                <>
                                    <span>•</span>
                                    <span>Scheduled: {format(parseISO(selectedThread.scheduledTime), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {/* Mock message */}
                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="bg-slate-600 text-white text-xs">
                                            {selectedThread.participants[0]?.displayName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-white text-sm">
                                        {selectedThread.participants[0]?.displayName}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {formatTime(selectedThread.lastMessage.createdAt)}
                                    </span>
                                </div>
                                <p className="text-slate-300 text-sm">
                                    {selectedThread.lastMessage.content}
                                </p>
                                {selectedThread.sessionStatus === 'accepted' && (
                                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                                        <div className="flex items-center gap-2 text-sm text-green-300">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Session request accepted!</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Reply */}
                    <div className="p-4 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Type a quick reply..."
                                className="flex-1 bg-slate-800 border-slate-600 text-white"
                            />
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                                <Send className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a session thread to view messages</p>
                    </div>
                </div>
            )}
        </div>
    );

    const renderComposeModal = () => (
        composeOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div
                    ref={composeRef}
                    className={cn(
                        "bg-slate-900 border border-slate-700 rounded-lg shadow-2xl transition-all",
                        composeMinimized ? "w-80 h-12" : "w-full max-w-2xl h-[600px]"
                    )}
                >
                    {/* Compose Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                        <h3 className="font-semibold text-white">New Session Request</h3>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setComposeMinimized(!composeMinimized)}
                            >
                                {composeMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setComposeOpen(false);
                                    setComposeMinimized(false);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Compose Body */}
                    {!composeMinimized && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="compose-to">To (Teacher ID or Email)</Label>
                                        <Input
                                            id="compose-to"
                                            value={composeTo}
                                            onChange={(e) => setComposeTo(e.target.value)}
                                            placeholder="bil0001 or teacher@example.com"
                                            className="bg-slate-800 border-slate-600 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="compose-session-type">Session Type</Label>
                                        <Select value={composeSessionType} onValueChange={setComposeSessionType}>
                                            <SelectTrigger className="bg-slate-800 border-slate-600">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tutoring">Tutoring</SelectItem>
                                                <SelectItem value="mentoring">Mentoring</SelectItem>
                                                <SelectItem value="essay_editing">Essay Review</SelectItem>
                                                <SelectItem value="counseling">Academic Counseling</SelectItem>
                                                <SelectItem value="collaboration">Collaboration</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="compose-subject">Subject</Label>
                                    <Input
                                        id="compose-subject"
                                        value={composeSubject}
                                        onChange={(e) => setComposeSubject(e.target.value)}
                                        placeholder="What do you need help with?"
                                        className="bg-slate-800 border-slate-600 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="compose-scheduled">Preferred Date/Time (optional)</Label>
                                        <Input
                                            id="compose-scheduled"
                                            type="datetime-local"
                                            value={composeScheduledTime}
                                            onChange={(e) => setComposeScheduledTime(e.target.value)}
                                            className="bg-slate-800 border-slate-600 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="compose-duration">Duration (minutes)</Label>
                                        <Input
                                            id="compose-duration"
                                            type="number"
                                            value={composeDuration}
                                            onChange={(e) => setComposeDuration(e.target.value)}
                                            placeholder="60"
                                            className="bg-slate-800 border-slate-600 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="compose-content">Description</Label>
                                    <Textarea
                                        id="compose-content"
                                        value={composeContent}
                                        onChange={(e) => setComposeContent(e.target.value)}
                                        placeholder="Describe what you'd like to learn or work on..."
                                        className="bg-slate-800 border-slate-600 text-white h-32 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Compose Footer */}
                            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                                        <Paperclip className="h-3 w-3 mr-1" />
                                        Attach
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Schedule
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setComposeOpen(false)}
                                        className="border-slate-600 text-slate-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={sendSessionRequest} className="bg-blue-600 hover:bg-blue-500">
                                        <Send className="h-3 w-3 mr-1" />
                                        Send Request
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-white">Loading Session Mailbox...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex">
            {renderSidebar()}
            {renderThreadList()}
            {renderMessageView()}
            {renderComposeModal()}
        </div>
    );
};

export default SessionMailbox;