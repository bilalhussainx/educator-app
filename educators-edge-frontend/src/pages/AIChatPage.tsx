import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import apiClient from '../services/apiClient';
import {
    Bot, Send, ArrowLeft, Zap, Clock, MessageSquare, 
    CheckCircle, User, AlertCircle, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
    id: string;
    sender: 'student' | 'ai_bot';
    content: string;
    type: 'text' | 'code' | 'explanation' | 'suggestion' | 'encouragement' | 'system';
    timestamp: Date;
    confidence?: number;
    suggestions?: string[];
}

interface AIBot {
    id: string;
    name: string;
    specialization: string;
    personality: string;
}

interface LiveSession {
    id: string;
    topic: string;
    sessionType: 'mentoring' | 'essay_editing' | 'counseling';
    status: 'preparing' | 'active' | 'completed' | 'failed';
    ideUrl?: string;
    scribeUrl?: string;
    estimatedDuration?: number;
    liveSessionId?: string;
    liveSessionUrl?: string;
}

const AIChatPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');
    const botId = searchParams.get('bot');
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currentBot, setCurrentBot] = useState<AIBot | null>(null);
    const [sessionActive, setSessionActive] = useState(false);
    const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
    const [showIDE, setShowIDE] = useState(false);
    const [showScribe, setShowScribe] = useState(false);
    const [ideUrl, setIdeUrl] = useState<string>('');
    const [scribeUrl, setScribeUrl] = useState<string>('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (sessionId) {
            initializeChat();
            // Check if this chat session is part of an urgent session request
            checkForExistingUrgentSession();
        }
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const initializeChat = async () => {
        if (!sessionId) return;

        try {
            // Get conversation history
            const response = await apiClient.get(`/api/ai-bots/session/${sessionId}/history`);
            
            if (response.data.success) {
                const history = response.data.conversation;
                const formattedMessages: Message[] = history.map((msg: any) => ({
                    id: msg.id,
                    sender: msg.sender_type,
                    content: msg.message_content,
                    type: msg.message_type,
                    timestamp: new Date(msg.timestamp),
                    confidence: msg.confidence_score
                }));
                
                setMessages(formattedMessages);
                setSessionActive(true);
            }

            // Get bot info from available bots
            const botsResponse = await apiClient.get('/api/ai-bots/');
            const botInfo = botsResponse.data.bots.find((b: any) => b.ai_bot_id === botId);
            
            if (botInfo) {
                setCurrentBot({
                    id: botInfo.ai_bot_id,
                    name: botInfo.bot_name || botInfo.display_name,
                    specialization: botInfo.specialization_focus || botInfo.ai_specialization,
                    personality: botInfo.personality_type
                });
            }

        } catch (error) {
            console.error('Error initializing chat:', error);
            toast.error('Failed to load chat session');
        }
    };

    const createInstantLiveSession = async (topic: string, sessionType: 'mentoring' | 'essay_editing' | 'counseling' = 'mentoring') => {
        try {
            const response = await apiClient.post('/api/ai-bots/urgent-request', {
                topic: topic,
                description: `Instant help with: ${topic}`,
                sessionType: sessionType,
                subject: 'Computer Science'
            });

            if (response.data.success) {
                const sessionData = response.data.data;
                setLiveSession({
                    id: sessionData.requestId,
                    topic: topic,
                    sessionType: sessionType,
                    status: 'preparing',
                    estimatedDuration: 30
                });

                toast.success('Live session created! Your AI mentor will be ready in 1 minute...');
                
                // Start polling for session status updates
                pollForLiveSession(sessionData.requestId, sessionType);
            }
        } catch (error) {
            console.error('Error creating live session:', error);
            toast.error('Failed to create live session');
        }
    };

    const sendMessage = async () => {
        const messageText = inputMessage.trim();
        if (!messageText || !sessionId || isLoading) return;

        // Detect if this is the first meaningful message and create live session
        if (messages.length === 0 || (messages.length === 1 && messages[0].sender === 'ai_bot')) {
            // Determine session type based on message content
            const messageLower = messageText.toLowerCase();
            let sessionType: 'mentoring' | 'essay_editing' | 'counseling' = 'mentoring';
            
            if (messageLower.includes('essay') || messageLower.includes('writing') || messageLower.includes('paper')) {
                sessionType = 'essay_editing';
            } else if (messageLower.includes('stress') || messageLower.includes('help me') || messageLower.includes('counseling')) {
                sessionType = 'counseling';
            }

            await createInstantLiveSession(messageText, sessionType);
        }

        // Add student message
        const studentMessage: Message = {
            id: Date.now().toString(),
            sender: 'student',
            content: messageText,
            type: 'text',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, studentMessage]);
        setInputMessage('');
        setIsLoading(true);
        setIsTyping(true);

        try {
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId,
                message: messageText
            });

            if (response.data.success) {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai_bot',
                    content: response.data.response,
                    type: response.data.messageType || 'text',
                    timestamp: new Date(),
                    confidence: response.data.confidence,
                    suggestions: response.data.suggestions
                };

                setMessages(prev => [...prev, aiMessage]);

                // Update live session status if it becomes active
                if (liveSession && response.data.liveSessionActive) {
                    setLiveSession(prev => prev ? { ...prev, status: 'active' } : null);
                }

                // Handle collaborative session opening
                if (response.data.collaborativeSession) {
                    const collab = response.data.collaborativeSession;
                    
                    // Show notification about opening collaborative session
                    toast.success(collab.message || 'Opening collaborative session...');
                    
                    // Add system message about the collaborative session
                    const systemMessage: Message = {
                        id: (Date.now() + 2).toString(),
                        sender: 'ai_bot',
                        content: `🚀 ${collab.message}\n\n${collab.instructions}\n\n[Click here to open ${collab.toolType === 'essay-editor' ? 'Essay Editor' : 'Code IDE'}](${collab.redirectUrl})`,
                        type: 'system',
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, systemMessage]);
                    
                    // Auto-redirect after a short delay
                    setTimeout(() => {
                        if (collab.redirectUrl) {
                            window.open(collab.redirectUrl, '_blank');
                        }
                    }, 2000);
                }
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInputMessage(suggestion);
    };

    const getMessageIcon = (type: string) => {
        switch (type) {
            case 'suggestion': return <Zap className="h-3 w-3 text-yellow-400" />;
            case 'encouragement': return <CheckCircle className="h-3 w-3 text-green-400" />;
            case 'explanation': return <MessageSquare className="h-3 w-3 text-blue-400" />;
            default: return null;
        }
    };

    const getConfidenceColor = (confidence?: number) => {
        if (!confidence) return 'bg-gray-500';
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.6) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // Poll for live session status updates
    const pollForLiveSession = async (requestId: string, sessionType: string) => {
        const maxAttempts = 12; // Poll for up to 3 minutes (12 attempts * 15 seconds)
        let attempts = 0;

        const poll = async () => {
            try {
                attempts++;
                console.log(`Polling for session ${requestId}, attempt ${attempts}/${maxAttempts}`);
                
                const response = await apiClient.get(`/api/ai-bots/urgent-sessions/${requestId}`);
                
                if (response.data.success) {
                    const session = response.data.session;
                    console.log(`Session status:`, session);
                    
                    // Update live session state
                    setLiveSession(prev => prev ? {
                        ...prev,
                        status: session.status === 'in_session' ? 'active' : prev.status,
                        liveSessionId: session.liveSessionId,
                        liveSessionUrl: session.liveSessionUrl
                    } : null);

                    // Check if live session is ready
                    if (session.isLiveSessionReady && session.liveSessionUrl) {
                        console.log(`Live session ready! Redirecting to: ${session.liveSessionUrl}`);
                        
                        if (sessionType === 'essay_editing') {
                            setShowScribe(true);
                            setScribeUrl(session.liveSessionUrl);
                            toast.success('Your AI Essay Editor is ready! Opening collaborative session...');
                        } else if (sessionType === 'mentoring') {
                            setShowIDE(true);
                            setIdeUrl(session.liveSessionUrl);
                            toast.success('Your AI Mentor is ready! Opening collaborative session...');
                        }
                        
                        return; // Stop polling
                    }
                }

                // Continue polling if not ready yet and haven't exceeded max attempts
                if (attempts < maxAttempts) {
                    setTimeout(poll, 15000); // Poll every 15 seconds
                } else {
                    console.log('Max polling attempts reached');
                    toast.error('Session took too long to start. Please try again.');
                    setLiveSession(prev => prev ? { ...prev, status: 'failed' } : null);
                }
                
            } catch (error) {
                console.error('Error polling session status:', error);
                if (attempts < maxAttempts) {
                    setTimeout(poll, 30000); // Retry on error
                } else {
                    toast.error('Failed to check session status');
                    setLiveSession(prev => prev ? { ...prev, status: 'failed' } : null);
                }
            }
        };

        // Start polling after a short delay
        setTimeout(poll, 10000); // First check after 10 seconds
    };

    // Check if the current AI chat session is part of an urgent session request
    const checkForExistingUrgentSession = async () => {
        if (!sessionId) return;

        try {
            console.log('Checking for existing urgent session for chat sessionId:', sessionId);
            
            // Get active urgent sessions to see if any match this chat session
            const response = await apiClient.get('/api/ai-bots/urgent-sessions/active');
            
            if (response.data.success && response.data.sessions) {
                const activeSession = response.data.sessions.find((session: any) => 
                    session.chatSessionId === sessionId
                );
                
                console.log('Looking for chatSessionId:', sessionId);
                console.log('Available sessions:', response.data.sessions.map((s: any) => ({ 
                    requestId: s.requestId, 
                    chatSessionId: s.chatSessionId, 
                    status: s.status 
                })));
                
                if (activeSession) {
                    console.log('Found matching urgent session:', activeSession);
                    
                    // Set up live session tracking
                    setLiveSession({
                        id: activeSession.requestId,
                        topic: activeSession.topic || 'Essay Writing',
                        sessionType: activeSession.sessionType || 'essay_editing',
                        status: activeSession.isLive ? 'active' : 'preparing',
                        estimatedDuration: 30
                    });

                    // Check session status to determine what to do
                    if (activeSession.status === 'pending' || activeSession.status === 'scheduled') {
                        console.log('Session is scheduled but not live yet, starting polling...');
                        pollForLiveSession(activeSession.requestId, activeSession.sessionType);
                        toast.info('Your AI mentor session will be ready shortly...');
                    } 
                    // If session is in_session and has live session ID, get the URL and redirect
                    else if (activeSession.status === 'in_session' && activeSession.liveSessionId) {
                        console.log('Session is live, generating URL and redirecting...');
                        
                        // Generate the live session URL
                        const liveSessionUrl = `/urgent-session/${activeSession.liveSessionId}/essay?session=${activeSession.liveSessionId}&mentor=ai&document=${activeSession.documentId || ''}`;
                        
                        console.log('Generated live session URL:', liveSessionUrl);
                        toast.success('Your AI Essay Editor is ready! Opening collaborative session...');
                        
                        if (activeSession.sessionType === 'essay_editing') {
                            setShowScribe(true);
                            setScribeUrl(liveSessionUrl);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for existing urgent session:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/trust-graph')}
                                className="text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Trust Graph
                            </Button>
                            
                            {currentBot && (
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-cyan-500">
                                        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500">
                                            <Bot className="h-5 w-5 text-white" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h1 className="text-lg font-semibold text-white">
                                            {currentBot.name}
                                        </h1>
                                        <p className="text-sm text-slate-400">
                                            {currentBot.specialization} • {currentBot.personality}
                                        </p>
                                    </div>
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                        Online
                                    </Badge>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/ai-bots/urgent-request')}
                                className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10"
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                Request Urgent Session
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Session Status Bar */}
            {liveSession && (
                <div className="bg-gradient-to-r from-green-600/20 to-cyan-600/20 border-b border-green-500/30 backdrop-blur">
                    <div className="container mx-auto px-4 py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        liveSession.status === 'active' ? 'bg-green-400 animate-pulse' : 
                                        liveSession.status === 'preparing' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
                                    )} />
                                    <span className="text-sm font-medium text-green-300">
                                        Live Session {liveSession.status === 'active' ? 'Active' : 'Preparing'}
                                    </span>
                                </div>
                                <span className="text-sm text-slate-300">
                                    {liveSession.topic} • {liveSession.estimatedDuration}min
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {showIDE && (
                                    <Button
                                        size="sm"
                                        onClick={() => window.open(ideUrl, '_blank')}
                                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50"
                                    >
                                        <Settings className="h-3 w-3 mr-1" />
                                        Open WebIDE
                                    </Button>
                                )}
                                {showScribe && (
                                    <Button
                                        size="sm"
                                        onClick={() => window.open(scribeUrl, '_blank')}
                                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/50"
                                    >
                                        <Settings className="h-3 w-3 mr-1" />
                                        Open Scribe
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Layout */}
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                <div className={cn(
                    "grid gap-4",
                    (showIDE || showScribe) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                )}>
                    {/* Chat Panel */}
                    <Card className={cn(
                        "h-[calc(100vh-200px)] bg-slate-900/50 backdrop-blur border-slate-700 flex flex-col",
                        (showIDE || showScribe) ? "lg:h-[calc(100vh-200px)]" : ""
                    )}>
                    {/* Messages */}
                    <div className="flex-1 p-6 overflow-y-auto" ref={scrollAreaRef}>
                        <div className="space-y-6">
                            {messages.length === 0 && !isTyping && (
                                <div className="text-center py-12">
                                    <Bot className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">
                                        Chat with {currentBot?.name}
                                    </h3>
                                    <p className="text-slate-400 mb-6">
                                        Start a conversation! I'm here to help with {currentBot?.specialization?.toLowerCase()}.
                                    </p>
                                    
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {[
                                            "Help me debug my code",
                                            "Explain a programming concept",
                                            "Review my project approach",
                                            "Best practices advice"
                                        ].map((suggestion, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="border-slate-600 hover:bg-slate-700"
                                            >
                                                {suggestion}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-4 max-w-[80%]",
                                        message.sender === 'student' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                                    )}
                                >
                                    <Avatar className="h-8 w-8 border border-slate-600">
                                        <AvatarFallback className={cn(
                                            "text-white text-sm font-bold",
                                            message.sender === 'ai_bot' 
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                                                : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                        )}>
                                            {message.sender === 'ai_bot' ? 
                                                <Bot className="h-4 w-4" /> : 
                                                <User className="h-4 w-4" />
                                            }
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className={cn(
                                        "rounded-2xl px-4 py-3 max-w-full",
                                        message.sender === 'student'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-800 text-slate-100 border border-slate-700'
                                    )}>
                                        {message.sender === 'ai_bot' && (
                                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                                                {getMessageIcon(message.type)}
                                                <span className="capitalize">{message.type}</span>
                                                {message.confidence && (
                                                    <div className="flex items-center gap-1">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            getConfidenceColor(message.confidence)
                                                        )} />
                                                        <span>{Math.round(message.confidence * 100)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                        
                                        {message.suggestions && message.suggestions.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-600">
                                                <p className="text-xs text-slate-400 mb-2">Try asking:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {message.suggestions.map((suggestion, idx) => (
                                                        <Button
                                                            key={idx}
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                            className="text-xs h-6 px-2 border-slate-600 hover:bg-slate-700"
                                                        >
                                                            {suggestion}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {message.timestamp.toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div className="flex gap-4 max-w-[80%] mr-auto">
                                    <Avatar className="h-8 w-8 border border-slate-600">
                                        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                            <Bot className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <Separator className="border-slate-700" />

                    {/* Input */}
                    <div className="p-4">
                        <div className="flex gap-2">
                            <Input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-cyan-500 hover:bg-cyan-600 px-4"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    </Card>

                    {/* WebIDE/Scribe Embedded Panel */}
                    {(showIDE || showScribe) && (
                        <Card className="h-[calc(100vh-200px)] bg-slate-900/50 backdrop-blur border-slate-700 flex flex-col">
                            <div className="p-4 border-b border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        {showIDE && (
                                            <>
                                                <Settings className="h-5 w-5 text-cyan-400" />
                                                Ascent WebIDE
                                            </>
                                        )}
                                        {showScribe && (
                                            <>
                                                <Settings className="h-5 w-5 text-purple-400" />
                                                Scribe Session
                                            </>
                                        )}
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowIDE(false);
                                            setShowScribe(false);
                                        }}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        ✕
                                    </Button>
                                </div>
                                <p className="text-sm text-slate-400 mt-1">
                                    {showIDE ? "Code, test, and learn with AI guidance" : "Write and edit with AI assistance"}
                                </p>
                            </div>
                            
                            <div className="flex-1 relative">
                                {showIDE && ideUrl && (
                                    <iframe
                                        src={ideUrl}
                                        className="w-full h-full border-0 rounded-b-lg"
                                        title="Ascent WebIDE"
                                        allow="camera; microphone; clipboard-read; clipboard-write"
                                    />
                                )}
                                {showScribe && scribeUrl && (
                                    <iframe
                                        src={scribeUrl}
                                        className="w-full h-full border-0 rounded-b-lg"
                                        title="Scribe Session"
                                        allow="camera; microphone; clipboard-read; clipboard-write"
                                    />
                                )}
                                
                                {/* Loading overlay for when session is preparing */}
                                {liveSession?.status === 'preparing' && (
                                    <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-slate-300 font-medium">Preparing your workspace...</p>
                                            <p className="text-slate-400 text-sm mt-1">
                                                AI mentor is setting up your learning environment
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIChatPage;