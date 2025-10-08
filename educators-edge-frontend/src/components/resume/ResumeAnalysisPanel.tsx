import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import resumeAnalysisService, { JobDescription, ResumeInlineComment } from '../../services/resumeAnalysisService';
import {
    Briefcase,
    FileText,
    Target,
    User,
    Building,
    TrendingUp,
    Zap,
    Brain,
    MessageSquare,
    Copy,
    Check,
    RefreshCw,
    Loader2,
    Send,
    AlertCircle,
    CheckCircle,
    Clock,
    Star,
    Settings
} from 'lucide-react';

interface ResumeAnalysisPanelProps {
    resumeContent: string;
    onContentChange?: (content: string) => void;
    onInlineCommentsGenerated?: (comments: ResumeInlineComment[]) => void;
}

interface AnalysisResult {
    id: string;
    prompt: string;
    response: string;
    timestamp: number;
    isLoading: boolean;
    type: 'optimization' | 'keyword_analysis' | 'role_alignment';
}

const ResumeAnalysisPanel: React.FC<ResumeAnalysisPanelProps> = ({
    resumeContent,
    onContentChange,
    onInlineCommentsGenerated
}) => {
    const [activeTab, setActiveTab] = useState<'job_desc' | 'analysis' | 'suggestions' | 'results'>('job_desc');
    const [jobDescription, setJobDescription] = useState<JobDescription>({
        title: '',
        company: '',
        description: '',
        requirements: [],
        preferredQualifications: [],
        keywords: []
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
    const [inlineComments, setInlineComments] = useState<ResumeInlineComment[]>([]);
    const [matchScore, setMatchScore] = useState<number>(0);
    const [keywordCoverage, setKeywordCoverage] = useState<number>(0);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [liveScore, setLiveScore] = useState<number>(0);
    const [liveStats, setLiveStats] = useState({ words: 0, chars: 0, lines: 0 });
    const [smartPrompts, setSmartPrompts] = useState<string[]>([]);

    // Parse job requirements from text input
    const parseRequirements = (text: string): string[] => {
        return text.split(/[,;\n]/).map(req => req.trim()).filter(req => req.length > 0);
    };

    // Copy to clipboard function
    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(label);
            setTimeout(() => setCopiedText(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Analyze resume against job description
    // Real-time analysis as user types
    useEffect(() => {
        if (resumeContent && resumeContent.trim().length > 50) {
            const words = resumeContent.trim().split(/\s+/).length;
            const chars = resumeContent.length;
            const lines = resumeContent.split('\n').filter(line => line.trim()).length;

            setLiveStats({ words, chars, lines });

            // Quick live scoring
            let score = 0;
            const content = resumeContent.toLowerCase();

            // Basic completeness score
            if (content.includes('@')) score += 15; // Has email
            if (content.match(/\d{3}/)) score += 10; // Has phone
            if (words > 200) score += 20; // Sufficient length
            if (content.includes('experience') || content.includes('work')) score += 15;
            if (content.includes('skills') || content.includes('technical')) score += 15;
            if (content.includes('education') || content.includes('degree')) score += 10;

            // Action verbs bonus
            const actionVerbs = ['led', 'managed', 'developed', 'created', 'improved', 'achieved'];
            if (actionVerbs.some(verb => content.includes(verb))) score += 15;

            setLiveScore(Math.min(score, 100));

            // Generate smart prompts based on content
            generateSmartPrompts(resumeContent);
        } else {
            setLiveStats({ words: 0, chars: 0, lines: 0 });
            setLiveScore(0);
            setSmartPrompts([]);
        }
    }, [resumeContent]);

    const generateSmartPrompts = (content: string) => {
        const prompts: string[] = [];
        const lowerContent = content.toLowerCase();
        const words = content.trim().split(/\s+/).length;

        // Content-specific suggestions
        if (words < 100) {
            prompts.push('📝 Add more detail - aim for 300-500 words total');
        }

        if (!lowerContent.includes('@')) {
            prompts.push('📧 Add your professional email address');
        }

        if (!lowerContent.match(/\d{3}/)) {
            prompts.push('📱 Include your phone number for contact');
        }

        if (!lowerContent.includes('experience') && !lowerContent.includes('work')) {
            prompts.push('💼 Add a Work Experience section with your jobs');
        }

        if (!lowerContent.includes('skills') && !lowerContent.includes('technical')) {
            prompts.push('🔧 Include a Skills section with relevant abilities');
        }

        if (lowerContent.includes('responsible for') || lowerContent.includes('duties included')) {
            prompts.push('💪 Replace weak phrases with strong action verbs (led, developed, achieved)');
        }

        if (!lowerContent.match(/\d+%|\$[\d,]+|\d+\+/)) {
            prompts.push('📊 Add numbers and metrics to quantify your achievements');
        }

        if (words > 200 && !lowerContent.includes('education') && !lowerContent.includes('degree')) {
            prompts.push('🎓 Add your educational background');
        }

        // Advanced suggestions
        if (words > 300) {
            if (!lowerContent.match(/improved|increased|reduced|enhanced|optimized/)) {
                prompts.push('📈 Highlight improvements and results you achieved in previous roles');
            }
        }

        if (words > 400) {
            if (!lowerContent.includes('project') && !lowerContent.includes('initiative')) {
                prompts.push('🛠️ Mention key projects or initiatives you worked on');
            }
        }

        setSmartPrompts(prompts.slice(0, 3)); // Show top 3 most relevant
    };

    const analyzeResume = useCallback(async () => {
        if (!resumeContent || !jobDescription.title || !jobDescription.description) {
            alert('Please provide both resume content and job description details.');
            return;
        }

        setIsAnalyzing(true);

        try {
            const analysisRequest = {
                resumeContent,
                jobDescription,
                analysisType: 'inline_comments' as const,
                targetRole: jobDescription.title
            };

            console.log('🔍 Starting resume analysis...');
            const result = await resumeAnalysisService.analyzeResume(analysisRequest);

            console.log('✅ Analysis complete:', result);

            // Update state with results
            setInlineComments(result.inlineComments);
            setMatchScore(result.overallFeedback.matchScore);
            setKeywordCoverage(result.overallFeedback.keywordCoverage);

            // Notify parent component about inline comments
            if (onInlineCommentsGenerated) {
                onInlineCommentsGenerated(result.inlineComments);
            }

            // Add analysis summary to results
            const summaryResult: AnalysisResult = {
                id: `analysis_${Date.now()}`,
                prompt: `Resume Analysis for ${jobDescription.title} at ${jobDescription.company}`,
                response: generateAnalysisSummary(result),
                timestamp: Date.now(),
                isLoading: false,
                type: 'optimization'
            };

            setAnalysisResults(prev => [summaryResult, ...prev]);

        } catch (error) {
            console.error('❌ Resume analysis error:', error);

            const errorResult: AnalysisResult = {
                id: `error_${Date.now()}`,
                prompt: 'Resume Analysis',
                response: '❌ **Analysis Failed**\n\nUnable to analyze resume at this time. Please check your connection and try again.',
                timestamp: Date.now(),
                isLoading: false,
                type: 'optimization'
            };

            setAnalysisResults(prev => [errorResult, ...prev]);
        } finally {
            setIsAnalyzing(false);
        }
    }, [resumeContent, jobDescription, onInlineCommentsGenerated]);

    // Generate smart suggestions based on analysis
    const generateSmartSuggestion = async (suggestionType: 'keyword_optimization' | 'role_alignment' | 'phrasing_improvement') => {
        if (!resumeContent || inlineComments.length === 0) {
            alert('Please run resume analysis first.');
            return;
        }

        const suggestionId = `suggestion_${suggestionType}_${Date.now()}`;

        // Add loading result
        const loadingResult: AnalysisResult = {
            id: suggestionId,
            prompt: getSuggestionPrompt(suggestionType),
            response: '',
            timestamp: Date.now(),
            isLoading: true,
            type: suggestionType === 'keyword_optimization' ? 'keyword_analysis' : 'role_alignment'
        };

        setAnalysisResults(prev => [loadingResult, ...prev]);

        // Generate specific suggestions based on type
        setTimeout(() => {
            const suggestion = generateSpecificSuggestion(suggestionType);

            setAnalysisResults(prev =>
                prev.map(result =>
                    result.id === suggestionId
                        ? { ...result, response: suggestion, isLoading: false }
                        : result
                )
            );
        }, 1500);
    };

    const generateAnalysisSummary = (result: any) => {
        const { overallFeedback, inlineComments, roleSpecificSuggestions } = result;

        return `## 📊 Resume Analysis Results

### 🎯 **Match Score: ${overallFeedback.matchScore}%**
- **Keyword Coverage:** ${overallFeedback.keywordCoverage}%
- **Inline Comments Generated:** ${inlineComments.length}
- **Analysis Quality:** ${result.success ? 'Complete' : 'Partial (Local Analysis)'}

### ✅ **Strengths Identified:**
${overallFeedback.strengths.map((strength: string) => `- ${strength}`).join('\n') || '- Resume structure is clear and readable'}

### 🎯 **Areas for Improvement:**
${overallFeedback.improvementAreas.map((area: string) => `- ${area}`).join('\n') || '- Consider adding more industry-specific keywords'}

### 🔍 **Missing Keywords:**
${overallFeedback.missingKeywords.slice(0, 5).map((keyword: string) => `- ${keyword}`).join('\n') || '- All major keywords covered'}

### 💡 **Quick Wins:**
1. **High Priority Comments:** ${inlineComments.filter((c: any) => c.severity === 'high').length} items need immediate attention
2. **Role Alignment:** ${inlineComments.filter((c: any) => c.commentType === 'role_alignment').length} role-specific improvements available
3. **Keyword Optimization:** ${inlineComments.filter((c: any) => c.commentType === 'keyword_optimization').length} keyword enhancement opportunities

Click on highlighted text in your resume to see specific suggestions!`;
    };

    const getSuggestionPrompt = (type: string) => {
        switch (type) {
            case 'keyword_optimization':
                return 'Keyword Optimization Suggestions';
            case 'role_alignment':
                return 'Role Alignment Recommendations';
            case 'phrasing_improvement':
                return 'Phrasing Enhancement Ideas';
            default:
                return 'Smart Suggestions';
        }
    };

    const generateSpecificSuggestion = (type: string) => {
        const relevantComments = inlineComments.filter(comment => comment.commentType === type);

        switch (type) {
            case 'keyword_optimization':
                return `## 🔍 Keyword Optimization Strategy

### **Missing High-Impact Keywords:**
${relevantComments.slice(0, 3).map(comment =>
    `- **"${comment.alternatives[0]}"** - ${comment.reasoning}`
).join('\n')}

### **Implementation Tips:**
1. **Skills Section:** Add missing technical keywords naturally
2. **Experience Bullets:** Incorporate industry terminology
3. **Summary:** Include role-specific language from job posting

### **Impact:** Adding these keywords could improve your match score by 15-25%.`;

            case 'role_alignment':
                return `## 🎯 Role Alignment Improvements

### **Title Optimizations:**
${relevantComments.slice(0, 3).map(comment =>
    `- Change **"${comment.originalText}"** → **"${comment.suggestion.split('"')[1]}"**\n  *${comment.reasoning}*`
).join('\n\n')}

### **Why This Matters:**
- Hiring managers scan for role-relevant titles
- ATS systems prioritize matching terminology
- Shows understanding of industry standards

### **Next Steps:** Update these titles throughout your resume for consistency.`;

            case 'phrasing_improvement':
                return `## ✍️ Phrasing Enhancement Recommendations

### **Stronger Action Verbs:**
${relevantComments.slice(0, 3).map(comment =>
    `- **"${comment.originalText}"** → **"${comment.alternatives[0]}"**\n  Impact: ${comment.reasoning}`
).join('\n\n')}

### **Quantification Opportunities:**
- Add specific numbers and percentages where possible
- Include scope (team size, budget, timeline)
- Highlight measurable achievements

### **Result:** These changes will make your accomplishments more compelling and memorable.`;

            default:
                return 'Generating smart suggestions based on your resume analysis...';
        }
    };

    const tabs = [
        { id: 'job_desc', label: 'Job Description', icon: Briefcase },
        { id: 'analysis', label: 'AI Analysis', icon: Brain },
        { id: 'suggestions', label: 'Smart Suggestions', icon: Zap },
        { id: 'results', label: 'Results', icon: TrendingUp }
    ];

    return (
        <div className="w-96 h-full flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-800 rounded-lg border border-blue-200 dark:border-blue-700 shadow-lg">
            {/* Sidebar with Vertical Tabs */}
            <div className="w-16 flex flex-col bg-blue-100 dark:bg-blue-800 border-r border-blue-200 dark:border-blue-700 rounded-l-lg">
                <div className="p-2 border-b border-blue-200 dark:border-blue-700">
                    <Briefcase className="h-5 w-5 text-blue-600 mx-auto" />
                </div>

                <div className="flex-1 py-2 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full p-2 rounded-md transition-all group relative ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-700'
                            }`}
                            title={tab.label}
                        >
                            <tab.icon className="w-4 h-4 mx-auto" />
                            <div className="absolute left-full ml-2 px-2 py-1 bg-blue-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {tab.label}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-2 border-t border-blue-200 dark:border-blue-700">
                    <div className="text-center space-y-1">
                        <Badge variant="outline" className="text-xs text-blue-600 block">
                            <Star className="w-2 h-2 mr-1" />
                            {matchScore > 0 ? `${matchScore}%` : `${liveScore}%`}
                        </Badge>
                        <div className="text-xs text-blue-500">
                            {matchScore > 0 ? 'Job Match' : 'Live Score'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-blue-200 dark:border-blue-700">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-white">
                        {tabs.find(t => t.id === activeTab)?.label || 'Resume Analysis'}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        AI-powered resume optimization
                    </p>
                </div>

                {/* Scrollable Content Area */}
                <ScrollArea className="flex-1 p-3">
                    {activeTab === 'job_desc' && (
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-3">
                                    <h4 className="text-sm font-medium text-blue-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Building className="w-4 h-4 text-blue-500" />
                                        Job Details
                                    </h4>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1">
                                                Job Title *
                                            </label>
                                            <Input
                                                value={jobDescription.title}
                                                onChange={(e) => setJobDescription(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="e.g., Senior Software Engineer"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1">
                                                Company
                                            </label>
                                            <Input
                                                value={jobDescription.company}
                                                onChange={(e) => setJobDescription(prev => ({ ...prev, company: e.target.value }))}
                                                placeholder="e.g., Google, Microsoft"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1">
                                                Job Description *
                                            </label>
                                            <textarea
                                                value={jobDescription.description}
                                                onChange={(e) => setJobDescription(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Paste the full job description here..."
                                                className="w-full h-32 text-xs border border-blue-300 dark:border-blue-600 rounded px-2 py-2 bg-white dark:bg-blue-900 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1">
                                                Key Requirements (one per line)
                                            </label>
                                            <textarea
                                                value={jobDescription.requirements.join('\n')}
                                                onChange={(e) => setJobDescription(prev => ({
                                                    ...prev,
                                                    requirements: parseRequirements(e.target.value)
                                                }))}
                                                placeholder="Python programming&#10;5+ years experience&#10;Machine learning&#10;AWS cloud"
                                                className="w-full h-24 text-xs border border-blue-300 dark:border-blue-600 rounded px-2 py-2 bg-white dark:bg-blue-900 resize-none"
                                            />
                                        </div>

                                        <Button
                                            onClick={analyzeResume}
                                            disabled={isAnalyzing || !jobDescription.title || !jobDescription.description}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Analyzing Resume...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="w-4 h-4 mr-2" />
                                                    Analyze Resume
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="space-y-4">
                            {/* Live Analysis Summary */}
                            {resumeContent && (
                                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                                    <CardContent className="p-3">
                                        <h5 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Live Analysis
                                        </h5>
                                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                            <div className="text-center">
                                                <div className="font-bold text-green-600">{liveStats.words}</div>
                                                <div className="text-green-500">Words</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-blue-600">{liveStats.lines}</div>
                                                <div className="text-blue-500">Sections</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-purple-600">{liveScore}%</div>
                                                <div className="text-purple-500">Quality</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                                                style={{width: `${liveScore}%`}}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                                            {liveScore < 30 ? '🟡 Getting started...' :
                                             liveScore < 60 ? '🟠 Making progress!' :
                                             liveScore < 80 ? '🔵 Looking good!' : '🟢 Excellent!'}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {inlineComments.length > 0 ? (
                                <>
                                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                                        <CardContent className="p-3">
                                            <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Analysis Summary
                                            </h5>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-blue-600 dark:text-blue-400">Match Score:</span>
                                                    <Badge variant={matchScore >= 70 ? "default" : matchScore >= 50 ? "secondary" : "destructive"}>
                                                        {matchScore}%
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-600 dark:text-blue-400">Keywords:</span>
                                                    <Badge variant={keywordCoverage >= 60 ? "default" : "secondary"}>
                                                        {keywordCoverage}%
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-600 dark:text-blue-400">Comments:</span>
                                                    <span className="font-medium">{inlineComments.length}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-600 dark:text-blue-400">High Priority:</span>
                                                    <span className="font-medium text-red-600">
                                                        {inlineComments.filter(c => c.severity === 'high').length}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-3">
                                            <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" />
                                                Inline Comments by Category
                                            </h5>

                                            {['role_alignment', 'keyword_optimization', 'action_verb', 'phrasing_improvement'].map(type => {
                                                const typeComments = inlineComments.filter(c => c.commentType === type);
                                                if (typeComments.length === 0) return null;

                                                return (
                                                    <div key={type} className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
                                                                {type.replace('_', ' ')}
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {typeComments.length}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400">
                                                            Click highlighted text in your resume to see suggestions
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <Brain className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                                        <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                                            No analysis available yet
                                        </p>
                                        <p className="text-xs text-blue-500">
                                            Add job description and run analysis to see AI suggestions
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'suggestions' && (
                        <div className="space-y-4">
                            {/* Real-time Smart Prompts */}
                            {smartPrompts.length > 0 && (
                                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
                                    <CardContent className="p-3">
                                        <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-500" />
                                            💡 Smart Suggestions (Live)
                                        </h4>
                                        <div className="space-y-2">
                                            {smartPrompts.map((prompt, index) => (
                                                <div key={index} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-800">
                                                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300">{prompt}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center">
                                            ✨ These suggestions update as you type!
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardContent className="p-3">
                                    <h4 className="text-sm font-medium text-blue-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-purple-500" />
                                        Advanced AI Analysis
                                    </h4>

                                    <div className="space-y-2">
                                        <Button
                                            onClick={() => generateSmartSuggestion('keyword_optimization')}
                                            disabled={inlineComments.length === 0}
                                            variant="outline"
                                            className="w-full text-xs h-8"
                                        >
                                            <Target className="w-3 h-3 mr-2" />
                                            Keyword Optimization
                                        </Button>

                                        <Button
                                            onClick={() => generateSmartSuggestion('role_alignment')}
                                            disabled={inlineComments.length === 0}
                                            variant="outline"
                                            className="w-full text-xs h-8"
                                        >
                                            <User className="w-3 h-3 mr-2" />
                                            Role Alignment
                                        </Button>

                                        <Button
                                            onClick={() => generateSmartSuggestion('phrasing_improvement')}
                                            disabled={inlineComments.length === 0}
                                            variant="outline"
                                            className="w-full text-xs h-8"
                                        >
                                            <FileText className="w-3 h-3 mr-2" />
                                            Phrasing Enhancement
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {inlineComments.length === 0 && (
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Run resume analysis first to get smart suggestions
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'results' && (
                        <div className="space-y-3">
                            {analysisResults.length > 0 ? (
                                analysisResults.map((result) => (
                                    <Card key={result.id} className="border-l-4 border-blue-500">
                                        <CardContent className="p-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Brain className="w-4 h-4 text-blue-600" />
                                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                        {result.prompt}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(result.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>

                                                {result.isLoading ? (
                                                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                        <span className="text-sm text-blue-700 dark:text-blue-300">
                                                            Generating analysis...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                                                        <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                                                            {result.response.split('\n').map((line, lineIndex) => (
                                                                <div key={lineIndex} className="mb-1">
                                                                    {line.trim() === '' ? <br /> : (
                                                                        <span className={
                                                                            line.startsWith('#') ? 'font-medium text-blue-800 dark:text-blue-200' :
                                                                            line.startsWith('*') || line.startsWith('-') ? 'text-slate-600 dark:text-slate-400' :
                                                                            ''
                                                                        }>
                                                                            {line}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex gap-2 mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => copyToClipboard(result.response, `result-${result.id}`)}
                                                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                                            >
                                                                {copiedText === `result-${result.id}` ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 mr-1" />
                                                                        Copied
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3 mr-1" />
                                                                        Copy
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Analysis results will appear here
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};

export default ResumeAnalysisPanel;