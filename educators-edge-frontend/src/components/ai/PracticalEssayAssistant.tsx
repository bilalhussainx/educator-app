import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    Bot, Send, Scissors, Plus, Edit3, Check, X, Target, Zap,
    MessageCircle, Lightbulb, AlertTriangle, CheckCircle, Copy,
    RotateCcw, Wand2, FileText, Eye, BookOpen, PenTool,
    ArrowRight, Trash2, Replace, Quote, Sparkles
} from 'lucide-react';

// Types for essay assistance
interface EssayRequirements {
    type: 'argumentative' | 'narrative' | 'expository' | 'descriptive' | 'analytical' | 'persuasive';
    length: number;
    academicLevel: 'high_school' | 'college' | 'graduate' | 'professional';
    subject: string;
    audience: string;
    tone: 'formal' | 'informal' | 'academic' | 'conversational' | 'persuasive';
    citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'Harvard';
}

interface ContextualFeedback {
    id: string;
    type: 'strength' | 'weakness' | 'suggestion' | 'requirement_check' | 'tone_issue';
    section: 'introduction' | 'body' | 'conclusion' | 'overall' | 'paragraph';
    message: string;
    actionable: boolean;
    autoAction?: () => void;
    priority: 'high' | 'medium' | 'low';
}

interface PhraseImprovement {
    original: string;
    suggestions: string[];
    reason: string;
    position: { start: number; end: number };
    confidence: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type: 'general' | 'feedback' | 'suggestion' | 'action' | 'phrase_suggestion';
    actions?: Array<{
        label: string;
        action: () => void;
        type: 'primary' | 'secondary' | 'destructive';
    }>;
    phraseImprovements?: PhraseImprovement[];
}

interface PracticalEssayAssistantProps {
    content: string;
    selectedText?: string;
    onContentChange: (content: string) => void;
    onTextSelect?: (text: string, position: { start: number; end: number }) => void;
}

