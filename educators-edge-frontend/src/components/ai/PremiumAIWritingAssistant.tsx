import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';

// Icons
import {
    Sparkles, Brain, Target, Lightbulb, Star, Wand2, Zap,
    MessageCircle, CheckCircle, AlertTriangle, Info, Edit3,
    TrendingUp, Award, Clock, Layers, Microscope, Telescope,
    Compass, Beaker, Gem, Crown, ArrowRight, RotateCcw,
    ThumbsUp, ThumbsDown, Bookmark, Share2, Copy,
    PenTool, FileText, BookOpen, Headphones, Volume2, Settings
} from 'lucide-react';

interface AIFeedback {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'clarity' | 'engagement' | 'research' | 'flow' | 'tone';
    title: string;
    description: string;
    selectedText?: string;
    suggestion: string;
    confidence: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'technical' | 'creative' | 'academic' | 'style';
    position?: { from: number; to: number };
    aiReasoning?: string;
    improvedVersion?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface WritingMetrics {
    wordCount: number;
    readabilityScore: number;
    sentenceComplexity: number;
    vocabularyDiversity: number;
    emotionalTone: string;
    academicLevel: string;
    engagementScore: number;
}

interface PremiumAIWritingAssistantProps {
    content: string;
    selectedText?: string;
    onApplyFeedback: (feedback: AIFeedback) => void;
    onContentSuggestion: (suggestion: string) => void;
    isAnalyzing?: boolean;
}

const PremiumAIWritingAssistant: React.FC<PremiumAIWritingAssistantProps> = ({
    content,
    selectedText,
    onApplyFeedback,
    onContentSuggestion,
    isAnalyzing = false
}) => {
    const [feedbacks, setFeedbacks] = useState<AIFeedback[]>([]);
    const [metrics, setMetrics] = useState<WritingMetrics | null>(null);
    const [activeCategory, setActiveCategory] = useState<'all' | 'technical' | 'creative' | 'academic' | 'style'>('all');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);

    // Generate sample data for demonstration
    useEffect(() => {
        if (content.length > 50) {
            const sampleFeedbacks: AIFeedback[] = [
                {
                    id: '1',
                    type: 'clarity',
                    title: 'Improve sentence clarity',
                    description: 'This sentence could be clearer and more concise',
                    selectedText: selectedText || 'The implementation of the methodology...',
                    suggestion: 'Consider breaking this complex sentence into two shorter ones for better readability.',
                    confidence: 0.92,
                    priority: 'high',
                    category: 'technical',
                    aiReasoning: 'Long sentences with multiple clauses can confuse readers and reduce comprehension.',
                    improvedVersion: 'The methodology was implemented successfully. This approach improved our results significantly.',
                    difficulty: 'intermediate'
                },
                {
                    id: '2',
                    type: 'engagement',
                    title: 'Enhance reader engagement',
                    description: 'Add a compelling hook to draw readers in',
                    suggestion: 'Start with a thought-provoking question or surprising statistic.',
                    confidence: 0.87,
                    priority: 'medium',
                    category: 'creative',
                    aiReasoning: 'Engaging openings capture attention and encourage continued reading.',
                    difficulty: 'beginner'
                },
                {
                    id: '3',
                    type: 'structure',
                    title: 'Strengthen paragraph transitions',
                    description: 'Improve flow between ideas',
                    suggestion: 'Add transitional phrases to connect your paragraphs more smoothly.',
                    confidence: 0.89,
                    priority: 'medium',
                    category: 'academic',
                    aiReasoning: 'Smooth transitions help readers follow your argument and maintain coherence.',
                    difficulty: 'intermediate'
                }
            ];

            const sampleMetrics: WritingMetrics = {
                wordCount: content.split(' ').length,
                readabilityScore: 75,
                sentenceComplexity: 3.2,
                vocabularyDiversity: 0.68,
                emotionalTone: 'Professional',
                academicLevel: 'College',
                engagementScore: 82
            };

            setFeedbacks(sampleFeedbacks);
            setMetrics(sampleMetrics);
        }
    }, [content, selectedText]);

    const filteredFeedbacks = feedbacks.filter(feedback =>
        activeCategory === 'all' || feedback.category === activeCategory
    );

    const speakText = (text: string) => {
        if (voiceEnabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    };

    const CategoryFilter = () => (
        <div className="flex space-x-1 mb-4 bg-slate-50 p-1 rounded-lg">
            {[
                { key: 'all', label: 'All', icon: Layers },
                { key: 'technical', label: 'Technical', icon: Microscope },
                { key: 'creative', label: 'Creative', icon: Sparkles },
                { key: 'academic', label: 'Academic', icon: BookOpen },
                { key: 'style', label: 'Style', icon: PenTool }
            ].map(({ key, label, icon: Icon }) => (
                <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveCategory(key as any)}
                    className={cn(
                        "flex-1 text-xs",
                        activeCategory === key
                            ? "bg-white shadow-sm text-indigo-600"
                            : "text-slate-600 hover:text-slate-900"
                    )}
                >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                </Button>
            ))}
        </div>
    );

