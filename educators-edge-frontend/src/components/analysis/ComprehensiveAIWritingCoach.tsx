/**
 * Comprehensive AI Writing Coach
 *
 * A revolutionary, user-friendly AI analysis system that provides:
 * - Full document analysis from start to finish
 * - Beautiful inline comment rendering
 * - One-click suggestion application
 * - 30-50+ comprehensive comments
 * - Clean, intuitive interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Sparkles,
    CheckCircle,
    X,
    Lightbulb,
    TrendingUp,
    FileText,
    Zap,
    Brain,
    AlertCircle,
    Check,
    Loader2,
    ChevronRight,
    Eye,
    Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

interface AIComment {
    id: string;
    highlightedText: string;
    startOffset: number;
    endOffset: number;
    category: string;
    severity: 'critical' | 'important' | 'suggestion' | 'positive';
    message: string;
    suggestion: string;
    replacementText?: string;
    explanation: string;
    confidence: number;
    applied?: boolean;
}

interface DocumentAnalysis {
    overallScore: number;
    strengths: string[];
    improvements: string[];
    structure: {
        hasIntroduction: boolean;
        hasBodyParagraphs: boolean;
        hasConclusion: boolean;
        flowScore: number;
    };
    tone: {
        clarity: number;
        engagement: number;
        professionalism: number;
    };
}

interface ComprehensiveAIWritingCoachProps {
    documentContent: string;
    onApplySuggestion: (originalText: string, replacementText: string, startOffset?: number, endOffset?: number) => void;
    isVisible: boolean;
    onClose: () => void;
    sessionId?: number;
}

const ComprehensiveAIWritingCoach: React.FC<ComprehensiveAIWritingCoachProps> = ({
    documentContent,
    onApplySuggestion,
    isVisible,
    onClose,
    sessionId
}) => {
    const [comments, setComments] = useState<AIComment[]>([]);
    const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [selectedComment, setSelectedComment] = useState<AIComment | null>(null);
    const [activeTab, setActiveTab] = useState('comments');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');

    // Auto-start analysis when panel opens
    useEffect(() => {
        if (isVisible && comments.length === 0 && documentContent.length >= 50 && !isAnalyzing) {
            startAnalysis();
        }
    }, [isVisible]);

    const startAnalysis = async () => {
        if (documentContent.length < 50) {
            toast.error('Please write at least 50 characters for analysis');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisProgress(0);

        try {
            // Simulate progressive analysis
            const progressInterval = setInterval(() => {
                setAnalysisProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            const response = await apiClient.post('/api/ai-coach/comprehensive-analysis', {
                documentContent,
                sessionId,
                analysisType: 'full_document'
            });

            clearInterval(progressInterval);
            setAnalysisProgress(100);

            if (response.data.success) {
                setComments(response.data.comments);
                setAnalysis(response.data.analysis);
                toast.success(`Analysis complete! Found ${response.data.comments.length} insights`);
            } else {
                throw new Error('Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
            setTimeout(() => setAnalysisProgress(0), 2000);
        }
    };

    const applySuggestion = (comment: AIComment) => {
        if (!comment.replacementText) {
            toast.error('No replacement text available');
            return;
        }

        onApplySuggestion(
            comment.highlightedText,
            comment.replacementText,
            comment.startOffset,
            comment.endOffset
        );

        setComments(prev =>
            prev.map(c => c.id === comment.id ? { ...c, applied: true } : c)
        );

        toast.success('Suggestion applied!');
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'important':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'suggestion':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'positive':
                return 'bg-green-100 text-green-800 border-green-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <AlertCircle className="w-4 h-4 text-red-600" />;
            case 'important':
                return <TrendingUp className="w-4 h-4 text-orange-600" />;
            case 'suggestion':
                return <Lightbulb className="w-4 h-4 text-blue-600" />;
            case 'positive':
                return <Sparkles className="w-4 h-4 text-green-600" />;
            default:
                return <Eye className="w-4 h-4" />;
        }
    };

    const filteredComments = comments.filter(c =>
        filterSeverity === 'all' || c.severity === filterSeverity
    );

    const unreadComments = comments.filter(c => !c.applied).length;

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">AI Writing Coach</h2>
                                <p className="text-sm text-gray-600">Comprehensive document analysis</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isAnalyzing && comments.length > 0 && (
                                <Button onClick={startAnalysis} variant="outline" size="sm">
                                    <Zap className="w-4 h-4 mr-2" />
                                    Re-analyze
                                </Button>
                            )}
                            <Button onClick={onClose} variant="ghost" size="sm">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isAnalyzing && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing your writing...
                                </span>
                                <span className="font-medium text-indigo-600">{analysisProgress}%</span>
                            </div>
                            <Progress value={analysisProgress} className="h-2" />
                        </div>
                    )}

                    {/* Quick Stats */}
                    {!isAnalyzing && comments.length > 0 && (
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="text-2xl font-bold text-indigo-600">{comments.length}</div>
                                <div className="text-xs text-gray-600">Total Insights</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="text-2xl font-bold text-green-600">
                                    {comments.filter(c => c.applied).length}
                                </div>
                                <div className="text-xs text-gray-600">Applied</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="text-2xl font-bold text-orange-600">
                                    {comments.filter(c => c.severity === 'critical' || c.severity === 'important').length}
                                </div>
                                <div className="text-xs text-gray-600">High Priority</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="text-2xl font-bold text-blue-600">
                                    {analysis ? Math.round(analysis.overallScore) : 0}%
                                </div>
                                <div className="text-xs text-gray-600">Overall Score</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-6 pt-4 border-b">
                            <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="comments" className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    Comments ({comments.length})
                                </TabsTrigger>
                                <TabsTrigger value="analysis" className="flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    Full Analysis
                                </TabsTrigger>
                                <TabsTrigger value="quickfixes" className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Quick Fixes ({unreadComments})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {/* Comments Tab */}
                            <TabsContent value="comments" className="h-full m-0">
                                <div className="h-full flex flex-col">
                                    {/* Filter Bar */}
                                    {comments.length > 0 && (
                                        <div className="px-6 py-3 border-b bg-gray-50">
                                            <div className="flex gap-2">
                                                {['all', 'critical', 'important', 'suggestion', 'positive'].map(severity => (
                                                    <Button
                                                        key={severity}
                                                        onClick={() => setFilterSeverity(severity)}
                                                        variant={filterSeverity === severity ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="capitalize"
                                                    >
                                                        {severity}
                                                        {severity !== 'all' && (
                                                            <Badge variant="secondary" className="ml-2">
                                                                {comments.filter(c => c.severity === severity).length}
                                                            </Badge>
                                                        )}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Comments List */}
                                    <ScrollArea className="flex-1 px-6">
                                        <div className="py-4 space-y-3">
                                            {isAnalyzing && comments.length === 0 && (
                                                <div className="text-center py-12">
                                                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
                                                    <p className="text-gray-600">Analyzing your document...</p>
                                                    <p className="text-sm text-gray-500 mt-2">
                                                        This may take 10-30 seconds
                                                    </p>
                                                </div>
                                            )}

                                            {!isAnalyzing && filteredComments.length === 0 && comments.length === 0 && (
                                                <div className="text-center py-12">
                                                    <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                    <p className="text-gray-600 mb-4">Ready to analyze your writing</p>
                                                    <Button onClick={startAnalysis} className="bg-indigo-600 hover:bg-indigo-700">
                                                        <Brain className="w-4 h-4 mr-2" />
                                                        Start Analysis
                                                    </Button>
                                                </div>
                                            )}

                                            {!isAnalyzing && filteredComments.length === 0 && comments.length > 0 && (
                                                <div className="text-center py-12">
                                                    <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                    <p className="text-gray-600">No comments match this filter</p>
                                                </div>
                                            )}

                                            {filteredComments.map((comment, index) => (
                                                <Card
                                                    key={comment.id}
                                                    className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${
                                                        comment.applied ? 'opacity-60 bg-gray-50' : 'hover:border-l-indigo-500'
                                                    } ${
                                                        comment.severity === 'critical'
                                                            ? 'border-l-red-500'
                                                            : comment.severity === 'important'
                                                            ? 'border-l-orange-500'
                                                            : comment.severity === 'positive'
                                                            ? 'border-l-green-500'
                                                            : 'border-l-blue-500'
                                                    }`}
                                                    onClick={() => setSelectedComment(
                                                        selectedComment?.id === comment.id ? null : comment
                                                    )}
                                                >
                                                    <CardHeader className="p-4 pb-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-2 flex-1">
                                                                {getSeverityIcon(comment.severity)}
                                                                <Badge className={`text-xs ${getSeverityColor(comment.severity)}`}>
                                                                    {comment.severity}
                                                                </Badge>
                                                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {comment.category}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {comment.applied && (
                                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0 space-y-3">
                                                        {/* Highlighted Text */}
                                                        <div className="bg-yellow-50 border-l-2 border-yellow-400 p-3 rounded">
                                                            <p className="text-xs text-gray-500 mb-1">Original text:</p>
                                                            <p className="text-sm italic text-gray-800">
                                                                "{comment.highlightedText.substring(0, 150)}
                                                                {comment.highlightedText.length > 150 ? '...' : ''}"
                                                            </p>
                                                        </div>

                                                        {/* Message */}
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                                💡 Suggestion:
                                                            </p>
                                                            <p className="text-sm text-gray-700">{comment.message}</p>
                                                        </div>

                                                        {/* Replacement Text */}
                                                        {comment.replacementText && (
                                                            <div className="bg-green-50 border-l-2 border-green-500 p-3 rounded">
                                                                <p className="text-xs text-gray-500 mb-1">Recommended:</p>
                                                                <p className="text-sm font-medium text-green-900">
                                                                    "{comment.replacementText.substring(0, 150)}
                                                                    {comment.replacementText.length > 150 ? '...' : ''}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Explanation (Expandable) */}
                                                        {selectedComment?.id === comment.id && (
                                                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                                                <p className="text-xs font-medium text-blue-800 mb-1">
                                                                    Why this helps:
                                                                </p>
                                                                <p className="text-sm text-blue-900">{comment.explanation}</p>
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        <div className="flex gap-2 pt-2">
                                                            {comment.replacementText && !comment.applied && (
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        applySuggestion(comment);
                                                                    }}
                                                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                                                                    size="sm"
                                                                >
                                                                    <Check className="w-4 h-4 mr-2" />
                                                                    Apply Suggestion
                                                                </Button>
                                                            )}
                                                            {selectedComment?.id !== comment.id && (
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedComment(comment);
                                                                    }}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    See explanation
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </TabsContent>

                            {/* Full Analysis Tab */}
                            <TabsContent value="analysis" className="h-full m-0">
                                <ScrollArea className="h-full px-6 py-4">
                                    {analysis ? (
                                        <div className="space-y-6">
                                            {/* Overall Score */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                                                        Overall Assessment
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-medium">Document Quality</span>
                                                            <span className="text-2xl font-bold text-indigo-600">
                                                                {Math.round(analysis.overallScore)}%
                                                            </span>
                                                        </div>
                                                        <Progress value={analysis.overallScore} className="h-3" />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4 pt-4">
                                                        <div>
                                                            <div className="text-sm text-gray-600 mb-1">Clarity</div>
                                                            <Progress value={analysis.tone.clarity * 100} className="h-2" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-600 mb-1">Engagement</div>
                                                            <Progress value={analysis.tone.engagement * 100} className="h-2" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-600 mb-1">Professionalism</div>
                                                            <Progress value={analysis.tone.professionalism * 100} className="h-2" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Strengths */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Sparkles className="w-5 h-5 text-green-600" />
                                                        Strengths
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2">
                                                        {analysis.strengths.map((strength, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                                <span className="text-sm text-gray-700">{strength}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>

                                            {/* Areas for Improvement */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                                        Areas for Improvement
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2">
                                                        {analysis.improvements.map((improvement, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <ChevronRight className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                                <span className="text-sm text-gray-700">{improvement}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>

                                            {/* Structure Analysis */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="w-5 h-5 text-blue-600" />
                                                        Document Structure
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                            <span className="text-sm text-gray-700">Introduction</span>
                                                            {analysis.structure.hasIntroduction ? (
                                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <X className="w-5 h-5 text-red-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                            <span className="text-sm text-gray-700">Body Paragraphs</span>
                                                            {analysis.structure.hasBodyParagraphs ? (
                                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <X className="w-5 h-5 text-red-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                            <span className="text-sm text-gray-700">Conclusion</span>
                                                            {analysis.structure.hasConclusion ? (
                                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <X className="w-5 h-5 text-red-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                            <span className="text-sm text-gray-700">Flow Score</span>
                                                            <span className="font-bold text-indigo-600">
                                                                {Math.round(analysis.structure.flowScore * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-600">Start analysis to see full assessment</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            {/* Quick Fixes Tab */}
                            <TabsContent value="quickfixes" className="h-full m-0">
                                <ScrollArea className="h-full px-6 py-4">
                                    <div className="space-y-3">
                                        {comments
                                            .filter(c => !c.applied && c.replacementText)
                                            .map((comment, index) => (
                                                <Card key={comment.id} className="border-l-4 border-l-indigo-500">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className={getSeverityColor(comment.severity)}>
                                                                        {comment.severity}
                                                                    </Badge>
                                                                    <span className="text-sm font-medium">
                                                                        {comment.category}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-700">{comment.message}</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => applySuggestion(comment)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                                                                size="sm"
                                                            >
                                                                <Wand2 className="w-4 h-4 mr-2" />
                                                                Apply Fix
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        {comments.filter(c => !c.applied && c.replacementText).length === 0 && (
                                            <div className="text-center py-12">
                                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                                <p className="text-gray-600">All quick fixes applied!</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveAIWritingCoach;