const PracticalEssayAssistant: React.FC<PracticalEssayAssistantProps> = ({
    content,
    selectedText,
    onContentChange,
    onTextSelect
}) => {
    // State management
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [requirements, setRequirements] = useState<EssayRequirements>({
        type: 'argumentative',
        length: 1000,
        academicLevel: 'college',
        subject: '',
        audience: 'academic',
        tone: 'formal'
    });
    const [feedback, setFeedback] = useState<ContextualFeedback[]>([]);
    const [autoAnalyze, setAutoAnalyze] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize with helpful welcome message
    useEffect(() => {
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: `🎯 **Practical Essay Assistant Ready!**

I'm here to help you write better essays with real, actionable feedback. Here's what I can do:

**📝 Essay Analysis**
• Check if your essay meets requirements
• Analyze tone and style consistency
• Verify argument structure and flow

**✨ Real Improvements**
• Suggest better phrases and word choices
• Help expand or cut sections as needed
• Improve transitions and clarity

**🔧 Practical Actions**
• Replace weak words with stronger alternatives
• Add missing transitions or evidence
• Remove redundant or unclear content

**Get Started:**
1. Set your essay requirements above
2. Paste or write your essay content
3. Ask me specific questions or request analysis

Try asking: "Check my introduction" or "Suggest better phrases for this paragraph"`,
            timestamp: new Date(),
            type: 'general'
        };
        setMessages([welcomeMessage]);
    }, []);

    // Auto-analyze content when it changes
    useEffect(() => {
        if (autoAnalyze && content.length > 100) {
            const debounceTimer = setTimeout(() => {
                performContextualAnalysis();
            }, 3000);
            return () => clearTimeout(debounceTimer);
        }
    }, [content, requirements, autoAnalyze]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const performContextualAnalysis = async () => {
        if (!content.trim()) return;

        setIsProcessing(true);

        try {
            // Simulate real analysis
            await new Promise(resolve => setTimeout(resolve, 1500));

            const newFeedback = analyzeEssayContent(content, requirements);
            setFeedback(newFeedback);

            // Generate contextual chat response
            const analysisMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: generateAnalysisResponse(newFeedback),
                timestamp: new Date(),
                type: 'feedback',
                actions: generateQuickActions(newFeedback)
            };

            setMessages(prev => [...prev, analysisMessage]);

        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Analysis failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const analyzeEssayContent = (text: string, reqs: EssayRequirements): ContextualFeedback[] => {
        const feedback: ContextualFeedback[] = [];
        const wordCount = text.split(/\s+/).length;
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

        // Length check
        if (wordCount < reqs.length * 0.8) {
            feedback.push({
                id: 'length-short',
                type: 'weakness',
                section: 'overall',
                message: `Your essay is ${wordCount} words but should be around ${reqs.length} words. You need about ${reqs.length - wordCount} more words.`,
                actionable: true,
                priority: 'high'
            });
        }

        // Structure analysis
        if (paragraphs.length < 3) {
            feedback.push({
                id: 'structure-basic',
                type: 'weakness',
                section: 'overall',
                message: 'Your essay needs a clear introduction, body paragraphs, and conclusion structure.',
                actionable: true,
                priority: 'high'
            });
        }

        // Tone analysis for academic writing
        if (reqs.tone === 'formal' || reqs.tone === 'academic') {
            const informalWords = text.match(/\b(don't|can't|won't|I think|you know|like|kinda|gonna)\b/gi);
            if (informalWords && informalWords.length > 2) {
                feedback.push({
                    id: 'tone-informal',
                    type: 'tone_issue',
                    section: 'overall',
                    message: `Found ${informalWords.length} informal expressions. Academic essays should use formal language.`,
                    actionable: true,
                    priority: 'medium'
                });
            }
        }

        // Argument strength for argumentative essays
        if (reqs.type === 'argumentative') {
            if (!text.toLowerCase().includes('argument') && !text.toLowerCase().includes('thesis')) {
                feedback.push({
                    id: 'argument-missing',
                    type: 'requirement_check',
                    section: 'introduction',
                    message: 'Argumentative essays need a clear thesis statement. Consider adding one in your introduction.',
                    actionable: true,
                    priority: 'high'
                });
            }
        }

        // Evidence check
        const evidenceWords = text.match(/\b(according to|research shows|studies indicate|data reveals|for example|for instance)\b/gi);
        if (!evidenceWords || evidenceWords.length < 2) {
            feedback.push({
                id: 'evidence-lacking',
                type: 'suggestion',
                section: 'body',
                message: 'Your essay could benefit from more evidence and examples to support your points.',
                actionable: true,
                priority: 'medium'
            });
        }

        // Transition analysis
        const transitions = text.match(/\b(however|furthermore|moreover|therefore|consequently|in addition|on the other hand)\b/gi);
        if (!transitions || transitions.length < paragraphs.length - 1) {
            feedback.push({
                id: 'transitions-weak',
                type: 'suggestion',
                section: 'overall',
                message: 'Add more transition words to improve flow between paragraphs and ideas.',
                actionable: true,
                priority: 'medium'
            });
        }

        return feedback;
    };

    const generateAnalysisResponse = (feedback: ContextualFeedback[]): string => {
        const highPriority = feedback.filter(f => f.priority === 'high');
        const mediumPriority = feedback.filter(f => f.priority === 'medium');

        let response = `📊 **Essay Analysis Complete**\n\n`;

        if (highPriority.length > 0) {
            response += `🔴 **Critical Issues (${highPriority.length}):**\n`;
            highPriority.forEach(f => {
                response += `• ${f.message}\n`;
            });
            response += '\n';
        }

        if (mediumPriority.length > 0) {
            response += `🟡 **Improvements (${mediumPriority.length}):**\n`;
            mediumPriority.forEach(f => {
                response += `• ${f.message}\n`;
            });
            response += '\n';
        }

        if (feedback.length === 0) {
            response += `✅ **Great work!** Your essay structure and content look solid. Ask me for specific improvements or phrase suggestions.\n\n`;
        }

        response += `💡 **Quick Actions Available Below** - Click buttons to apply fixes instantly!`;

        return response;
    };

    const generateQuickActions = (feedback: ContextualFeedback[]) => {
        const actions: Array<{ label: string; action: () => void; type: 'primary' | 'secondary' | 'destructive' }> = [];

        // Add common quick actions based on feedback
        if (feedback.some(f => f.id === 'length-short')) {
            actions.push({
                label: 'Expand Essay',
                action: () => handleQuickAction('expand'),
                type: 'primary'
            });
        }

        if (feedback.some(f => f.id === 'transitions-weak')) {
            actions.push({
                label: 'Add Transitions',
                action: () => handleQuickAction('transitions'),
                type: 'secondary'
            });
        }

        if (feedback.some(f => f.id === 'tone-informal')) {
            actions.push({
                label: 'Fix Tone',
                action: () => handleQuickAction('formalize'),
                type: 'secondary'
            });
        }

        actions.push({
            label: 'Suggest Phrases',
            action: () => handleQuickAction('phrases'),
            type: 'secondary'
        });

        return actions;
    };

    const handleQuickAction = (actionType: string) => {
        switch (actionType) {
            case 'expand':
                suggestExpansions();
                break;
            case 'transitions':
                addTransitions();
                break;
            case 'formalize':
                formalizeLanguage();
                break;
            case 'phrases':
                suggestPhraseImprovements();
                break;
            default:
                break;
        }
    };

    const suggestExpansions = () => {
        const expansionMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🚀 **Expansion Suggestions**

To reach your target word count, consider adding:

**Introduction:**
• Background context on your topic
• Why this topic matters to your audience
• A preview of your main arguments

**Body Paragraphs:**
• More specific examples and evidence
• Counter-arguments and rebuttals
• Detailed explanations of how evidence supports your thesis

**Conclusion:**
• Broader implications of your argument
• Call to action or future research directions
• Restatement of key points with fresh wording

Select a paragraph and ask me "Expand this section" for specific suggestions!`,
            timestamp: new Date(),
            type: 'suggestion'
        };
        setMessages(prev => [...prev, expansionMessage]);
    };

    const addTransitions = () => {
        const paragraphs = content.split('\n\n');
        if (paragraphs.length < 2) return;

        const transitions = [
            'Furthermore, ',
            'In addition to this, ',
            'However, ',
            'On the other hand, ',
            'Consequently, ',
            'Therefore, ',
            'Moreover, '
        ];

        let newContent = paragraphs[0]; // Keep first paragraph as is

        for (let i = 1; i < paragraphs.length; i++) {
            const transition = transitions[Math.floor(Math.random() * transitions.length)];
            newContent += '\n\n' + transition + paragraphs[i];
        }

        onContentChange(newContent);
        toast.success('Added transition words to improve flow!');

        const transitionMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ **Transitions Added!**

I've added transition words to connect your paragraphs better. The transitions help readers follow your logic and improve the overall flow of your essay.

Review the changes and adjust any transitions that don't fit perfectly with your content.`,
            timestamp: new Date(),
            type: 'action'
        };
        setMessages(prev => [...prev, transitionMessage]);
    };

    const formalizeLanguage = () => {
        let newContent = content;
        const replacements = {
            "don't": "do not",
            "can't": "cannot",
            "won't": "will not",
            "I think": "This analysis suggests",
            "you know": "",
            "like": "such as",
            "kinda": "somewhat",
            "gonna": "going to"
        };

        Object.entries(replacements).forEach(([informal, formal]) => {
            const regex = new RegExp(`\\b${informal}\\b`, 'gi');
            newContent = newContent.replace(regex, formal);
        });

        onContentChange(newContent);
        toast.success('Formalized language for academic tone!');

        const formalizeMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `📝 **Language Formalized!**

I've replaced informal expressions with formal academic language:
• Contractions expanded (don't → do not)
• Casual phrases removed or replaced
• Academic tone improved

Your essay now better matches the formal tone requirement.`,
            timestamp: new Date(),
            type: 'action'
        };
        setMessages(prev => [...prev, formalizeMessage]);
    };

    const suggestPhraseImprovements = () => {
        const improvements = findPhraseImprovements(content);

        const phraseMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `💡 **Phrase Improvement Suggestions**

Found ${improvements.length} phrases that could be stronger:`,
            timestamp: new Date(),
            type: 'phrase_suggestion',
            phraseImprovements: improvements
        };
        setMessages(prev => [...prev, phraseMessage]);
    };

    const findPhraseImprovements = (text: string): PhraseImprovement[] => {
        const improvements: PhraseImprovement[] = [];

        const patterns = [
            {
                regex: /\bvery (\w+)\b/gi,
                getSuggestions: (match: RegExpMatchArray) => {
                    const adjective = match[1].toLowerCase();
                    const strongerWords = {
                        'good': ['excellent', 'outstanding', 'superior'],
                        'bad': ['terrible', 'awful', 'dreadful'],
                        'big': ['enormous', 'massive', 'substantial'],
                        'small': ['tiny', 'minimal', 'insignificant'],
                        'important': ['crucial', 'vital', 'essential']
                    };
                    return strongerWords[adjective] || ['extremely ' + adjective, 'highly ' + adjective];
                },
                reason: 'Replace weak qualifiers with stronger, more specific words'
            },
            {
                regex: /\ba lot of\b/gi,
                getSuggestions: () => ['numerous', 'many', 'countless', 'substantial'],
                reason: 'Use more precise quantifiers'
            },
            {
                regex: /\bthing(s)?\b/gi,
                getSuggestions: () => ['factor', 'element', 'aspect', 'component'],
                reason: 'Be more specific than "thing"'
            }
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null && improvements.length < 8) {
                improvements.push({
                    original: match[0],
                    suggestions: pattern.getSuggestions(match),
                    reason: pattern.reason,
                    position: { start: match.index, end: match.index + match[0].length },
                    confidence: 0.85
                });
            }
        });

        return improvements;
    };

    const handleUserMessage = async () => {
        if (!currentInput.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: currentInput,
            timestamp: new Date(),
            type: 'general'
        };

        setMessages(prev => [...prev, userMessage]);
        const input = currentInput;
        setCurrentInput('');
        setIsProcessing(true);

        try {
            // Simulate AI processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = generateContextualResponse(input);
            setMessages(prev => [...prev, response]);

        } catch (error) {
            console.error('Error processing message:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const generateContextualResponse = (input: string): ChatMessage => {
        const inputLower = input.toLowerCase();

        // Handle specific requests
        if (inputLower.includes('introduction') || inputLower.includes('intro')) {
            return generateIntroductionFeedback();
        }

        if (inputLower.includes('conclusion')) {
            return generateConclusionFeedback();
        }

        if (inputLower.includes('expand') || inputLower.includes('longer')) {
            return generateExpansionSuggestions();
        }

        if (inputLower.includes('cut') || inputLower.includes('shorter') || inputLower.includes('remove')) {
            return generateCuttingSuggestions();
        }

        if (inputLower.includes('phrase') || inputLower.includes('word') || inputLower.includes('better')) {
            return generatePhraseSuggestions();
        }

        if (inputLower.includes('tone') || inputLower.includes('formal') || inputLower.includes('academic')) {
            return generateToneFeedback();
        }

        // General helpful response
        return {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I understand you're asking about: "${input}"

Let me help with specific suggestions:

**For analysis:** Try "Check my introduction" or "Analyze my conclusion"
**For improvements:** Ask "Suggest better phrases" or "Make this more formal"
**For length:** Say "Expand this section" or "Cut unnecessary content"
**For requirements:** Ask "Does this meet requirements?" or "Check the tone"

What specific part of your essay would you like me to focus on?`,
            timestamp: new Date(),
            type: 'general'
        };
    };

    const generateIntroductionFeedback = (): ChatMessage => {
        const paragraphs = content.split('\n\n');
        const intro = paragraphs[0] || '';

        const issues = [];
        if (intro.length < 150) issues.push('Introduction seems short - aim for 150-200 words');
        if (!intro.toLowerCase().includes('thesis') && !intro.toLowerCase().includes('argument')) {
            issues.push('Missing clear thesis statement');
        }
        if (!intro.includes('?') && requirements.type === 'argumentative') {
            issues.push('Consider starting with a thought-provoking question');
        }

        return {
            id: Date.now().toString(),
            role: 'assistant',
            content: `📖 **Introduction Analysis**

${issues.length > 0 ?
    `**Issues Found:**\n${issues.map(issue => `• ${issue}`).join('\n')}\n\n` :
    '✅ **Strong introduction!**\n\n'
}

**Improvement Suggestions:**
• Add a hook (question, statistic, or surprising fact)
• Provide background context on your topic
• End with a clear, arguable thesis statement
• Preview your main supporting points

Would you like me to suggest specific opening lines or help strengthen your thesis?`,
            timestamp: new Date(),
            type: 'feedback',
            actions: [
                {
                    label: 'Suggest Opening Hook',
                    action: () => toast.info('Opening hook suggestions coming soon!'),
                    type: 'primary'
                }
            ]
        };
    };

    const generateConclusionFeedback = (): ChatMessage => {
        const paragraphs = content.split('\n\n');
        const conclusion = paragraphs[paragraphs.length - 1] || '';

        return {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🎯 **Conclusion Analysis**

**Current conclusion:** ${conclusion.length} words

**Suggestions:**
• Restate your thesis with fresh wording
• Summarize key supporting points
• Discuss broader implications
• End with a call to action or future research direction
• Avoid introducing new information

${conclusion.length < 100 ?
    '⚠️ **Your conclusion could be longer and more impactful.**' :
    '✅ **Good length for conclusion.**'
}`,
            timestamp: new Date(),
            type: 'feedback'
        };
    };

    const generateExpansionSuggestions = (): ChatMessage => ({
        id: Date.now().toString(),
        role: 'assistant',
        content: `🚀 **Content Expansion Ideas**

**Add More Detail:**
• Include specific examples and case studies
• Add statistics or research findings
• Provide more explanation of how evidence supports your thesis

**Strengthen Arguments:**
• Address potential counter-arguments
• Add expert opinions or quotes
• Include personal anecdotes (if appropriate for essay type)

**Improve Structure:**
• Break long paragraphs into shorter ones
• Add transitional paragraphs between major sections
• Expand on implications of your arguments

Select specific text and ask "Expand this" for targeted suggestions!`,
        timestamp: new Date(),
        type: 'suggestion'
    });

    const generateCuttingSuggestions = (): ChatMessage => ({
        id: Date.now().toString(),
        role: 'assistant',
        content: `✂️ **Content Cutting Suggestions**

**Remove Redundancy:**
• Look for repeated ideas or phrases
• Cut unnecessary qualifiers ("very", "really", "quite")
• Remove filler words and phrases

**Tighten Arguments:**
• Focus on strongest evidence only
• Remove tangential points
• Combine similar paragraphs

**Improve Clarity:**
• Replace wordy phrases with concise alternatives
• Cut overly complex sentences
• Remove obvious statements

Want me to identify specific areas to cut in your current essay?`,
        timestamp: new Date(),
        type: 'suggestion',
        actions: [
            {
                label: 'Find Redundancy',
                action: () => findRedundantContent(),
                type: 'secondary'
            }
        ]
    });

    const generatePhraseSuggestions = (): ChatMessage => {
        const improvements = findPhraseImprovements(content);

        return {
            id: Date.now().toString(),
            role: 'assistant',
            content: `💡 **Phrase Improvements Available**

Found ${improvements.length} opportunities to strengthen your writing:`,
            timestamp: new Date(),
            type: 'phrase_suggestion',
            phraseImprovements: improvements
        };
    };

    const generateToneFeedback = (): ChatMessage => ({
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎭 **Tone Analysis**

**Target:** ${requirements.tone} tone for ${requirements.academicLevel} level

**Check for:**
• Contractions (don't → do not)
• First/second person (I, you → avoid in formal writing)
• Casual language (like, stuff → such as, elements)
• Passive vs active voice
• Appropriate vocabulary level

**Quick Fix:** Click "Formalize Language" to automatically improve tone!`,
        timestamp: new Date(),
        type: 'feedback',
        actions: [
            {
                label: 'Formalize Language',
                action: () => formalizeLanguage(),
                type: 'primary'
            }
        ]
    });

    const findRedundantContent = () => {
        // Simple redundancy detection
        const sentences = content.split(/[.!?]+/);
        const redundant = [];

        for (let i = 0; i < sentences.length - 1; i++) {
            const current = sentences[i].trim().toLowerCase();
            const next = sentences[i + 1].trim().toLowerCase();

            if (current.length > 20 && next.length > 20) {
                const similarity = calculateSimilarity(current, next);
                if (similarity > 0.7) {
                    redundant.push(`Sentences ${i + 1} and ${i + 2} are very similar`);
                }
            }
        }

        const redundancyMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: redundant.length > 0 ?
                `🔍 **Redundancy Found:**\n\n${redundant.join('\n')}\n\nConsider combining or removing similar sentences.` :
                `✅ **No obvious redundancy found!** Your content appears well-structured without unnecessary repetition.`,
            timestamp: new Date(),
            type: 'feedback'
        };
        setMessages(prev => [...prev, redundancyMessage]);
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        return intersection.length / Math.max(words1.length, words2.length);
    };

    const applyPhraseImprovement = (improvement: PhraseImprovement, newPhrase: string) => {
        const { start, end } = improvement.position;
        const newContent = content.substring(0, start) + newPhrase + content.substring(end);
        onContentChange(newContent);
        toast.success(`Replaced "${improvement.original}" with "${newPhrase}"`);
    };

    const PhraseImprovementCard = ({ improvement }: { improvement: PhraseImprovement }) => (
        <Card className="mt-3 border-blue-200 bg-blue-50">
            <CardContent className="p-3">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                            "{improvement.original}"
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {Math.round(improvement.confidence * 100)}% confident
                        </Badge>
                    </div>

                    <p className="text-xs text-blue-700">{improvement.reason}</p>

                    <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-800">Suggestions:</p>
                        <div className="flex flex-wrap gap-1">
                            {improvement.suggestions.map((suggestion, idx) => (
                                <Button
                                    key={idx}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={() => applyPhraseImprovement(improvement, suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-blue-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Practical Essay Assistant</h3>
                            <p className="text-sm text-slate-600">Real help with actionable feedback</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isProcessing && (
                            <Badge className="bg-blue-100 text-blue-800">
                                <Zap className="w-3 h-3 mr-1 animate-pulse" />
                                Processing...
                            </Badge>
                        )}
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={autoAnalyze}
                                onCheckedChange={setAutoAnalyze}
                                className="scale-75"
                            />
                            <span className="text-xs text-slate-600">Auto-analyze</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Requirements Quick Setup */}
            <div className="p-3 border-b bg-slate-50">
                <div className="grid grid-cols-4 gap-2">
                    <Select
                        value={requirements.type}
                        onValueChange={(value: any) => setRequirements(prev => ({ ...prev, type: value }))}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="argumentative">Argumentative</SelectItem>
                            <SelectItem value="analytical">Analytical</SelectItem>
                            <SelectItem value="expository">Expository</SelectItem>
                            <SelectItem value="narrative">Narrative</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={requirements.academicLevel}
                        onValueChange={(value: any) => setRequirements(prev => ({ ...prev, academicLevel: value }))}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="high_school">High School</SelectItem>
                            <SelectItem value="college">College</SelectItem>
                            <SelectItem value="graduate">Graduate</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={requirements.tone}
                        onValueChange={(value: any) => setRequirements(prev => ({ ...prev, tone: value }))}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="academic">Academic</SelectItem>
                            <SelectItem value="conversational">Conversational</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                        <Input
                            type="number"
                            value={requirements.length}
                            onChange={(e) => setRequirements(prev => ({ ...prev, length: parseInt(e.target.value) || 1000 }))}
                            className="h-8 text-xs"
                            placeholder="Words"
                        />
                        <span className="text-xs text-slate-500">words</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                            <div className={cn(
                                "flex gap-3",
                                message.role === 'user' ? "justify-end" : "justify-start"
                            )}>
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[80%] rounded-lg p-3",
                                    message.role === 'user'
                                        ? "bg-blue-600 text-white ml-12"
                                        : "bg-slate-50 text-slate-900"
                                )}>
                                    <div className="text-sm whitespace-pre-wrap">
                                        {message.content}
                                    </div>

                                    {message.actions && message.actions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {message.actions.map((action, idx) => (
                                                <Button
                                                    key={idx}
                                                    size="sm"
                                                    variant={action.type === 'primary' ? 'default' : 'outline'}
                                                    onClick={action.action}
                                                    className="h-7 text-xs"
                                                >
                                                    {action.label}
                                                </Button>
                                            ))}
                                        </div>
                                    )}

                                    {message.phraseImprovements && message.phraseImprovements.map((improvement, idx) => (
                                        <PhraseImprovementCard key={idx} improvement={improvement} />
                                    ))}

                                    <div className="text-xs text-slate-400 mt-2">
                                        {message.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-sm">U</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Ask for specific help: 'Check my introduction', 'Suggest better phrases', 'Make this more formal'..."
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleUserMessage()}
                        className="flex-1"
                        disabled={isProcessing}
                    />
                    <Button
                        onClick={handleUserMessage}
                        disabled={!currentInput.trim() || isProcessing}
                        className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setCurrentInput('Check my introduction')}>
                        <Eye className="w-3 h-3 mr-1" />
                        Check Introduction
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentInput('Suggest better phrases')}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Better Phrases
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentInput('Make this more formal')}>
                        <FileText className="w-3 h-3 mr-1" />
                        Formalize
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentInput('Expand this essay')}>
                        <Plus className="w-3 h-3 mr-1" />
                        Expand
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentInput('Cut unnecessary content')}>
                        <Scissors className="w-3 h-3 mr-1" />
                        Cut Content
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PracticalEssayAssistant;