import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import apiClient from '../services/apiClient';
import {
    Bot, Send, Code, MessageSquare, Lightbulb, CheckCircle,
    Minimize2, Maximize2, X, User, AlertCircle, Zap, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
    id: string;
    sender: 'student' | 'ai_bot';
    content: string;
    type: 'text' | 'code' | 'explanation' | 'suggestion' | 'encouragement';
    timestamp: Date;
    confidence?: number;
    suggestions?: string[];
}

interface AIBot {
    id: string;
    name: string;
    specialization: string;
    personality: string;
    avatar?: string;
}

interface AIAssistantProps {
    lessonId?: string;
    codeSnippet?: string;
    errorMessage?: string;
    language?: string;
    onClose?: () => void;
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
    lessonId,
    codeSnippet,
    errorMessage,
    language = 'javascript',
    onClose,
    isMinimized = false,
    onToggleMinimize
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentBot, setCurrentBot] = useState<AIBot | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    const messageEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initializeAIAssistant();
    }, [lessonId]);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // If there's an error message or code snippet, automatically ask for help
        if ((errorMessage || codeSnippet) && currentBot && sessionId) {
            handleAutoAssistance();
        }
    }, [errorMessage, codeSnippet, currentBot, sessionId]);

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const initializeAIAssistant = async () => {
        setIsConnecting(true);
        try {
            // Start a session with an AI bot
            const response = await apiClient.post('/api/ai-bots/session/start', {
                sessionType: 'ide_assistance',
                lessonId: lessonId,
                problem: `Student needs help with ${language} programming in IDE`
            });

            if (response.data.success) {
                setSessionId(response.data.session.id);
                setCurrentBot(response.data.bot);
                
                // Add initial greeting message
                const initialMessage: Message = {
                    id: Date.now().toString(),
                    sender: 'ai_bot',
                    content: response.data.initialMessage,
                    type: 'text',
                    timestamp: new Date()
                };
                
                setMessages([initialMessage]);
            }
        } catch (error) {
            console.error('Error initializing AI assistant:', error);
            toast.error('Failed to connect to AI assistant');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleAutoAssistance = async () => {
        if (!sessionId) return;
        
        let autoMessage = '';
        if (errorMessage) {
            autoMessage = `I'm getting this error in my ${language} code: ${errorMessage}`;
        } else if (codeSnippet) {
            autoMessage = `Could you help me understand this ${language} code better?`;
        }

        if (autoMessage) {
            await sendMessage(autoMessage, true);
        }
    };

    const sendMessage = async (message?: string, isAutomatic = false) => {
        const messageText = message || inputMessage.trim();
        if (!messageText || !sessionId || isLoading) return;

        // Add student message
        const studentMessage: Message = {
            id: Date.now().toString(),
            sender: 'student',
            content: messageText,
            type: 'text',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, studentMessage]);
        if (!isAutomatic) setInputMessage('');
        setIsLoading(true);
        setIsTyping(true);

        try {
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId,
                message: messageText,
                codeSnippet,
                errorMessage,
                language
            });

            if (response.data.success) {
                // Add AI response
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
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message to AI assistant');
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    const handleQuickAction = (action: string) => {
        const quickMessages = {
            'explain-error': `Can you explain what this error means and how to fix it?`,
            'debug-code': `Help me debug this code step by step.`,
            'best-practices': `What are the best practices for this type of code?`,
            'alternative-approach': `Is there a better way to write this code?`,
            'next-steps': `What should I work on next?`
        };
        
        const message = quickMessages[action as keyof typeof quickMessages];
        if (message) {
            sendMessage(message);
        }
    };

    const getMessageIcon = (type: string) => {
        switch (type) {
            case 'code': return <Code className="h-3 w-3" />;
            case 'explanation': return <Lightbulb className="h-3 w-3" />;
            case 'suggestion': return <Zap className="h-3 w-3" />;
            case 'encouragement': return <CheckCircle className="h-3 w-3" />;
            default: return <MessageSquare className="h-3 w-3" />;
        }
    };

    const getConfidenceColor = (confidence?: number) => {
        if (!confidence) return 'bg-gray-500';
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.6) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (isMinimized) {
        return (
            <Card className="fixed bottom-4 right-4 w-80 bg-slate-900/95 backdrop-blur border border-slate-700 shadow-2xl z-50">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-cyan-400" />
                            <span className="font-medium text-white">AI Assistant</span>
                            {currentBot && (
                                <Badge variant="secondary" className="text-xs">
                                    {currentBot.name.split(' ')[0]}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onToggleMinimize}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onClose}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] bg-slate-900/95 backdrop-blur border border-slate-700 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-slate-600">
                            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold">
                                <Bot className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-white text-sm">
                                {currentBot?.name || 'AI Assistant'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {currentBot?.specialization || 'Programming Helper'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onToggleMinimize}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                            <Minimize2 className="h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <Separator className="border-slate-700" />

            {/* Messages */}
            <CardContent className="flex-1 p-4 overflow-hidden">
                {isConnecting ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Bot className="h-8 w-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
                            <p className="text-slate-400 text-sm">Connecting to AI assistant...</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto" ref={scrollAreaRef}>
                        <div className="space-y-4 pr-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3",
                                        message.sender === 'student' ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    {message.sender === 'ai_bot' && (
                                        <Avatar className="h-6 w-6 border border-slate-600">
                                            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs">
                                                <Bot className="h-3 w-3" />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    
                                    <div className={cn(
                                        "max-w-[280px] rounded-lg px-3 py-2",
                                        message.sender === 'student'
                                            ? 'bg-blue-600 text-white ml-auto'
                                            : 'bg-slate-800 text-slate-100 border border-slate-700'
                                    )}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {message.sender === 'ai_bot' && (
                                                <>
                                                    {getMessageIcon(message.type)}
                                                    <span className="text-xs text-slate-400 capitalize">
                                                        {message.type}
                                                    </span>
                                                    {message.confidence && (
                                                        <div className="flex items-center gap-1">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                getConfidenceColor(message.confidence)
                                                            )} />
                                                            <span className="text-xs text-slate-400">
                                                                {Math.round(message.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        
                                        {message.suggestions && message.suggestions.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-600">
                                                <p className="text-xs text-slate-400 mb-1">Suggestions:</p>
                                                {message.suggestions.map((suggestion, idx) => (
                                                    <Button
                                                        key={idx}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs mr-1 mb-1 h-6 px-2 border-slate-600 hover:bg-slate-700"
                                                        onClick={() => sendMessage(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="text-xs text-slate-500 mt-1">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    {message.sender === 'student' && (
                                        <Avatar className="h-6 w-6 border border-slate-600">
                                            <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs">
                                                <User className="h-3 w-3" />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div className="flex gap-3 justify-start">
                                    <Avatar className="h-6 w-6 border border-slate-600">
                                        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs">
                                            <Bot className="h-3 w-3" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messageEndRef} />
                        </div>
                    </div>
                )}
            </CardContent>

            <Separator className="border-slate-700" />

            {/* Quick Actions */}
            {!isConnecting && (
                <div className="p-3">
                    <div className="flex flex-wrap gap-1 mb-3">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 border-slate-600 hover:bg-slate-700"
                            onClick={() => handleQuickAction('explain-error')}
                        >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Explain Error
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 border-slate-600 hover:bg-slate-700"
                            onClick={() => handleQuickAction('debug-code')}
                        >
                            <Code className="h-3 w-3 mr-1" />
                            Debug
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 border-slate-600 hover:bg-slate-700"
                            onClick={() => handleQuickAction('best-practices')}
                        >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Best Practices
                        </Button>
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Ask me anything about your code..."
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            disabled={isLoading}
                        />
                        <Button
                            size="sm"
                            onClick={() => sendMessage()}
                            disabled={!inputMessage.trim() || isLoading}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-3"
                        >
                            <Send className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default AIAssistant;