import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
    Send, Bot, User, Lightbulb, BookOpen, Brain, Eye, MessageCircle,
    Sparkles, CheckCircle, AlertCircle, Star, Wand2, FileText,
    Edit3, Target, TrendingUp, Clock, Loader, ThumbsUp, ThumbsDown,
    Copy, RefreshCw, Volume2, Pause, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
        analysis?: DocumentAnalysis;
        suggestions?: string[];
        confidence?: number;
        category?: 'grammar' | 'style' | 'content' | 'structure' | 'general';
    };
}

interface DocumentAnalysis {
    overallScore: number;
    grammar: number;
    style: number;
    clarity: number;
    structure: number;
    vocabulary: number;
    tone: string;
    readabilityLevel: string;
    suggestions: {
        category: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
        position?: { from: number; to: number };
    }[];
    statistics: {
        wordCount: number;
        sentenceCount: number;
        paragraphCount: number;
        averageWordsPerSentence: number;
        readingTime: number;
    };
}

interface EnhancedAIChatPanelProps {
    isVisible: boolean;
    onToggle: () => void;
    sessionId: string;
    userId: string;
    username: string;
    userRole: 'teacher' | 'student';
    documentContent: string;
    students: any[];
    onAnalysisComplete?: (analysis: DocumentAnalysis) => void;
    onSuggestionApplied?: (suggestion: string) => void;
}

const SAMPLE_AI_RESPONSES = {
    greeting: [
        "Hello! I'm your AI writing assistant. I can help analyze your essay, provide suggestions, and answer questions about writing techniques.",
        "Hi there! I'm here to help with your essay. Feel free to ask me about grammar, style, structure, or content improvements.",
        "Welcome! I can analyze your document, suggest improvements, and help both teachers and students with writing guidance."
    ],
    analysis: [
        "I've analyzed your essay and found several areas for improvement. Your writing shows good structure overall.",
        "Your essay demonstrates strong vocabulary usage. Let me highlight some areas where we can enhance clarity.",
        "Great work on the introduction! I've identified some opportunities to strengthen your arguments."
    ],
    grammar: [
        "I noticed a few grammatical patterns that could be improved. Here are my suggestions:",
        "Your grammar is quite good overall. Let me point out a few minor corrections:",
        "I found some grammatical inconsistencies that we can easily fix:"
    ],
    style: [
        "Your writing style is engaging. Here are some ways to make it even more compelling:",
        "I can see your unique voice coming through. Let's polish the style a bit more:",
        "Your style shows creativity. Here are some refinements to consider:"
    ]
};

export const EnhancedAIChatPanel: React.FC<EnhancedAIChatPanelProps> = ({
    isVisible,
    onToggle,
    sessionId,
    userId,
    username,
    userRole,
    documentContent,
    students,
    onAnalysisComplete,
    onSuggestionApplied
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currentAnalysis, setCurrentAnalysis] = useState<DocumentAnalysis | null>(null);
    const [activeTab, setActiveTab] = useState('chat');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // Initialize with welcome message
    useEffect(() => {
        const welcomeMessage: Message = {
            id: '1',
            type: 'ai',
            content: SAMPLE_AI_RESPONSES.greeting[Math.floor(Math.random() * SAMPLE_AI_RESPONSES.greeting.length)],
            timestamp: new Date(),
            metadata: { confidence: 1.0, category: 'general' }
        };
        setMessages([welcomeMessage]);
    }, []);

    const analyzeDocument = useCallback(async () => {
        if (!documentContent || documentContent.length < 10) {
            toast.error('Please write some content first before analysis');
            return;
        }

        setIsAnalyzing(true);
        setIsTyping(true);

        try {
            // Simulate AI analysis (replace with actual AI API call)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Mock analysis results
            const analysis: DocumentAnalysis = {
                overallScore: Math.floor(Math.random() * 20) + 75, // 75-95
                grammar: Math.floor(Math.random() * 20) + 80,
                style: Math.floor(Math.random() * 25) + 70,
                clarity: Math.floor(Math.random() * 25) + 75,
                structure: Math.floor(Math.random() * 30) + 70,
                vocabulary: Math.floor(Math.random() * 20) + 80,
                tone: ['Academic', 'Conversational', 'Formal', 'Persuasive'][Math.floor(Math.random() * 4)],
                readabilityLevel: ['High School', 'College', 'Graduate'][Math.floor(Math.random() * 3)],
                suggestions: [
                    {
                        category: 'Grammar',
                        message: 'Consider using more active voice constructions',
                        severity: 'medium' as const,
                        position: { from: 100, to: 150 }
                    },
                    {
                        category: 'Style',
                        message: 'This paragraph could benefit from more varied sentence structure',
                        severity: 'low' as const,
                        position: { from: 200, to: 300 }
                    },
                    {
                        category: 'Content',
                        message: 'Consider adding more supporting evidence for this claim',
                        severity: 'high' as const,
                        position: { from: 400, to: 500 }
                    }
                ],
                statistics: {
                    wordCount: documentContent.split(' ').length,
                    sentenceCount: documentContent.split('.').length - 1,
                    paragraphCount: documentContent.split('\n\n').length,
                    averageWordsPerSentence: Math.floor(documentContent.split(' ').length / (documentContent.split('.').length - 1)),
                    readingTime: Math.ceil(documentContent.split(' ').length / 200) // 200 words per minute
                }
            };

            setCurrentAnalysis(analysis);

            if (onAnalysisComplete) {
                onAnalysisComplete(analysis);
            }

            // Add analysis message
            const analysisMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: `I've completed analyzing your essay! Overall score: ${analysis.overallScore}/100. Your writing shows ${analysis.tone.toLowerCase()} tone and is at a ${analysis.readabilityLevel.toLowerCase()} level. I found ${analysis.suggestions.length} suggestions for improvement.`,
                timestamp: new Date(),
                metadata: {
                    analysis,
                    confidence: 0.9,
                    category: 'general'
                }
            };

            setMessages(prev => [...prev, analysisMessage]);
            setActiveTab('analysis');
            toast.success('Document analysis complete!');
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Failed to analyze document');
        } finally {
            setIsAnalyzing(false);
            setIsTyping(false);
        }
    }, [documentContent, onAnalysisComplete]);

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            let aiResponse = '';
            const input = inputMessage.toLowerCase();

            if (input.includes('analyze') || input.includes('analysis')) {
                analyzeDocument();
                return;
            } else if (input.includes('grammar')) {
                aiResponse = SAMPLE_AI_RESPONSES.grammar[Math.floor(Math.random() * SAMPLE_AI_RESPONSES.grammar.length)];
            } else if (input.includes('style')) {
                aiResponse = SAMPLE_AI_RESPONSES.style[Math.floor(Math.random() * SAMPLE_AI_RESPONSES.style.length)];
            } else {
                aiResponse = `Great question! ${input.includes('help') ? 'I can help you with grammar, style, structure, and content suggestions.' : 'Let me help you with that.'} ${userRole === 'teacher' ? 'As a teacher, you might also want to assign specific feedback tasks to students.' : 'Would you like me to analyze the current document or provide specific writing tips?'}`;
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: aiResponse,
                timestamp: new Date(),
                metadata: {
                    confidence: 0.85,
                    category: 'general'
                }
            };

            setMessages(prev => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1500);
    }, [inputMessage, userRole, analyzeDocument]);

    const applySuggestion = useCallback((suggestion: string) => {
        if (onSuggestionApplied) {
            onSuggestionApplied(suggestion);
        }
        toast.success('Suggestion applied!');
    }, [onSuggestionApplied]);

    if (!isVisible) return null;

    return (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-2xl z-50 bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-t-lg">
                <div className="flex items-center space-x-2">
                    <Bot className="w-6 h-6" />
                    <div>
                        <CardTitle className="text-lg font-semibold">AI Writing Assistant</CardTitle>
                        <p className="text-xs opacity-90">Helping teachers and students</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onToggle} className="text-white hover:bg-white/20">
                    ×
                </Button>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 p-1 m-1">
                    <TabsTrigger value="chat" className="text-xs">
                        Chat
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="text-xs">
                        Analysis
                        {currentAnalysis && <Badge variant="secondary" className="ml-1 text-xs">•</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="suggestions" className="text-xs">
                        Tips
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex items-start space-x-2",
                                        message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                    )}
                                >
                                    <Avatar className={cn(
                                        "w-8 h-8",
                                        message.type === 'ai' ? 'bg-purple-100' : 'bg-blue-100'
                                    )}>
                                        <AvatarFallback>
                                            {message.type === 'ai' ? <Bot className="w-4 h-4 text-purple-600" /> :
                                             message.type === 'user' ? <User className="w-4 h-4 text-blue-600" /> :
                                             'S'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className={cn(
                                        "flex-1 max-w-[280px]",
                                        message.type === 'user' ? 'text-right' : ''
                                    )}>
                                        <div className={cn(
                                            "rounded-lg p-3 text-sm",
                                            message.type === 'user'
                                                ? 'bg-blue-500 text-white ml-auto'
                                                : 'bg-gray-100 text-gray-900'
                                        )}>
                                            {message.content}
                                        </div>

                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-400">
                                                {message.timestamp.toLocaleTimeString()}
                                            </span>
                                            {message.type === 'ai' && message.metadata?.confidence && (
                                                <span className="text-xs text-gray-400">
                                                    {Math.round(message.metadata.confidence * 100)}% confident
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex items-start space-x-2">
                                    <Avatar className="w-8 h-8 bg-purple-100">
                                        <AvatarFallback>
                                            <Bot className="w-4 h-4 text-purple-600" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-gray-100 rounded-lg p-3">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <div className="flex space-x-2 mb-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={analyzeDocument}
                                disabled={isAnalyzing}
                                className="flex-1 text-xs"
                            >
                                {isAnalyzing ? (
                                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <Brain className="w-3 h-3 mr-1" />
                                )}
                                Analyze Essay
                            </Button>
                        </div>

                        <form onSubmit={handleSendMessage} className="flex space-x-2">
                            <Input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask me anything about writing..."
                                className="flex-1 text-sm"
                                disabled={isTyping}
                            />
                            <Button type="submit" size="sm" disabled={!inputMessage.trim() || isTyping}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="analysis" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                        {currentAnalysis ? (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600">
                                        {currentAnalysis.overallScore}/100
                                    </div>
                                    <p className="text-sm text-gray-600">Overall Score</p>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Detailed Scores</h4>
                                    {[
                                        { label: 'Grammar', value: currentAnalysis.grammar },
                                        { label: 'Style', value: currentAnalysis.style },
                                        { label: 'Clarity', value: currentAnalysis.clarity },
                                        { label: 'Structure', value: currentAnalysis.structure },
                                        { label: 'Vocabulary', value: currentAnalysis.vocabulary },
                                    ].map((item) => (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span>{item.label}</span>
                                                <span>{item.value}/100</span>
                                            </div>
                                            <Progress value={item.value} className="h-2" />
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Document Info</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-600">Tone:</span>
                                            <Badge variant="outline" className="ml-1 text-xs">
                                                {currentAnalysis.tone}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Level:</span>
                                            <Badge variant="outline" className="ml-1 text-xs">
                                                {currentAnalysis.readabilityLevel}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Words:</span>
                                            <span className="ml-1">{currentAnalysis.statistics.wordCount}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Reading:</span>
                                            <span className="ml-1">{currentAnalysis.statistics.readingTime}min</span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Suggestions ({currentAnalysis.suggestions.length})</h4>
                                    {currentAnalysis.suggestions.map((suggestion, index) => (
                                        <Card key={index} className="p-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-xs",
                                                                suggestion.severity === 'high' ? 'border-red-200 text-red-700' :
                                                                suggestion.severity === 'medium' ? 'border-yellow-200 text-yellow-700' :
                                                                'border-green-200 text-green-700'
                                                            )}
                                                        >
                                                            {suggestion.category}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {suggestion.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{suggestion.message}</p>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => applySuggestion(suggestion.message)}
                                                    className="text-xs"
                                                >
                                                    <Wand2 className="w-3 h-3 mr-1" />
                                                    Apply
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-xs">
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-4">No analysis yet</p>
                                <Button onClick={analyzeDocument} disabled={isAnalyzing}>
                                    {isAnalyzing ? (
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Brain className="w-4 h-4 mr-2" />
                                    )}
                                    Analyze Document
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="suggestions" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                            <h4 className="font-semibold">Writing Tips</h4>

                            {[
                                {
                                    icon: Edit3,
                                    title: 'Grammar Check',
                                    description: 'Use active voice and vary sentence structure',
                                    color: 'text-red-600'
                                },
                                {
                                    icon: Sparkles,
                                    title: 'Style Enhancement',
                                    description: 'Make your writing more engaging and clear',
                                    color: 'text-purple-600'
                                },
                                {
                                    icon: Target,
                                    title: 'Content Focus',
                                    description: 'Ensure each paragraph supports your main thesis',
                                    color: 'text-blue-600'
                                },
                                {
                                    icon: TrendingUp,
                                    title: 'Structure',
                                    description: 'Organize ideas logically with smooth transitions',
                                    color: 'text-green-600'
                                }
                            ].map((tip, index) => (
                                <Card key={index} className="p-3">
                                    <div className="flex items-start space-x-3">
                                        <tip.icon className={cn("w-5 h-5 mt-0.5", tip.color)} />
                                        <div>
                                            <h5 className="font-medium text-sm">{tip.title}</h5>
                                            <p className="text-xs text-gray-600 mt-1">{tip.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}

                            {userRole === 'teacher' && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">Teacher Tools</h4>
                                        <Card className="p-3">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <MessageCircle className="w-4 h-4 text-blue-600" />
                                                <span className="font-medium text-sm">Student Guidance</span>
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                I can help provide personalized feedback to students and suggest areas for improvement.
                                            </p>
                                        </Card>
                                    </div>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </Card>
    );
};

export default EnhancedAIChatPanel;