    const FeedbackCard = ({ feedback }: { feedback: AIFeedback }) => {
        const priorityColors = {
            low: 'border-l-green-500 bg-green-50',
            medium: 'border-l-yellow-500 bg-yellow-50',
            high: 'border-l-orange-500 bg-orange-50',
            critical: 'border-l-red-500 bg-red-50'
        };

        const typeIcons = {
            grammar: CheckCircle,
            style: PenTool,
            structure: Layers,
            clarity: Lightbulb,
            engagement: Star,
            research: BookOpen,
            flow: TrendingUp,
            tone: Volume2
        };

        const Icon = typeIcons[feedback.type] || Lightbulb;

        return (
            <Card className={cn("border-l-4 transition-all hover:shadow-md", priorityColors[feedback.priority])}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Icon className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">{feedback.title}</CardTitle>
                                <div className="flex items-center space-x-2 mt-1">
                                    <Badge
                                        variant={feedback.priority === 'critical' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {feedback.priority}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {feedback.type}
                                    </Badge>
                                    <div className="flex items-center space-x-1">
                                        <Star className="w-3 h-3 text-amber-500" />
                                        <span className="text-xs text-slate-500">
                                            {Math.round(feedback.confidence * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakText(feedback.suggestion)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Headphones className="w-3 h-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 mb-3">{feedback.description}</p>

                    {feedback.selectedText && (
                        <div className="bg-white p-3 rounded-lg border mb-3">
                            <p className="text-xs text-slate-500 mb-1">Selected text:</p>
                            <p className="text-sm italic">"{feedback.selectedText}"</p>
                        </div>
                    )}

                    <div className="bg-indigo-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-indigo-900 mb-1">AI Suggestion:</p>
                        <p className="text-sm text-indigo-800">{feedback.suggestion}</p>
                    </div>

                    {feedback.improvedVersion && showAdvanced && (
                        <div className="bg-emerald-50 p-3 rounded-lg mb-3">
                            <p className="text-xs text-emerald-700 mb-1">Improved version:</p>
                            <p className="text-sm text-emerald-800 italic">"{feedback.improvedVersion}"</p>
                        </div>
                    )}

                    {feedback.aiReasoning && showAdvanced && (
                        <div className="bg-slate-50 p-3 rounded-lg mb-3">
                            <p className="text-xs text-slate-600 mb-1">AI Reasoning:</p>
                            <p className="text-xs text-slate-700">{feedback.aiReasoning}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                                {feedback.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {feedback.category}
                            </Badge>
                        </div>
                        <div className="flex space-x-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onApplyFeedback(feedback)}
                                className="text-xs"
                            >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Apply
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs">
                                <Copy className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs">
                                <Bookmark className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const WritingMetricsPanel = () => {
        if (!metrics) return null;

        return (
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
                        Writing Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-slate-500">Readability</p>
                            <div className="flex items-center space-x-2">
                                <Progress value={metrics.readabilityScore} className="flex-1 h-2" />
                                <span className="text-sm font-medium">{metrics.readabilityScore}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Engagement</p>
                            <div className="flex items-center space-x-2">
                                <Progress value={metrics.engagementScore} className="flex-1 h-2" />
                                <span className="text-sm font-medium">{metrics.engagementScore}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Vocabulary</p>
                            <div className="flex items-center space-x-2">
                                <Progress value={metrics.vocabularyDiversity * 100} className="flex-1 h-2" />
                                <span className="text-sm font-medium">{Math.round(metrics.vocabularyDiversity * 100)}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Word Count</p>
                            <p className="text-sm font-medium">{metrics.wordCount.toLocaleString()}</p>
                        </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-slate-500">Tone</p>
                            <p className="font-medium">{metrics.emotionalTone}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Level</p>
                            <p className="font-medium">{metrics.academicLevel}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Crown className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Premium AI Assistant</h3>
                            <p className="text-xs text-slate-500">Advanced writing analysis</p>
                        </div>
                    </div>
                    <div className="flex space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={cn("text-xs", voiceEnabled && "bg-indigo-50 text-indigo-600")}
                        >
                            <Volume2 className="w-3 h-3 mr-1" />
                            Voice
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs"
                        >
                            <Settings className="w-3 h-3 mr-1" />
                            Advanced
                        </Button>
                    </div>
                </div>

                <CategoryFilter />
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    <WritingMetricsPanel />

                    {/* Feedback Cards */}
                    {isAnalyzing ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-slate-600">AI is analyzing your writing...</p>
                            <p className="text-sm text-slate-500">This may take a few moments</p>
                        </div>
                    ) : filteredFeedbacks.length > 0 ? (
                        <div className="space-y-3">
                            {filteredFeedbacks.map((feedback) => (
                                <div key={feedback.id} className="group">
                                    <FeedbackCard feedback={feedback} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Telescope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No feedback available</p>
                            <p className="text-sm text-slate-400">
                                {activeCategory === 'all'
                                    ? 'Start writing to get AI suggestions'
                                    : `No ${activeCategory} feedback found`
                                }
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default PremiumAIWritingAssistant;