import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    Bot, Crown, Brain, Target, Lightbulb, Star, Wand2, Zap,
    MessageCircle, CheckCircle, AlertTriangle, Info, Edit3,
    TrendingUp, Award, Clock, Layers, Microscope, Settings,
    ArrowRight, RotateCcw, ThumbsUp, ThumbsDown, Bookmark,
    Share2, Copy, PenTool, FileText, BookOpen, Headphones,
    Volume2, PlayCircle, PauseCircle, SkipForward, Eye,
    Paintbrush, Quote, Replace, Plus, Minus, X, Send,
    GraduationCap, Users, School, Building, Briefcase,
    Sparkles, Compass, Map, Filter, Sliders
} from 'lucide-react';

// Enhanced interfaces for advanced AI functionality
interface DocumentRequirements {
    category: 'academic' | 'business' | 'creative' | 'technical' | 'personal';
    type: 'essay' | 'report' | 'thesis' | 'proposal' | 'review' | 'analysis' | 'narrative' | 'persuasive';
    academicLevel: 'high_school' | 'undergraduate' | 'graduate' | 'postgraduate' | 'professional';
    subject: string;
    targetLength: number;
    audience: 'general' | 'academic' | 'professional' | 'peers' | 'experts';
    tone: 'formal' | 'semi_formal' | 'conversational' | 'persuasive' | 'analytical';
    citationStyle?: 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee';
    deadline?: Date;
    specialInstructions?: string;
}

interface TextHighlight {
    id: string;
    start: number;
    end: number;
    text: string;
    type: 'error' | 'suggestion' | 'improvement' | 'excellence' | 'question';
    category: 'grammar' | 'style' | 'structure' | 'content' | 'citation' | 'clarity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestion?: string;
    replacementText?: string;
    explanation?: string;
}

interface ParagraphAnalysis {
    id: string;
    paragraphIndex: number;
    content: string;
    purpose: 'introduction' | 'body' | 'conclusion' | 'transition' | 'evidence' | 'analysis';
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
    highlights: TextHighlight[];
    rewriteSuggestion?: string;
}

interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    type: 'chat' | 'analysis' | 'suggestion' | 'proactive' | 'requirement' | 'highlight' | 'edit';
    metadata?: {
        paragraphIndex?: number;
        highlightId?: string;
        confidence: number;
        processingTime?: number;
    };
    attachments?: {
        highlights?: TextHighlight[];
        paragraphAnalysis?: ParagraphAnalysis;
        edits?: Array<{ original: string; suggested: string; reason: string }>;
    };
}

interface AdvancedAIEssayCoachProps {
    content: string;
    selectedText?: string;
    onContentChange: (content: string) => void;
    onHighlightText: (highlight: TextHighlight) => void;
    onApplyEdit: (edit: { start: number; end: number; replacement: string }) => void;
    isAnalyzing?: boolean;
}

const AdvancedAIEssayCoach: React.FC<AdvancedAIEssayCoachProps> = ({
    content,
    selectedText,
    onContentChange,
    onHighlightText,
    onApplyEdit,
    isAnalyzing = false
}) => {
    // Core state
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('requirements');

    // Advanced features state
    const [requirements, setRequirements] = useState<DocumentRequirements>({
        category: 'academic',
        type: 'essay',
        academicLevel: 'undergraduate',
        subject: '',
        targetLength: 1000,
        audience: 'academic',
        tone: 'formal'
    });

    const [highlights, setHighlights] = useState<TextHighlight[]>([]);
    const [paragraphAnalyses, setParagraphAnalyses] = useState<ParagraphAnalysis[]>([]);
    const [isProactiveMode, setIsProactiveMode] = useState(true);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [currentReviewSection, setCurrentReviewSection] = useState<string>('');

    // Human-like review state
    const [isReviewing, setIsReviewing] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [reviewSpeed, setReviewSpeed] = useState(2); // Words per second
    const [liveComments, setLiveComments] = useState<Array<{
        id: string;
        position: number;
        text: string;
        type: 'comment' | 'suggestion' | 'praise' | 'concern';
        timestamp: Date;
    }>>([]);
    const [currentHighlight, setCurrentHighlight] = useState<{ start: number; end: number } | null>(null);

    // UI state
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(true);
    const [autoHighlight, setAutoHighlight] = useState(true);
    const [realTimeAnalysis, setRealTimeAnalysis] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize AI coach with welcome message
    useEffect(() => {
        const welcomeMessage: AIMessage = {
            id: 'welcome',
            role: 'assistant',
            content: `👋 Hello! I'm your Advanced AI Essay Coach. I'll work with you like a human editor would - reviewing your essay from start to finish, highlighting areas for improvement, and providing detailed edits.

To get started, please set your document requirements so I can provide the most relevant feedback for your specific needs.`,
            timestamp: new Date(),
            type: 'chat',
            metadata: { confidence: 1.0 }
        };
        setMessages([welcomeMessage]);
    }, []);

    // Proactive analysis when content changes
    useEffect(() => {
        if (content.length > 100 && realTimeAnalysis && isProactiveMode) {
            const debounceTimer = setTimeout(() => {
                performProactiveAnalysis();
            }, 2000);
            return () => clearTimeout(debounceTimer);
        }
    }, [content, realTimeAnalysis, isProactiveMode]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const performProactiveAnalysis = async () => {
        if (!content.trim()) return;

        setIsLoading(true);
        setAnalysisProgress(0);
        setCurrentReviewSection('Initializing analysis...');

        try {
            // Simulate progressive analysis like a human reviewer
            const steps = [
                'Reading through your essay...',
                'Checking overall structure...',
                'Analyzing introduction...',
                'Reviewing body paragraphs...',
                'Evaluating conclusion...',
                'Checking grammar and style...',
                'Generating suggestions...',
                'Finalizing recommendations...'
            ];

            for (let i = 0; i < steps.length; i++) {
                setCurrentReviewSection(steps[i]);
                setAnalysisProgress((i + 1) / steps.length * 100);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Generate paragraph analyses
            const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
            const analyses = await analyzeParagraphs(paragraphs);
            setParagraphAnalyses(analyses);

            // Generate highlights
            const newHighlights = await generateHighlights(content);
            setHighlights(newHighlights);

            // Create proactive message
            const proactiveMessage: AIMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: generateProactiveResponse(analyses, newHighlights),
                timestamp: new Date(),
                type: 'proactive',
                metadata: {
                    confidence: 0.92,
                    processingTime: steps.length * 500
                },
                attachments: {
                    highlights: newHighlights,
                    paragraphAnalysis: analyses[0] // Send first paragraph as example
                }
            };

            setMessages(prev => [...prev, proactiveMessage]);

        } catch (error) {
            console.error('Proactive analysis error:', error);
            toast.error('Analysis encountered an issue');
        } finally {
            setIsLoading(false);
            setAnalysisProgress(0);
            setCurrentReviewSection('');
        }
    };

    const analyzeParagraphs = async (paragraphs: string[]): Promise<ParagraphAnalysis[]> => {
        return paragraphs.map((paragraph, index) => {
            const wordCount = paragraph.split(' ').length;
            const sentenceCount = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

            // Determine paragraph purpose based on position and content
            let purpose: ParagraphAnalysis['purpose'] = 'body';
            if (index === 0) purpose = 'introduction';
            else if (index === paragraphs.length - 1) purpose = 'conclusion';
            else if (paragraph.toLowerCase().includes('however') || paragraph.toLowerCase().includes('furthermore')) {
                purpose = 'transition';
            }

            // Generate analysis based on requirements
            const analysis: ParagraphAnalysis = {
                id: `para-${index}`,
                paragraphIndex: index,
                content: paragraph,
                purpose,
                strengths: generateStrengths(paragraph, purpose),
                weaknesses: generateWeaknesses(paragraph, purpose, wordCount, sentenceCount),
                suggestions: generateSuggestions(paragraph, purpose),
                score: calculateParagraphScore(paragraph, purpose, wordCount, sentenceCount),
                highlights: generateParagraphHighlights(paragraph, index)
            };

            return analysis;
        });
    };

    const generateHighlights = async (text: string): Promise<TextHighlight[]> => {
        const highlights: TextHighlight[] = [];
        let currentIndex = 0;

        // Grammar and style patterns to highlight
        const patterns = [
            {
                regex: /\b(very|really|quite|rather)\s+/gi,
                type: 'suggestion' as const,
                category: 'style' as const,
                severity: 'medium' as const,
                message: 'Consider using a stronger, more specific adjective instead of this qualifier.',
                suggestion: 'Use more precise language'
            },
            {
                regex: /\b(thing|stuff|things)\b/gi,
                type: 'improvement' as const,
                category: 'clarity' as const,
                severity: 'medium' as const,
                message: 'Vague terminology. Be more specific.',
                suggestion: 'Replace with specific terms'
            },
            {
                regex: /(\w+)\s+\1\b/gi,
                type: 'error' as const,
                category: 'grammar' as const,
                severity: 'high' as const,
                message: 'Repeated word detected.',
                suggestion: 'Remove duplicate word'
            }
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                highlights.push({
                    id: `highlight-${highlights.length}`,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    type: pattern.type,
                    category: pattern.category,
                    severity: pattern.severity,
                    message: pattern.message,
                    suggestion: pattern.suggestion
                });
            }
        });

        return highlights;
    };

    const generateProactiveResponse = (analyses: ParagraphAnalysis[], highlights: TextHighlight[]): string => {
        const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0) / analyses.length;
        const criticalIssues = highlights.filter(h => h.severity === 'critical').length;
        const highIssues = highlights.filter(h => h.severity === 'high').length;

        return `📋 **Essay Review Complete**

**Overall Assessment:** ${totalScore >= 80 ? 'Excellent' : totalScore >= 70 ? 'Good' : totalScore >= 60 ? 'Needs Improvement' : 'Requires Significant Revision'} (${Math.round(totalScore)}%)

**Key Findings:**
• ${analyses.length} paragraphs analyzed
• ${highlights.length} areas for improvement identified
• ${criticalIssues} critical issues found
• ${highIssues} high-priority suggestions

**Next Steps:**
1. Review the highlighted sections in your text
2. Check the paragraph-by-paragraph analysis in the Structure tab
3. Apply the suggested edits for immediate improvements
4. Focus on the highest-priority issues first

I'm here to help you refine each section. What would you like to work on first?`;
    };

    // Helper functions for paragraph analysis
    const generateStrengths = (paragraph: string, purpose: ParagraphAnalysis['purpose']): string[] => {
        const strengths: string[] = [];
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);

        if (sentences.length >= 3 && sentences.length <= 7) {
            strengths.push('Good paragraph length');
        }
        if (purpose === 'introduction' && paragraph.length > 150) {
            strengths.push('Substantial introduction');
        }
        if (paragraph.includes('however') || paragraph.includes('furthermore') || paragraph.includes('moreover')) {
            strengths.push('Uses transitional phrases');
        }

        return strengths.length > 0 ? strengths : ['Clear expression'];
    };

    const generateWeaknesses = (paragraph: string, purpose: ParagraphAnalysis['purpose'], wordCount: number, sentenceCount: number): string[] => {
        const weaknesses: string[] = [];

        if (wordCount < 50) weaknesses.push('Paragraph too short - needs development');
        if (wordCount > 200) weaknesses.push('Paragraph too long - consider splitting');
        if (sentenceCount === 1) weaknesses.push('Only one sentence - needs elaboration');
        if (!paragraph.includes('.')) weaknesses.push('Missing proper punctuation');

        return weaknesses;
    };

    const generateSuggestions = (paragraph: string, purpose: ParagraphAnalysis['purpose']): string[] => {
        const suggestions: string[] = [];

        if (purpose === 'introduction' && !paragraph.toLowerCase().includes('thesis')) {
            suggestions.push('Consider adding a clear thesis statement');
        }
        if (purpose === 'body' && !paragraph.includes('evidence') && !paragraph.includes('example')) {
            suggestions.push('Add supporting evidence or examples');
        }
        if (purpose === 'conclusion' && paragraph.length < 100) {
            suggestions.push('Expand conclusion to reinforce main points');
        }

        suggestions.push('Review for clarity and flow');
        return suggestions;
    };

    const calculateParagraphScore = (paragraph: string, purpose: ParagraphAnalysis['purpose'], wordCount: number, sentenceCount: number): number => {
        let score = 70; // Base score

        // Length scoring
        if (wordCount >= 75 && wordCount <= 150) score += 10;
        else if (wordCount < 50) score -= 20;
        else if (wordCount > 200) score -= 10;

        // Sentence variety
        if (sentenceCount >= 3 && sentenceCount <= 6) score += 10;
        else if (sentenceCount === 1) score -= 15;

        // Purpose-specific scoring
        if (purpose === 'introduction' && paragraph.toLowerCase().includes('thesis')) score += 15;
        if (purpose === 'body' && (paragraph.includes('evidence') || paragraph.includes('example'))) score += 10;

        return Math.max(0, Math.min(100, score));
    };

    const generateParagraphHighlights = (paragraph: string, paragraphIndex: number): TextHighlight[] => {
        // Generate specific highlights for this paragraph
        return [];
    };

    // Human-like progressive review functions
    const startHumanLikeReview = async () => {
        if (!content.trim() || isReviewing) return;

        setIsReviewing(true);
        setCurrentPosition(0);
        setLiveComments([]);
        setCurrentHighlight(null);

        // Add initial message
        const startMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🔍 Starting human-like review of your essay...\n\nI'll read through your document sentence by sentence, highlighting issues and making live comments as I go. You can watch my progress in real-time!`,
            timestamp: new Date(),
            type: 'proactive',
            metadata: { confidence: 1.0 }
        };
        setMessages(prev => [...prev, startMessage]);

        // Start the progressive review
        await simulateHumanReading();
    };

    const simulateHumanReading = async () => {
        const words = content.split(/\s+/);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

        let wordIndex = 0;
        let sentenceIndex = 0;
        let currentWordPosition = 0;

        const reviewInterval = setInterval(async () => {
            if (wordIndex >= words.length) {
                clearInterval(reviewInterval);
                await completeReview();
                return;
            }

            // Update current position
            currentWordPosition = content.indexOf(words[wordIndex], currentWordPosition);
            setCurrentPosition(currentWordPosition);

            // Highlight current word/phrase being read
            const currentWord = words[wordIndex];
            setCurrentHighlight({
                start: currentWordPosition,
                end: currentWordPosition + currentWord.length
            });

            // Simulate thinking pauses at punctuation
            if (currentWord.includes('.') || currentWord.includes('!') || currentWord.includes('?')) {
                // Pause at end of sentence - simulate human thinking
                setTimeout(() => {
                    checkSentenceForIssues(sentences[sentenceIndex], sentenceIndex);
                    sentenceIndex++;
                }, 500);
            }

            // Generate live comments occasionally
            if (Math.random() < 0.1 && wordIndex > 10) { // 10% chance after first 10 words
                generateLiveComment(currentWordPosition, words[wordIndex]);
            }

            // Look for specific patterns that need immediate attention
            checkForImmediateIssues(currentWord, currentWordPosition);

            wordIndex++;
            currentWordPosition += currentWord.length + 1; // +1 for space

            // Update progress
            setAnalysisProgress((wordIndex / words.length) * 100);
            setCurrentReviewSection(`Reading: "${words.slice(Math.max(0, wordIndex - 3), wordIndex + 1).join(' ')}..."`);

        }, 1000 / reviewSpeed); // Speed controlled by reviewSpeed state
    };

    const checkSentenceForIssues = (sentence: string, index: number) => {
        const issues = [];
        const sentenceStart = content.indexOf(sentence.trim());

        // Check sentence length
        if (sentence.length > 150) {
            issues.push({
                type: 'concern' as const,
                text: 'This sentence might be too long - consider breaking it up for better readability.'
            });
        }

        // Check for passive voice
        if (sentence.includes(' was ') || sentence.includes(' were ') || sentence.includes(' been ')) {
            issues.push({
                type: 'suggestion' as const,
                text: 'Consider using active voice to make this sentence more engaging.'
            });
        }

        // Check for weak words
        if (sentence.includes(' very ') || sentence.includes(' really ') || sentence.includes(' quite ')) {
            issues.push({
                type: 'suggestion' as const,
                text: 'Try replacing weak qualifiers with more specific and powerful words.'
            });
        }

        // Add issues as live comments
        issues.forEach(issue => {
            setLiveComments(prev => [...prev, {
                id: `comment-${Date.now()}-${Math.random()}`,
                position: sentenceStart,
                text: issue.text,
                type: issue.type,
                timestamp: new Date()
            }]);
        });

        // Add highlight for problematic sentences
        if (issues.length > 0) {
            const highlight: TextHighlight = {
                id: `sentence-${Date.now()}`,
                start: sentenceStart,
                end: sentenceStart + sentence.length,
                text: sentence.trim(),
                type: issues[0].type === 'concern' ? 'error' : 'suggestion',
                category: 'style',
                severity: 'medium',
                message: issues[0].text
            };

            setHighlights(prev => [...prev, highlight]);
            onHighlightText(highlight);
        }
    };

    const checkForImmediateIssues = (word: string, position: number) => {
        // Check for repeated words
        const words = content.split(/\s+/);
        const currentIndex = words.findIndex((w, i) => content.indexOf(w, position) === position);

        if (currentIndex > 0 && words[currentIndex] === words[currentIndex - 1]) {
            generateLiveComment(position, `Repeated word detected: "${word}"`);

            // Create immediate highlight
            const highlight: TextHighlight = {
                id: `repeat-${Date.now()}`,
                start: position,
                end: position + word.length,
                text: word,
                type: 'error',
                category: 'grammar',
                severity: 'high',
                message: 'Repeated word - consider removing one instance'
            };

            setHighlights(prev => [...prev, highlight]);
            onHighlightText(highlight);
        }

        // Check for common typos/issues
        const commonIssues = {
            'its': 'Check if this should be "it\'s" (it is)',
            'your': 'Check if this should be "you\'re" (you are)',
            'there': 'Check if this should be "their" or "they\'re"',
            'affect': 'Check if this should be "effect"',
            'then': 'Check if this should be "than"'
        };

        if (commonIssues[word.toLowerCase()]) {
            generateLiveComment(position, commonIssues[word.toLowerCase()]);
        }
    };

    const generateLiveComment = (position: number, commentText: string) => {
        const comments = [
            "I'm noticing this phrase could be stronger...",
            "This section flows well!",
            "Interesting point - let me keep reading...",
            "This could use more detail...",
            "Nice transition here!",
            "This argument is compelling...",
            "I'd like to see more evidence for this claim...",
            "The tone here is perfect for your audience...",
            "This sentence structure works well...",
            commentText
        ];

        const randomComment = commentText || comments[Math.floor(Math.random() * (comments.length - 1))];

        setLiveComments(prev => [...prev, {
            id: `live-${Date.now()}-${Math.random()}`,
            position,
            text: randomComment,
            type: randomComment.includes('well') || randomComment.includes('Nice') || randomComment.includes('perfect') ? 'praise' : 'comment',
            timestamp: new Date()
        }]);

        // Add comment to chat
        const commentMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `💭 ${randomComment}`,
            timestamp: new Date(),
            type: 'proactive',
            metadata: { confidence: 0.8 }
        };
        setMessages(prev => [...prev, commentMessage]);
    };

    const completeReview = async () => {
        setIsReviewing(false);
        setCurrentHighlight(null);
        setAnalysisProgress(100);
        setCurrentReviewSection('Review complete!');

        // Generate final summary
        const totalHighlights = highlights.length;
        const criticalIssues = highlights.filter(h => h.severity === 'critical' || h.severity === 'high').length;

        const completionMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ **Human-like Review Complete!**

I've finished reading through your entire essay, just like a human editor would. Here's what I found:

📊 **Review Summary:**
• ${liveComments.length} live comments made during reading
• ${totalHighlights} areas highlighted for improvement
• ${criticalIssues} high-priority issues identified

🎯 **Next Steps:**
1. Review the highlights I've marked in your text
2. Check my live comments for context-specific feedback
3. Focus on the high-priority issues first
4. Apply suggested edits where appropriate

I'm here to discuss any of my feedback or help you refine specific sections further!`,
            timestamp: new Date(),
            type: 'analysis',
            metadata: { confidence: 0.95 }
        };

        setMessages(prev => [...prev, completionMessage]);

        // Switch to highlights tab to show results
        setActiveTab('chat');
        toast.success('Human-like review completed! Check the highlights and comments.');
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
            type: 'chat',
            metadata: { confidence: 1.0 }
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response based on context
        setTimeout(() => {
            const aiResponse: AIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: generateContextualResponse(input),
                timestamp: new Date(),
                type: 'chat',
                metadata: { confidence: 0.89 }
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1000);
    };

    const generateContextualResponse = (userInput: string): string => {
        const input_lower = userInput.toLowerCase();

        if (input_lower.includes('help') || input_lower.includes('how')) {
            return "I'm here to help! I can analyze your essay structure, suggest improvements, highlight issues, and provide specific edits. What specific aspect would you like me to focus on?";
        }
        if (input_lower.includes('highlight') || input_lower.includes('mark')) {
            return "I'll highlight problematic areas in your text. Each highlight shows the issue type and provides suggestions for improvement. You can click on any highlight to see detailed explanations.";
        }
        if (input_lower.includes('paragraph') || input_lower.includes('structure')) {
            return "I'll analyze each paragraph for purpose, flow, and effectiveness. Check the Structure tab to see detailed paragraph-by-paragraph feedback with scores and suggestions.";
        }

        return "I understand your request. Let me analyze your essay and provide specific feedback. Is there a particular section you'd like me to focus on first?";
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const RequirementsPanel = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Document Requirements</h4>
                <Badge className="bg-blue-100 text-blue-800">
                    <Settings className="w-3 h-3 mr-1" />
                    Setup
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Category</label>
                    <Select value={requirements.category} onValueChange={(value: any) =>
                        setRequirements(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="academic">📚 Academic</SelectItem>
                            <SelectItem value="business">💼 Business</SelectItem>
                            <SelectItem value="creative">🎨 Creative</SelectItem>
                            <SelectItem value="technical">⚙️ Technical</SelectItem>
                            <SelectItem value="personal">👤 Personal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Type</label>
                    <Select value={requirements.type} onValueChange={(value: any) =>
                        setRequirements(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="essay">📝 Essay</SelectItem>
                            <SelectItem value="report">📊 Report</SelectItem>
                            <SelectItem value="thesis">🎓 Thesis</SelectItem>
                            <SelectItem value="proposal">💡 Proposal</SelectItem>
                            <SelectItem value="analysis">🔍 Analysis</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Academic Level</label>
                <Select value={requirements.academicLevel} onValueChange={(value: any) =>
                    setRequirements(prev => ({ ...prev, academicLevel: value }))}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="high_school">🏫 High School</SelectItem>
                        <SelectItem value="undergraduate">🎓 Undergraduate</SelectItem>
                        <SelectItem value="graduate">👨‍🎓 Graduate</SelectItem>
                        <SelectItem value="postgraduate">🔬 Postgraduate</SelectItem>
                        <SelectItem value="professional">💼 Professional</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Subject/Topic</label>
                <Input
                    value={requirements.subject}
                    onChange={(e) => setRequirements(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Literature, Psychology, Business..."
                    className="h-8 text-xs"
                />
            </div>

            <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                    Target Length: {requirements.targetLength} words
                </label>
                <Slider
                    value={[requirements.targetLength]}
                    onValueChange={([value]) => setRequirements(prev => ({ ...prev, targetLength: value }))}
                    max={5000}
                    min={250}
                    step={250}
                    className="w-full"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Audience</label>
                    <Select value={requirements.audience} onValueChange={(value: any) =>
                        setRequirements(prev => ({ ...prev, audience: value }))}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">🌍 General</SelectItem>
                            <SelectItem value="academic">📚 Academic</SelectItem>
                            <SelectItem value="professional">💼 Professional</SelectItem>
                            <SelectItem value="peers">👥 Peers</SelectItem>
                            <SelectItem value="experts">🧠 Experts</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Tone</label>
                    <Select value={requirements.tone} onValueChange={(value: any) =>
                        setRequirements(prev => ({ ...prev, tone: value }))}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="formal">🎩 Formal</SelectItem>
                            <SelectItem value="semi_formal">👔 Semi-formal</SelectItem>
                            <SelectItem value="conversational">💬 Conversational</SelectItem>
                            <SelectItem value="persuasive">🎯 Persuasive</SelectItem>
                            <SelectItem value="analytical">🔬 Analytical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={isProactiveMode}
                            onCheckedChange={setIsProactiveMode}
                            className="scale-75"
                        />
                        <span className="text-xs text-slate-600">Proactive Analysis</span>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                        Reading Speed: {reviewSpeed} words/sec
                    </label>
                    <Slider
                        value={[reviewSpeed]}
                        onValueChange={([value]) => setReviewSpeed(value)}
                        max={5}
                        min={0.5}
                        step={0.5}
                        className="w-full"
                        disabled={isReviewing}
                    />
                </div>

                <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                            {isReviewing ? 'Review in progress...' : 'Ready to start review'}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        onClick={startHumanLikeReview}
                        disabled={isLoading || !content.trim() || isReviewing}
                        className="text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 w-full"
                    >
                        {isReviewing ? (
                            <>
                                <Eye className="w-3 h-3 mr-1 animate-pulse" />
                                Reading...
                            </>
                        ) : (
                            <>
                                <Eye className="w-3 h-3 mr-1" />
                                Start Human Review
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    const StructurePanel = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Paragraph Analysis</h4>
                <Badge className="bg-purple-100 text-purple-800">
                    <Layers className="w-3 h-3 mr-1" />
                    {paragraphAnalyses.length} Paragraphs
                </Badge>
            </div>

            {paragraphAnalyses.length > 0 ? (
                <div className="space-y-3">
                    {paragraphAnalyses.map((analysis, index) => (
                        <Card key={analysis.id} className="border-l-4 border-l-indigo-500">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">
                                        Paragraph {index + 1} - {analysis.purpose.charAt(0).toUpperCase() + analysis.purpose.slice(1)}
                                    </CardTitle>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 bg-slate-200 rounded-full h-2">
                                            <div
                                                className={cn(
                                                    "h-2 rounded-full transition-all",
                                                    analysis.score >= 80 ? "bg-green-500" :
                                                    analysis.score >= 70 ? "bg-yellow-500" : "bg-red-500"
                                                )}
                                                style={{ width: `${analysis.score}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-medium">{analysis.score}%</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {analysis.strengths.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
                                        <ul className="text-xs text-green-600 space-y-1">
                                            {analysis.strengths.map((strength, i) => (
                                                <li key={i} className="flex items-center space-x-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>{strength}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {analysis.weaknesses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-red-700 mb-1">Areas for Improvement:</p>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {analysis.weaknesses.map((weakness, i) => (
                                                <li key={i} className="flex items-center space-x-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span>{weakness}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {analysis.suggestions.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-blue-700 mb-1">Suggestions:</p>
                                        <ul className="text-xs text-blue-600 space-y-1">
                                            {analysis.suggestions.map((suggestion, i) => (
                                                <li key={i} className="flex items-center space-x-1">
                                                    <Lightbulb className="w-3 h-3" />
                                                    <span>{suggestion}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex space-x-1 pt-2">
                                    <Button size="sm" variant="outline" className="text-xs h-6">
                                        <Edit3 className="w-3 h-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-xs h-6">
                                        <Paintbrush className="w-3 h-3 mr-1" />
                                        Highlight
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Start writing to see paragraph analysis</p>
                </div>
            )}
        </div>
    );

    const ChatPanel = () => {
        return (
            <div className="h-full flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    {/* Human-like Review Progress */}
                    {isReviewing && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <Eye className="w-4 h-4 text-emerald-600 animate-pulse" />
                                    <span className="text-sm font-medium text-emerald-900">Human-like Review in Progress</span>
                                </div>
                                <span className="text-xs text-emerald-700">{Math.round(analysisProgress)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.round(analysisProgress || 0)}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-emerald-700 space-y-1">
                                <p>{currentReviewSection}</p>
                                <p>Position: {currentPosition} | Speed: {reviewSpeed} words/sec</p>
                                <p>{liveComments.length} comments made • {highlights.length} highlights created</p>
                            </div>

                            {/* Current highlight indicator */}
                            {currentHighlight && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                    <p className="text-xs text-emerald-600 mb-1">Currently reading:</p>
                                    <p className="text-sm font-medium text-emerald-900">
                                        "{content.slice(currentHighlight.start, currentHighlight.end)}"
                                    </p>
                                </div>
                            )}

                            {/* Recent live comments */}
                            {liveComments.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-emerald-600 mb-2">Recent comments:</p>
                                    <div className="space-y-1 max-h-20 overflow-y-auto">
                                        {liveComments.slice(-3).map(comment => (
                                            <div key={comment.id} className="text-xs p-2 bg-white rounded border">
                                                <span className={cn(
                                                    "inline-block w-2 h-2 rounded-full mr-2",
                                                    comment.type === 'praise' ? 'bg-green-500' :
                                                    comment.type === 'concern' ? 'bg-red-500' :
                                                    comment.type === 'suggestion' ? 'bg-blue-500' : 'bg-gray-500'
                                                )}></span>
                                                {comment.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isLoading && analysisProgress > 0 && !isReviewing && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900">AI Analysis in Progress</span>
                            <span className="text-xs text-blue-700">{Math.round(analysisProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.round(analysisProgress || 0)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-blue-700">{currentReviewSection}</p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div key={message.id} className="mb-4">
                        <div className={cn(
                            "flex gap-3",
                            message.role === 'user' ? "justify-end" : "justify-start"
                        )}>
                            {message.role === 'assistant' && (
                                <Avatar className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600">
                                    <AvatarFallback className="text-white">
                                        <Bot className="w-4 h-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div className={cn(
                                "max-w-xs lg:max-w-md p-3 rounded-lg",
                                message.role === 'user'
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white border border-slate-200"
                            )}>
                                <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                                {message.type === 'proactive' && message.attachments?.highlights && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <p className="text-xs text-slate-500 mb-2">
                                            Found {message.attachments.highlights.length} areas to improve
                                        </p>
                                        <div className="space-y-1">
                                            {message.attachments.highlights.slice(0, 3).map((highlight) => (
                                                <div key={highlight.id} className="text-xs p-2 bg-slate-50 rounded">
                                                    <span className="font-medium">{highlight.category}:</span> {highlight.message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                                    <span>{message.timestamp.toLocaleTimeString()}</span>
                                    {message.metadata?.confidence && (
                                        <span>{Math.round(message.metadata.confidence * 100)}% confidence</span>
                                    )}
                                </div>
                            </div>

                            {message.role === 'user' && (
                                <Avatar className="w-8 h-8 bg-slate-400">
                                    <AvatarFallback className="text-white">
                                        <Users className="w-4 h-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && analysisProgress === 0 && (
                    <div className="flex gap-3 mb-4">
                        <Avatar className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600">
                            <AvatarFallback className="text-white">
                                <Bot className="w-4 h-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></div>
                                </div>
                                <span className="text-xs text-slate-500">AI is analyzing...</span>
                            </div>
                        </div>
                    </div>
                )}

                    <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about your essay..."
                            className="flex-1 text-sm"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                                <Switch
                                    checked={autoHighlight}
                                    onCheckedChange={setAutoHighlight}
                                    className="scale-75"
                                />
                                <span className="text-xs text-slate-600">Auto-highlight</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Switch
                                    checked={realTimeAnalysis}
                                    onCheckedChange={setRealTimeAnalysis}
                                    className="scale-75"
                                />
                                <span className="text-xs text-slate-600">Real-time</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Press Enter to send
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Crown className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Advanced AI Essay Coach</h3>
                            <p className="text-xs text-slate-600">Professional writing analysis & editing</p>
                        </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                        <Brain className="w-3 h-3 mr-1" />
                        Human-like Review
                    </Badge>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b border-slate-200 px-4 flex-shrink-0">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="requirements" className="text-xs">Requirements</TabsTrigger>
                        <TabsTrigger value="structure" className="text-xs">Structure</TabsTrigger>
                        <TabsTrigger value="chat" className="text-xs">AI Coach</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="requirements" className="h-full m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 pb-8">
                                <RequirementsPanel />
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="structure" className="h-full m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 pb-8">
                                <StructurePanel />
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="chat" className="h-full m-0">
                        <ChatPanel />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default AdvancedAIEssayCoach;