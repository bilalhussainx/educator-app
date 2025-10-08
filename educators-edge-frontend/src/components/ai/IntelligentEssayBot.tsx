import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    Bot, Brain, Wand2, Zap, MessageCircle, CheckCircle, AlertTriangle,
    Lightbulb, Star, Target, Edit3, Copy, RotateCcw, Send, Eye,
    FileText, GraduationCap, Sparkles, Crown, Award, Settings,
    TrendingUp, Microscope, Telescope, Clock, ArrowRight
} from 'lucide-react';

// Enhanced interfaces
interface EssayAnalysis {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    grammarIssues: GrammarIssue[];
    styleIssues: StyleIssue[];
    structureAnalysis: StructureAnalysis;
    readabilityScore: number;
    vocabularyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    tone: 'formal' | 'informal' | 'academic' | 'conversational' | 'persuasive';
}

interface GrammarIssue {
    type: 'spelling' | 'grammar' | 'punctuation' | 'capitalization';
    severity: 'low' | 'medium' | 'high';
    position: { start: number; end: number };
    text: string;
    suggestion: string;
    explanation: string;
}

interface StyleIssue {
    type: 'wordiness' | 'repetition' | 'weak_words' | 'passive_voice' | 'unclear';
    severity: 'low' | 'medium' | 'high';
    position: { start: number; end: number };
    text: string;
    suggestion: string;
    explanation: string;
}

interface StructureAnalysis {
    hasThesis: boolean;
    introductionStrength: number;
    bodyParagraphs: number;
    conclusionStrength: number;
    transitions: number;
    overallFlow: number;
}

interface AIResponse {
    id: string;
    type: 'analysis' | 'suggestion' | 'rewrite' | 'expansion' | 'improvement';
    content: string;
    timestamp: Date;
    confidence: number;
    edits?: Array<{ original: string; improved: string; reason: string }>;
}

interface IntelligentEssayBotProps {
    content: string;
    selectedText?: string;
    onContentChange: (content: string) => void;
    onTextSelect?: (text: string, position: { start: number; end: number }) => void;
}

const IntelligentEssayBot: React.FC<IntelligentEssayBotProps> = ({
    content,
    selectedText,
    onContentChange,
    onTextSelect
}) => {
    // Core state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
    const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [activeMode, setActiveMode] = useState<'analyze' | 'improve' | 'expand' | 'rewrite'>('analyze');

    // Settings
    const [autoAnalyze, setAutoAnalyze] = useState(true);
    const [analysisDepth, setAnalysisDepth] = useState(3); // 1-5 scale
    const [targetAudience, setTargetAudience] = useState<'academic' | 'general' | 'professional'>('academic');
    const [essayType, setEssayType] = useState<'argumentative' | 'narrative' | 'expository' | 'descriptive'>('argumentative');

    // Initialize with welcome message
    useEffect(() => {
        const welcomeResponse: AIResponse = {
            id: 'welcome',
            type: 'analysis',
            content: `🎯 **Intelligent Essay Bot Ready!**

I'm your advanced writing assistant with powerful features:

📝 **Real-time Analysis** - Get instant feedback on grammar, style, and structure
✨ **Smart Suggestions** - Context-aware improvements and rewrites
🔍 **Deep Review** - Comprehensive analysis with actionable insights
🚀 **Content Enhancement** - Expand ideas and improve clarity

Start writing or paste your essay to begin analysis!`,
            timestamp: new Date(),
            confidence: 1.0
        };
        setAiResponses([welcomeResponse]);
    }, []);

    // Auto-analyze content changes
    useEffect(() => {
        if (autoAnalyze && content.length > 50) {
            const debounceTimer = setTimeout(() => {
                performAnalysis();
            }, 2000);
            return () => clearTimeout(debounceTimer);
        }
    }, [content, autoAnalyze]);

    const performAnalysis = async () => {
        if (!content.trim()) return;

        setIsAnalyzing(true);

        try {
            // Simulate advanced AI analysis
            await new Promise(resolve => setTimeout(resolve, 1500));

            const mockAnalysis: EssayAnalysis = {
                overallScore: calculateOverallScore(content),
                strengths: generateStrengths(content),
                weaknesses: generateWeaknesses(content),
                improvements: generateImprovements(content),
                grammarIssues: findGrammarIssues(content),
                styleIssues: findStyleIssues(content),
                structureAnalysis: analyzeStructure(content),
                readabilityScore: calculateReadability(content),
                vocabularyLevel: assessVocabulary(content),
                tone: detectTone(content)
            };

            setAnalysis(mockAnalysis);

            // Generate analysis response
            const analysisResponse: AIResponse = {
                id: Date.now().toString(),
                type: 'analysis',
                content: generateAnalysisResponse(mockAnalysis),
                timestamp: new Date(),
                confidence: 0.92
            };

            setAiResponses(prev => [...prev, analysisResponse]);

        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUserInput = async () => {
        if (!currentInput.trim()) return;

        const userResponse: AIResponse = {
            id: Date.now().toString(),
            type: 'suggestion',
            content: currentInput,
            timestamp: new Date(),
            confidence: 1.0
        };

        setAiResponses(prev => [...prev, userResponse]);
        setCurrentInput('');

        // Generate contextual AI response
        setTimeout(() => {
            const aiResponse: AIResponse = {
                id: (Date.now() + 1).toString(),
                type: activeMode,
                content: generateContextualResponse(currentInput, activeMode),
                timestamp: new Date(),
                confidence: 0.87,
                edits: generateEdits(currentInput, selectedText || content)
            };
            setAiResponses(prev => [...prev, aiResponse]);
        }, 1000);
    };

    // Analysis helper functions
    const calculateOverallScore = (text: string): number => {
        const wordCount = text.split(/\s+/).length;
        const sentenceCount = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentenceCount;

        let score = 70; // Base score

        if (wordCount >= 300) score += 10;
        if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 25) score += 10;
        if (text.includes('however') || text.includes('furthermore')) score += 5;
        if (text.toLowerCase().includes('thesis') || text.toLowerCase().includes('argument')) score += 5;

        return Math.min(100, score);
    };

    const generateStrengths = (text: string): string[] => {
        const strengths = [];
        if (text.length > 500) strengths.push('Good length and development');
        if (text.includes('However') || text.includes('Furthermore')) strengths.push('Uses transitional phrases effectively');
        if (text.split('\n\n').length >= 3) strengths.push('Well-structured paragraphs');
        if (/[A-Z][a-z]+ (argues|claims|suggests|demonstrates)/.test(text)) strengths.push('Strong academic voice');

        return strengths.length > 0 ? strengths : ['Clear expression of ideas'];
    };

    const generateWeaknesses = (text: string): string[] => {
        const weaknesses = [];
        const wordCount = text.split(/\s+/).length;

        if (wordCount < 250) weaknesses.push('Essay could be longer and more developed');
        if (!text.toLowerCase().includes('thesis') && !text.toLowerCase().includes('argument')) {
            weaknesses.push('Thesis statement could be clearer');
        }
        if (text.split(/[.!?]+/).length < 10) weaknesses.push('Could use more varied sentence structures');
        if ((text.match(/very/gi) || []).length > 3) weaknesses.push('Overuse of weak qualifiers like "very"');

        return weaknesses;
    };

    const generateImprovements = (text: string): string[] => {
        return [
            'Add more specific examples to support your arguments',
            'Strengthen topic sentences in body paragraphs',
            'Use more sophisticated vocabulary where appropriate',
            'Improve transitions between paragraphs',
            'Consider counterarguments to strengthen your position'
        ];
    };

    const findGrammarIssues = (text: string): GrammarIssue[] => {
        const issues: GrammarIssue[] = [];

        // Simple pattern matching for demonstration
        const patterns = [
            { regex: /\bit's\b/g, type: 'grammar' as const, suggestion: 'its', explanation: 'Use "its" for possession, "it\'s" for "it is"' },
            { regex: /\byour\b/g, type: 'grammar' as const, suggestion: 'you\'re', explanation: 'Consider if you mean "you\'re" (you are)' },
            { regex: /\bthere\b/g, type: 'grammar' as const, suggestion: 'their/they\'re', explanation: 'Check if you mean "their" or "they\'re"' }
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                issues.push({
                    type: pattern.type,
                    severity: 'medium',
                    position: { start: match.index, end: match.index + match[0].length },
                    text: match[0],
                    suggestion: pattern.suggestion,
                    explanation: pattern.explanation
                });
            }
        });

        return issues.slice(0, 5); // Limit for demo
    };

    const findStyleIssues = (text: string): StyleIssue[] => {
        const issues: StyleIssue[] = [];

        // Find weak words
        const weakWords = text.match(/\b(very|really|quite|rather)\s+\w+/gi) || [];
        weakWords.forEach((match, index) => {
            const position = text.indexOf(match);
            issues.push({
                type: 'weak_words',
                severity: 'medium',
                position: { start: position, end: position + match.length },
                text: match,
                suggestion: 'Use a stronger, more specific word',
                explanation: 'Weak qualifiers can make writing less impactful'
            });
        });

        return issues.slice(0, 5); // Limit for demo
    };

    const analyzeStructure = (text: string): StructureAnalysis => {
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

        return {
            hasThesis: text.toLowerCase().includes('thesis') || text.toLowerCase().includes('argue'),
            introductionStrength: paragraphs.length > 0 ? Math.min(100, paragraphs[0].length / 2) : 0,
            bodyParagraphs: Math.max(0, paragraphs.length - 2),
            conclusionStrength: paragraphs.length > 2 ? Math.min(100, paragraphs[paragraphs.length - 1].length / 2) : 0,
            transitions: (text.match(/however|furthermore|moreover|therefore|consequently/gi) || []).length,
            overallFlow: Math.min(100, paragraphs.length * 20)
        };
    };

    const calculateReadability = (text: string): number => {
        const sentences = text.split(/[.!?]+/).length;
        const words = text.split(/\s+/).length;
        const avgWordsPerSentence = words / sentences;

        // Simple readability approximation
        if (avgWordsPerSentence < 15) return 85;
        if (avgWordsPerSentence < 20) return 75;
        if (avgWordsPerSentence < 25) return 65;
        return 55;
    };

    const assessVocabulary = (text: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
        const complexWords = text.match(/\b\w{8,}\b/g) || [];
        const totalWords = text.split(/\s+/).length;
        const complexRatio = complexWords.length / totalWords;

        if (complexRatio > 0.3) return 'expert';
        if (complexRatio > 0.2) return 'advanced';
        if (complexRatio > 0.1) return 'intermediate';
        return 'beginner';
    };

    const detectTone = (text: string): 'formal' | 'informal' | 'academic' | 'conversational' | 'persuasive' => {
        if (text.includes('argue') || text.includes('claim') || text.includes('assert')) return 'academic';
        if (text.includes('should') || text.includes('must') || text.includes('need to')) return 'persuasive';
        if (text.includes('I think') || text.includes('you know')) return 'conversational';
        return 'formal';
    };

    const generateAnalysisResponse = (analysis: EssayAnalysis): string => {
        return `📊 **Comprehensive Essay Analysis Complete**

**Overall Score:** ${analysis.overallScore}/100 ${getScoreEmoji(analysis.overallScore)}

**✅ Strengths:**
${analysis.strengths.map(s => `• ${s}`).join('\n')}

**⚠️ Areas for Improvement:**
${analysis.weaknesses.map(w => `• ${w}`).join('\n')}

**📈 Key Metrics:**
• Readability Score: ${analysis.readabilityScore}/100
• Vocabulary Level: ${analysis.vocabularyLevel}
• Tone: ${analysis.tone}
• Structure Score: ${analysis.structureAnalysis.overallFlow}/100

**🎯 Next Steps:**
${analysis.improvements.slice(0, 3).map(i => `• ${i}`).join('\n')}

Would you like me to focus on any specific area for improvement?`;
    };

    const getScoreEmoji = (score: number): string => {
        if (score >= 90) return '🌟';
        if (score >= 80) return '✨';
        if (score >= 70) return '👍';
        if (score >= 60) return '📈';
        return '💪';
    };

    const generateContextualResponse = (input: string, mode: string): string => {
        const inputLower = input.toLowerCase();

        if (mode === 'improve') {
            return `✨ **Improvement Suggestions**

Based on your request, here are specific improvements:

1. **Strengthen Your Thesis**: Make your main argument more specific and debatable
2. **Add Evidence**: Include concrete examples, statistics, or expert opinions
3. **Improve Flow**: Use transitional phrases to connect your ideas
4. **Enhance Vocabulary**: Replace common words with more precise alternatives
5. **Strengthen Conclusion**: Reinforce your main points and their significance

Would you like me to help rewrite any specific section?`;
        }

        if (mode === 'expand') {
            return `🚀 **Content Expansion Ideas**

To develop your essay further:

• **Add a counterargument paragraph** to show you've considered opposing views
• **Include more specific examples** to illustrate your points
• **Expand on the implications** of your argument
• **Add statistical data or research** to support your claims
• **Develop your conclusion** with broader significance

Which section would you like me to help expand?`;
        }

        if (mode === 'rewrite') {
            return `✏️ **Rewriting Assistance**

I can help rewrite sections to:

• Make arguments clearer and stronger
• Improve sentence flow and readability
• Enhance academic tone and style
• Fix grammar and punctuation issues
• Strengthen word choice and vocabulary

Please select the text you'd like me to rewrite, or tell me which paragraph needs attention.`;
        }

        return `💡 **Analysis Insight**

I understand you're asking about: "${input}"

Let me provide targeted feedback based on your essay content and this specific question. I'll analyze the relevant sections and give you actionable suggestions.`;
    };

    const generateEdits = (input: string, text: string): Array<{ original: string; improved: string; reason: string }> => {
        // Mock edit suggestions
        return [
            {
                original: "very important",
                improved: "crucial",
                reason: "More precise and impactful word choice"
            },
            {
                original: "a lot of people",
                improved: "many individuals",
                reason: "More formal and specific language"
            }
        ];
    };

    const AnalysisPanel = () => (
        <div className="space-y-4">
            {analysis && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Essay Analysis
                            <Badge variant="outline">{analysis.overallScore}/100</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h5 className="font-medium text-green-700 mb-2">✅ Strengths</h5>
                                <ul className="text-sm space-y-1">
                                    {analysis.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h5 className="font-medium text-orange-700 mb-2">⚠️ Areas to Improve</h5>
                                <ul className="text-sm space-y-1">
                                    {analysis.weaknesses.map((weakness, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                                            {weakness}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{analysis.readabilityScore}</div>
                                <div className="text-sm text-slate-600">Readability</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{analysis.structureAnalysis.bodyParagraphs}</div>
                                <div className="text-sm text-slate-600">Body Paragraphs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{analysis.structureAnalysis.transitions}</div>
                                <div className="text-sm text-slate-600">Transitions</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveMode('improve')}>
                        <Wand2 className="w-4 h-4 mr-1" />
                        Improve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveMode('expand')}>
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Expand
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveMode('rewrite')}>
                        <Edit3 className="w-4 h-4 mr-1" />
                        Rewrite
                    </Button>
                    <Button variant="outline" size="sm" onClick={performAnalysis}>
                        <Eye className="w-4 h-4 mr-1" />
                        Re-analyze
                    </Button>
                </div>
            </div>
        </div>
    );

    const SettingsPanel = () => (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-2 block">Essay Type</label>
                <Select value={essayType} onValueChange={(value: any) => setEssayType(value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="argumentative">📝 Argumentative</SelectItem>
                        <SelectItem value="narrative">📖 Narrative</SelectItem>
                        <SelectItem value="expository">📊 Expository</SelectItem>
                        <SelectItem value="descriptive">🎨 Descriptive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="text-sm font-medium mb-2 block">Target Audience</label>
                <Select value={targetAudience} onValueChange={(value: any) => setTargetAudience(value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="academic">🎓 Academic</SelectItem>
                        <SelectItem value="general">👥 General Public</SelectItem>
                        <SelectItem value="professional">💼 Professional</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="text-sm font-medium mb-2 block">
                    Analysis Depth: {analysisDepth}/5
                </label>
                <Slider
                    value={[analysisDepth]}
                    onValueChange={([value]) => setAnalysisDepth(value)}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                />
            </div>

            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Auto-analyze</label>
                <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Intelligent Essay Bot</h3>
                        <p className="text-sm text-slate-600">Advanced AI writing assistant</p>
                    </div>
                    {isAnalyzing && (
                        <Badge className="ml-auto bg-blue-100 text-blue-800">
                            <Brain className="w-3 h-3 mr-1 animate-pulse" />
                            Analyzing...
                        </Badge>
                    )}
                </div>
            </div>

            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                <div className="px-4 pt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="chat">💬 Chat</TabsTrigger>
                        <TabsTrigger value="analysis">📊 Analysis</TabsTrigger>
                        <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                    <ScrollArea className="flex-1 p-4">
                        {aiResponses.map((response) => (
                            <div key={response.id} className="mb-4">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                                        <div className="text-sm whitespace-pre-wrap">{response.content}</div>
                                        {response.edits && response.edits.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs font-medium text-slate-600">Suggested Edits:</p>
                                                {response.edits.map((edit, i) => (
                                                    <div key={i} className="text-xs bg-white p-2 rounded border">
                                                        <div className="text-red-600">- {edit.original}</div>
                                                        <div className="text-green-600">+ {edit.improved}</div>
                                                        <div className="text-slate-500 mt-1">{edit.reason}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                                            <span>{response.timestamp.toLocaleTimeString()}</span>
                                            <span>{Math.round(response.confidence * 100)}% confidence</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>

                    <div className="p-4 border-t bg-white">
                        <div className="flex gap-2 mb-3">
                            <Badge
                                variant={activeMode === 'analyze' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setActiveMode('analyze')}
                            >
                                <Microscope className="w-3 h-3 mr-1" />
                                Analyze
                            </Badge>
                            <Badge
                                variant={activeMode === 'improve' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setActiveMode('improve')}
                            >
                                <Wand2 className="w-3 h-3 mr-1" />
                                Improve
                            </Badge>
                            <Badge
                                variant={activeMode === 'expand' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setActiveMode('expand')}
                            >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Expand
                            </Badge>
                            <Badge
                                variant={activeMode === 'rewrite' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setActiveMode('rewrite')}
                            >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Rewrite
                            </Badge>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={currentInput}
                                onChange={(e) => setCurrentInput(e.target.value)}
                                placeholder={`Ask me to ${activeMode} your essay...`}
                                onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                                className="flex-1"
                            />
                            <Button onClick={handleUserInput} disabled={!currentInput.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="analysis" className="flex-1 m-0">
                    <ScrollArea className="h-full p-4">
                        <AnalysisPanel />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="flex-1 m-0">
                    <ScrollArea className="h-full p-4">
                        <SettingsPanel />
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default IntelligentEssayBot;