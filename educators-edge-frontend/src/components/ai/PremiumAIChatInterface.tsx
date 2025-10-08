import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';

// Icons
import {
    Send, Bot, User, Sparkles, Lightbulb, Target, Brain,
    FileText, Edit3, BookOpen, Star, Clock, Zap, Wand2,
    MessageCircle, CheckCircle, AlertCircle, Info,
    ThumbsUp, ThumbsDown, Copy, Share2, Bookmark,
    Volume2, RotateCcw, Plus, Mic, Image, Paperclip,
    Crown, Gem, Award, TrendingUp
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'text' | 'suggestion' | 'analysis' | 'improvement' | 'question' | 'brainstorm';
    confidence?: number;
    metadata?: {
        wordCount?: number;
        readingTime?: number;
        sentiment?: 'positive' | 'neutral' | 'constructive';
        categories?: string[];
    };
    actions?: {
        label: string;
        action: string;
        icon?: React.ComponentType;
    }[];
}

interface QuickPrompt {
    id: string;
    title: string;
    prompt: string;
    icon: React.ComponentType;
    category: 'writing' | 'structure' | 'style' | 'research';
    description: string;
}

interface PremiumAIChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (message: string, type?: string) => void;
    isLoading?: boolean;
    documentContent?: string;
    selectedText?: string;
}

const PremiumAIChatInterface: React.FC<PremiumAIChatInterfaceProps> = ({
    messages,
    onSendMessage,
    isLoading = false,
    documentContent,
    selectedText
}) => {
    const [input, setInput] = useState('');
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'all' | 'writing' | 'structure' | 'style' | 'research'>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const quickPrompts: QuickPrompt[] = [
        {
            id: '1',
            title: 'Improve Clarity',
            prompt: 'How can I make this paragraph clearer and more concise?',
            icon: Lightbulb,
            category: 'writing',
            description: 'Get suggestions to improve readability'
        },
        {
            id: '2',
            title: 'Strengthen Argument',
            prompt: 'How can I strengthen the argument in this section?',
            icon: Target,
            category: 'structure',
            description: 'Enhance logical flow and persuasiveness'
        },
        {
            id: '3',
            title: 'Academic Tone',
            prompt: 'Help me adjust the tone to be more academic and professional.',
            icon: BookOpen,
            category: 'style',
            description: 'Refine writing style for academic contexts'
        },
        {
            id: '4',
            title: 'Add Evidence',
            prompt: 'What kind of evidence or examples would support this argument?',
            icon: FileText,
            category: 'research',
            description: 'Identify areas needing supporting evidence'
        },
        {
            id: '5',
            title: 'Fix Grammar',
            prompt: 'Please check this text for grammar and style issues.',
            icon: CheckCircle,
            category: 'writing',
            description: 'Comprehensive grammar and style review'
        },
        {
            id: '6',
            title: 'Better Transitions',
            prompt: 'How can I improve the transitions between these paragraphs?',
            icon: TrendingUp,
            category: 'structure',
            description: 'Improve flow between ideas'
        },
        {
            id: '7',
            title: 'Engaging Introduction',
            prompt: 'Help me write a more engaging introduction for this essay.',
            icon: Sparkles,
            category: 'writing',
            description: 'Create compelling openings'
        },
        {
            id: '8',
            title: 'Strong Conclusion',
            prompt: 'How can I make my conclusion more impactful?',
            icon: Award,
            category: 'structure',
            description: 'Craft memorable endings'
        }
    ];

    const filteredPrompts = quickPrompts.filter(prompt =>
        activeCategory === 'all' || prompt.category === activeCategory
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        onSendMessage(input);
        setInput('');
        setShowQuickPrompts(false);
    };

    const handleQuickPrompt = (prompt: QuickPrompt) => {
        let finalPrompt = prompt.prompt;
        if (selectedText) {
            finalPrompt += `\n\nSelected text: "${selectedText}"`;
        }
        onSendMessage(finalPrompt, prompt.category);
        setShowQuickPrompts(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getMessageIcon = (message: ChatMessage) => {
        if (message.role === 'user') return User;

        const typeIcons = {
            suggestion: Lightbulb,
            analysis: Brain,
            improvement: Wand2,
            question: MessageCircle,
            brainstorm: Sparkles
        };

        return typeIcons[message.type || 'text'] || Bot;
    };

    const getMessageBadgeColor = (type?: string) => {
        const colors = {
            suggestion: 'bg-blue-100 text-blue-800',
            analysis: 'bg-purple-100 text-purple-800',
            improvement: 'bg-green-100 text-green-800',
            question: 'bg-orange-100 text-orange-800',
            brainstorm: 'bg-pink-100 text-pink-800'
        };
        return colors[type || 'text'] || 'bg-gray-100 text-gray-800';
    };

    const MessageBubble = ({ message }: { message: ChatMessage }) => {
        const Icon = getMessageIcon(message);
        const isUser = message.role === 'user';

        return (
            <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
                <Avatar className={cn("w-8 h-8", isUser ? "bg-indigo-500" : "bg-gradient-to-r from-purple-500 to-indigo-600")}>
                    <AvatarFallback className="text-white">
                        <Icon className="w-4 h-4" />
                    </AvatarFallback>
                </Avatar>

                <div className={cn("flex-1 max-w-xs lg:max-w-md", isUser ? "flex flex-col items-end" : "flex flex-col items-start")}>
                    <div className={cn(
                        "p-3 rounded-lg",
                        isUser
                            ? "bg-indigo-500 text-white"
                            : "bg-white border border-slate-200 shadow-sm"
                    )}>
                        {!isUser && message.type && (
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className={cn("text-xs", getMessageBadgeColor(message.type))}>
                                    {message.type}
                                </Badge>
                                {message.confidence && (
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-500" />
                                        <span className="text-xs text-slate-500">
                                            {Math.round(message.confidence * 100)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className={cn(
                            "text-sm leading-relaxed",
                            isUser ? "text-white" : "text-slate-900"
                        )}>
                            {message.content}
                        </p>

                        {message.metadata && !isUser && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {message.metadata.wordCount && (
                                        <span>{message.metadata.wordCount} words</span>
                                    )}
                                    {message.metadata.readingTime && (
                                        <span>{message.metadata.readingTime}min read</span>
                                    )}
                                    {message.metadata.sentiment && (
                                        <Badge variant="outline" className="text-xs">
                                            {message.metadata.sentiment}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isUser ? "justify-end" : "justify-start"
                    )}>
                        <span className="text-xs text-slate-500">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {!isUser && (
                            <div className="flex gap-1 ml-2">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ThumbsUp className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ThumbsDown className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {message.actions && !isUser && (
                        <div className="flex gap-1 mt-2">
                            {message.actions.map((action, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {/* Handle action */}}
                                >
                                    {action.icon && <action.icon className="w-3 h-3 mr-1" />}
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const QuickPromptsSection = () => (
        <div className="p-4 bg-slate-50 border-t flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-900">Quick Prompts</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                    className="text-xs"
                >
                    {showQuickPrompts ? 'Hide' : 'Show'}
                </Button>
            </div>

            {showQuickPrompts && (
                <>
                    <div className="flex gap-1 mb-3 overflow-x-auto">
                        {['all', 'writing', 'structure', 'style', 'research'].map((category) => (
                            <Button
                                key={category}
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveCategory(category as any)}
                                className={cn(
                                    "text-xs whitespace-nowrap",
                                    activeCategory === category ? "bg-white shadow-sm" : ""
                                )}
                            >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {filteredPrompts.map((prompt) => {
                            const Icon = prompt.icon;
                            return (
                                <Button
                                    key={prompt.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuickPrompt(prompt)}
                                    className="justify-start text-left h-auto p-3 bg-white hover:bg-slate-50"
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <Icon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-900 truncate">
                                                {prompt.title}
                                            </p>
                                            <p className="text-xs text-slate-500 line-clamp-2">
                                                {prompt.description}
                                            </p>
                                        </div>
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">AI Writing Coach</h3>
                        <p className="text-xs text-slate-600">Premium essay assistance</p>
                    </div>
                </div>

                {selectedText && (
                    <div className="mt-3 p-2 bg-white rounded border border-indigo-200">
                        <p className="text-xs text-indigo-700 mb-1">Selected text:</p>
                        <p className="text-sm text-slate-900 italic">
                            "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
                        </p>
                    </div>
                )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">Welcome to Premium AI Writing Assistant</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            I'm here to help you improve your essay with advanced AI feedback and suggestions.
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                            {quickPrompts.slice(0, 4).map((prompt) => {
                                const Icon = prompt.icon;
                                return (
                                    <Button
                                        key={prompt.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickPrompt(prompt)}
                                        className="text-xs h-auto p-2"
                                    >
                                        <Icon className="w-3 h-3 mr-1" />
                                        {prompt.title}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div>
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 mb-4">
                                <Avatar className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600">
                                    <AvatarFallback className="text-white">
                                        <Bot className="w-4 h-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></div>
                                        </div>
                                        <span className="text-xs text-slate-500">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Quick Prompts */}
            {messages.length === 0 && <QuickPromptsSection />}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask your AI writing coach anything..."
                            className="pr-20 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900 placeholder:text-slate-500"
                            disabled={isLoading}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Paperclip className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Mic className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-2">
                        {messages.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                                className="text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Quick Prompts
                            </Button>
                        )}
                        {input.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {input.length} chars
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PremiumAIChatInterface;