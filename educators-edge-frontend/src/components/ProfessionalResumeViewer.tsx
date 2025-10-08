import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Download,
    Eye,
    Star,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Brain,
    FileText,
    Target,
    Users,
    Award,
    Zap,
    BarChart3,
    RefreshCw
} from 'lucide-react';

interface ProfessionalResumeViewerProps {
    result: any; // DocumentProcessingResult
    onTemplateSelect?: (templateId: string) => void;
    onApplySuggestion?: (suggestion: any) => void;
}

const ProfessionalResumeViewer: React.FC<ProfessionalResumeViewerProps> = ({
    result,
    onTemplateSelect,
    onApplySuggestion
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [showTemplatePreview, setShowTemplatePreview] = useState(false);

    const aiAnalysis = result.aiAnalysis;
    const professionalTemplates = result.professionalTemplates || [];

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getGradeColor = (grade: string) => {
        if (['A+', 'A'].includes(grade)) return 'bg-green-100 text-green-800';
        if (['B+', 'B'].includes(grade)) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const getPriorityColor = (type: string) => {
        switch (type) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'important': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
            {/* Header with Overall Score */}
            {aiAnalysis && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-full shadow-md">
                                    <Brain className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold">Resume Analysis</CardTitle>
                                    <p className="text-gray-600 dark:text-gray-300">AI-powered professional assessment</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-4xl font-bold ${getScoreColor(aiAnalysis.overall.score)}`}>
                                    {aiAnalysis.overall.score}
                                </div>
                                <Badge className={getGradeColor(aiAnalysis.overall.grade)} variant="secondary">
                                    Grade {aiAnalysis.overall.grade}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-semibold text-green-600 mb-2">✅ Strengths</h4>
                                <ul className="text-sm space-y-1">
                                    {aiAnalysis.overall.strengths.map((strength: string, idx: number) => (
                                        <li key={idx} className="text-gray-700 dark:text-gray-300">• {strength}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-red-600 mb-2">⚠️ Areas to Improve</h4>
                                <ul className="text-sm space-y-1">
                                    {aiAnalysis.overall.weaknesses.map((weakness: string, idx: number) => (
                                        <li key={idx} className="text-gray-700 dark:text-gray-300">• {weakness}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-600 mb-2">📊 Market Readiness</h4>
                                <div className="text-sm space-y-1">
                                    <p><strong>Level:</strong> {aiAnalysis.marketReadiness.level}</p>
                                    <p><strong>Salary Range:</strong> {aiAnalysis.marketReadiness.estimatedSalaryRange}</p>
                                    <div className="flex gap-1 flex-wrap">
                                        {aiAnalysis.marketReadiness.industries.map((industry: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="text-xs">{industry}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Professional Templates
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Detailed Analysis
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Recommendations
                    </TabsTrigger>
                    <TabsTrigger value="keywords" className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        ATS Optimization
                    </TabsTrigger>
                </TabsList>

                {/* Professional Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-gold-500" />
                                Industry-Standard Templates
                            </CardTitle>
                            <p className="text-gray-600 dark:text-gray-300">
                                Professional templates designed by hiring experts and optimized for ATS systems
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {professionalTemplates.map((template: any, idx: number) => (
                                    <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                                {template.atsOptimized && (
                                                    <Badge className="bg-green-100 text-green-800">ATS Optimized</Badge>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="w-fit capitalize">
                                                {template.category}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-32 flex items-center justify-center">
                                                <FileText className="w-16 h-16 text-gray-400" />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {template.features.slice(0, 3).map((feature: string, featureIdx: number) => (
                                                        <Badge key={featureIdx} variant="secondary" className="text-xs">
                                                            {feature}
                                                        </Badge>
                                                    ))}
                                                </div>

                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    Best for: {template.industry.slice(0, 2).join(', ')}
                                                    {template.industry.length > 2 && ' +more'}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedTemplate(template.id);
                                                        onTemplateSelect?.(template.id);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Preview
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Detailed Analysis Tab */}
                <TabsContent value="analysis" className="space-y-4">
                    {aiAnalysis && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {Object.entries(aiAnalysis.sections).map(([sectionName, sectionData]: [string, any]) => (
                                <Card key={sectionName}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="capitalize">{sectionName}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`${getScoreColor(sectionData.score)} bg-transparent border`}>
                                                    {sectionData.score}/100
                                                </Badge>
                                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                                    sectionData.impact === 'high' ? 'bg-red-100 text-red-800' :
                                                    sectionData.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {sectionData.impact} impact
                                                </div>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Progress value={sectionData.score} className="w-full" />

                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {sectionData.feedback}
                                        </p>

                                        {sectionData.suggestions.length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm mb-2">💡 Suggestions:</h5>
                                                <ul className="text-sm space-y-1">
                                                    {sectionData.suggestions.map((suggestion: string, idx: number) => (
                                                        <li key={idx} className="text-gray-600 dark:text-gray-300">
                                                            • {suggestion}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {sectionData.issues.length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm mb-2 text-red-600">⚠️ Issues:</h5>
                                                <ul className="text-sm space-y-1">
                                                    {sectionData.issues.map((issue: string, idx: number) => (
                                                        <li key={idx} className="text-red-600">
                                                            • {issue}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-500 pt-2 border-t">
                                            Word count: {sectionData.wordCount}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-4">
                    {aiAnalysis?.recommendations && (
                        <div className="space-y-4">
                            {aiAnalysis.recommendations.map((rec: any, idx: number) => (
                                <Card key={idx} className={`border-l-4 ${getPriorityColor(rec.type)}`}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    {rec.type === 'critical' ? (
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    ) : rec.type === 'important' ? (
                                                        <TrendingUp className="w-5 h-5 text-yellow-600" />
                                                    ) : (
                                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                                    )}
                                                    {rec.title}
                                                </CardTitle>
                                                <Badge className={getPriorityColor(rec.type)} variant="outline">
                                                    {rec.type} • {rec.category}
                                                </Badge>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => onApplySuggestion?.(rec)}
                                                className="ml-4"
                                            >
                                                Apply Fix
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-gray-700 dark:text-gray-300">{rec.description}</p>

                                        {rec.example && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-400">
                                                <h5 className="font-medium text-sm mb-1">💡 Example:</h5>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{rec.example}"</p>
                                            </div>
                                        )}

                                        <div className="text-sm">
                                            <strong>Impact:</strong> <span className="text-gray-600 dark:text-gray-300">{rec.impact}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ATS Optimization Tab */}
                <TabsContent value="keywords" className="space-y-4">
                    {aiAnalysis?.keywords && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-green-600" />
                                        ATS Compatibility Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`text-3xl font-bold ${getScoreColor(aiAnalysis.keywords.atsScore)}`}>
                                            {aiAnalysis.keywords.atsScore}%
                                        </div>
                                        <div className="flex-1">
                                            <Progress value={aiAnalysis.keywords.atsScore} className="w-full" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold text-green-600 mb-3">✅ Keywords Found ({aiAnalysis.keywords.industry.length})</h4>
                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                                {aiAnalysis.keywords.industry.map((keyword: string, idx: number) => (
                                                    <Badge key={idx} className="bg-green-100 text-green-800">
                                                        {keyword}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-red-600 mb-3">❌ Missing Keywords ({aiAnalysis.keywords.missing.length})</h4>
                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                                {aiAnalysis.keywords.missing.map((keyword: string, idx: number) => (
                                                    <Badge key={idx} className="bg-red-100 text-red-800" variant="outline">
                                                        {keyword}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4 className="font-semibold text-blue-600 mb-3">💡 Keyword Suggestions</h4>
                                        <ul className="space-y-2">
                                            {aiAnalysis.keywords.suggestions.map((suggestion: string, idx: number) => (
                                                <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProfessionalResumeViewer;