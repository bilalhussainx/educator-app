import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AIInlineCommentsService, { BulletPointAnalysis, JobDescriptionContext } from '../services/aiInlineCommentsService';

interface AIInlineCommentsPanelProps {
    resumeContent: string;
    jobDescription?: JobDescriptionContext;
    onApplySuggestion: (originalText: string, improvedText: string) => void;
    isVisible: boolean;
    onToggle: () => void;
}

const AIInlineCommentsPanel: React.FC<AIInlineCommentsPanelProps> = ({
    resumeContent,
    jobDescription,
    onApplySuggestion,
    isVisible,
    onToggle
}) => {
    const [analyses, setAnalyses] = useState<BulletPointAnalysis[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<BulletPointAnalysis | null>(null);

    useEffect(() => {
        if (isVisible && resumeContent) {
            analyzeContent();
        }
    }, [isVisible, resumeContent, jobDescription]);

    const analyzeContent = async () => {
        setIsAnalyzing(true);
        try {
            const results = await AIInlineCommentsService.analyzeBulletPoints(resumeContent, jobDescription);
            setAnalyses(results);
            console.log('🤖 AI Analysis completed:', results.length, 'bullet points analyzed');
        } catch (error) {
            console.error('AI Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'quantification': return '📊';
            case 'action-verbs': return '⚡';
            case 'clarity': return '💡';
            case 'keywords': return '🎯';
            case 'relevance': return '🔗';
            default: return '✨';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-600';
        if (score >= 6) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (!isVisible) {
        return (
            <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
                <Button
                    onClick={onToggle}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                    size="sm"
                >
                    🤖 AI Comments
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">🤖 AI Resume Coach</h3>
                    <Button variant="ghost" size="sm" onClick={onToggle}>✕</Button>
                </div>
                <p className="text-sm text-gray-600">
                    Intelligent suggestions to improve your bullet points
                </p>
                {jobDescription && (
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                        🎯 Optimizing for: <strong>{jobDescription.title}</strong> at {jobDescription.company}
                    </div>
                )}
                <Button
                    onClick={analyzeContent}
                    disabled={isAnalyzing || !resumeContent}
                    className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                    size="sm"
                >
                    {isAnalyzing ? '🔄 Analyzing...' : '🚀 Analyze Resume'}
                </Button>
            </div>

            {/* Analysis Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {analyses.length === 0 && !isAnalyzing && (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🤖</div>
                        <p>Click "Analyze Resume" to get AI-powered suggestions</p>
                    </div>
                )}

                {analyses.map((analysis) => (
                    <Card
                        key={analysis.id}
                        className={`cursor-pointer transition-all ${
                            selectedAnalysis?.id === analysis.id ? 'ring-2 ring-purple-500' : ''
                        }`}
                        onClick={() => setSelectedAnalysis(analysis)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {analysis.section}
                                    </Badge>
                                    <span className={`font-bold ${getScoreColor(analysis.score)}`}>
                                        {analysis.score}/10
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {analysis.suggestions.length} suggestions
                                </div>
                            </div>
                            {analysis.jobTitle && (
                                <div className="text-xs text-blue-600 font-medium">
                                    💼 {analysis.jobTitle}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-sm text-gray-700 mb-3 p-2 bg-gray-50 rounded">
                                "{analysis.originalText}"
                            </div>

                            {analysis.missingElements.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-medium text-red-600 mb-1">Missing:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analysis.missingElements.map((element, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs text-red-600">
                                                {element}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {analysis.suggestions.slice(0, 2).map((suggestion, idx) => (
                                    <div key={idx} className="border rounded p-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span>{getCategoryIcon(suggestion.category)}</span>
                                            <Badge className={`text-xs ${getImpactColor(suggestion.impact)}`}>
                                                {suggestion.impact} impact
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-gray-600 mb-2">
                                            {suggestion.reason}
                                        </div>
                                        <div className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-500">
                                            "{suggestion.improved}"
                                        </div>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onApplySuggestion(analysis.originalText, suggestion.improved);
                                            }}
                                            size="sm"
                                            className="w-full mt-2 bg-green-600 hover:bg-green-700"
                                        >
                                            ✅ Apply Suggestion
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {analysis.suggestions.length > 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-2 text-purple-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAnalysis(analysis);
                                    }}
                                >
                                    View {analysis.suggestions.length - 2} more suggestions
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Summary Stats */}
            {analyses.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                    <div className="text-sm font-medium mb-2">📊 Analysis Summary</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                            <div className="font-bold text-lg text-purple-600">
                                {analyses.length}
                            </div>
                            <div className="text-gray-600">Bullets</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg text-orange-600">
                                {analyses.reduce((sum, a) => sum + a.suggestions.length, 0)}
                            </div>
                            <div className="text-gray-600">Suggestions</div>
                        </div>
                        <div className="text-center">
                            <div className={`font-bold text-lg ${getScoreColor(
                                analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length
                            )}`}>
                                {Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length)}
                            </div>
                            <div className="text-gray-600">Avg Score</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIInlineCommentsPanel;