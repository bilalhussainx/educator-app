import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import smartPromptService from '../../services/smartPromptService';
import {
    Brain,
    FileText,
    Search,
    Replace,
    Type,
    Target,
    BookOpen,
    Lightbulb,
    X,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Zap,
    Palette,
    BarChart3,
    MessageSquare,
    Eye,
    EyeOff,
    Settings,
    ChevronDown,
    ChevronUp,
    Hash,
    Clock,
    Sparkles,
    Send
} from 'lucide-react';

interface EnhancedEssayEditingPanelProps {
    isReviewMode: boolean;
    isAnalyzing: boolean;
    reviewProgress: { current: number; total: number };
    reviewAnnotations: any[];
    activeAnnotation: string | null;
    currentContent: string;
    onStartReview: () => void;
    onExitReview: () => void;
    onContentChange?: (content: string) => void;
    onSendPrompt?: (prompt: string, context: string) => void;
    onAICommentsReceived?: (comments: any[], promptContext: string) => void;
}

interface WordStats {
    words: number;
    characters: number;
    charactersNoSpaces: number;
    sentences: number;
    paragraphs: number;
    readingTime: number;
}

interface DocumentRequirements {
    type: string;
    length: string;
    audience: string;
    purpose: string;
    tone: string;
    subject: string;
    customInstructions: string;
}

interface PromptResponse {
    id: string;
    prompt: string;
    response: string;
    timestamp: number;
    isLoading: boolean;
}

interface FindReplaceState {
    findText: string;
    replaceText: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    matches: number;
    currentMatch: number;
}

const EnhancedEssayEditingPanel: React.FC<EnhancedEssayEditingPanelProps> = ({
    isReviewMode,
    isAnalyzing,
    reviewProgress,
    reviewAnnotations,
    activeAnnotation,
    currentContent,
    onStartReview,
    onExitReview,
    onContentChange,
    onSendPrompt,
    onAICommentsReceived
}) => {
    const [activeTab, setActiveTab] = useState<'editor' | 'info' | 'requirements' | 'prompts' | 'review'>('editor');
    const [wordStats, setWordStats] = useState<WordStats>({
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTime: 0
    });
    const [findReplace, setFindReplace] = useState<FindReplaceState>({
        findText: '',
        replaceText: '',
        caseSensitive: false,
        wholeWord: false,
        matches: 0,
        currentMatch: 0
    });
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        wordCount: true,
        findReplace: false,
        quickActions: true,
        suggestions: true
    });
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [intelligentPrompts, setIntelligentPrompts] = useState<string[]>([]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [requestingMoreComments, setRequestingMoreComments] = useState(false);
    const [promptResponses, setPromptResponses] = useState<PromptResponse[]>([]);
    const [sendingPrompts, setSendingPrompts] = useState<Set<string>>(new Set());
    const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirements>({
        type: 'college_essay',
        length: 'medium',
        audience: 'admissions_committee',
        purpose: 'personal_narrative',
        tone: 'authentic',
        subject: '',
        customInstructions: ''
    });

    // Calculate word statistics
    useEffect(() => {
        const text = currentContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        const readingTime = Math.ceil(words / 200); // 200 WPM average

        setWordStats({
            words,
            characters,
            charactersNoSpaces,
            sentences,
            paragraphs,
            readingTime
        });
    }, [currentContent]);

    // Find matches for find/replace
    useEffect(() => {
        if (findReplace.findText && currentContent) {
            const flags = findReplace.caseSensitive ? 'g' : 'gi';
            const pattern = findReplace.wholeWord
                ? new RegExp(`\\b${findReplace.findText}\\b`, flags)
                : new RegExp(findReplace.findText, flags);
            const matches = currentContent.match(pattern);
            setFindReplace(prev => ({
                ...prev,
                matches: matches ? matches.length : 0,
                currentMatch: 0
            }));
        } else {
            setFindReplace(prev => ({ ...prev, matches: 0, currentMatch: 0 }));
        }
    }, [findReplace.findText, findReplace.caseSensitive, findReplace.wholeWord, currentContent]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleFindReplace = () => {
        if (!findReplace.findText || !currentContent || !onContentChange) return;

        const flags = findReplace.caseSensitive ? 'g' : 'gi';
        const pattern = findReplace.wholeWord
            ? new RegExp(`\\b${findReplace.findText}\\b`, flags)
            : new RegExp(findReplace.findText, flags);

        const newContent = currentContent.replace(pattern, findReplace.replaceText);
        onContentChange(newContent);

        setFindReplace(prev => ({ ...prev, findText: '', replaceText: '' }));
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(label);
            setTimeout(() => setCopiedText(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const sendPromptToAI = async (prompt: string, index: number) => {
        if (!currentContent) return;

        const promptId = `prompt-${index}-${Date.now()}`;

        // Add prompt to sending state
        setSendingPrompts(prev => new Set(prev).add(promptId));

        // Add loading response to state immediately
        const newResponse: PromptResponse = {
            id: promptId,
            prompt: prompt,
            response: '',
            timestamp: Date.now(),
            isLoading: true
        };

        setPromptResponses(prev => [newResponse, ...prev]);

        try {
            console.log('🚀 Sending prompt to Claude AI via API...');

            // Call the real API service
            const apiResponse = await smartPromptService.sendPromptToAI({
                prompt: prompt,
                documentContent: currentContent,
                documentType: documentRequirements.type,
                wordCount: wordStats.words,
                requirements: {
                    type: documentRequirements.type,
                    length: documentRequirements.length,
                    audience: documentRequirements.audience,
                    purpose: documentRequirements.purpose,
                    tone: documentRequirements.tone,
                    subject: documentRequirements.subject,
                    customInstructions: documentRequirements.customInstructions
                }
            });

            console.log('✅ Received API response:', apiResponse);

            // Check if response contains inline comments
            if (apiResponse.comments && apiResponse.comments.length > 0) {
                console.log(`📋 Received ${apiResponse.comments.length} inline comments from smart prompt`);

                // Call the callback to display comments in the editor
                if (onAICommentsReceived) {
                    onAICommentsReceived(apiResponse.comments, prompt);
                }

                // Update response to show success message
                setPromptResponses(prev =>
                    prev.map(response =>
                        response.id === promptId
                            ? {
                                ...response,
                                response: `✅ **Generated ${apiResponse.comments.length} targeted inline comments!**\n\n📝 Based on your prompt: "${prompt}"\n\nCheck your document editor to see the inline comments highlighting specific areas for improvement.${apiResponse.metadata?.fallbackMode ? '\n\n⚠️ Using fallback mode - configure Claude API for enhanced features.' : ''}`,
                                isLoading: false
                            }
                            : response
                    )
                );
            } else {
                // Update the response with text feedback (fallback)
                setPromptResponses(prev =>
                    prev.map(response =>
                        response.id === promptId
                            ? {
                                ...response,
                                response: apiResponse.response || 'No response received',
                                isLoading: false
                            }
                            : response
                    )
                );
            }

            // Call the optional callback if provided
            if (onSendPrompt) {
                const context = `Document: ${documentRequirements.type} (${wordStats.words} words) | Prompt: ${prompt}`;
                onSendPrompt(prompt, context);
            }

        } catch (error) {
            console.error('❌ Error sending prompt to AI:', error);

            // Provide error fallback response
            const errorResponse = `**Claude AI Unavailable**

🚫 **Connection Error:** Unable to reach Claude AI service.

📝 **Your Prompt:** "${prompt}"

🔄 **Suggested Actions:**
1. Check your internet connection
2. Try again in a few moments
3. The AI service may be temporarily unavailable

💡 **Manual Analysis Tips:**
For the prompt "${prompt}", consider:
- How does this relate to your ${documentRequirements.type.replace('_', ' ')} goals?
- What specific examples from your ${wordStats.words}-word document support this?
- How can you strengthen this aspect for your ${documentRequirements.audience.replace('_', ' ')} audience?

Please try sending your prompt again when the connection is restored.`;

            setPromptResponses(prev =>
                prev.map(response =>
                    response.id === promptId
                        ? { ...response, response: errorResponse, isLoading: false }
                        : response
                )
            );
        } finally {
            setSendingPrompts(prev => {
                const newSet = new Set(prev);
                newSet.delete(promptId);
                return newSet;
            });
        }
    };

    const quickActions = [
        {
            icon: Hash,
            label: 'Add Heading',
            action: () => onContentChange?.(currentContent + '\n\n## New Heading\n\n'),
            color: 'blue'
        },
        {
            icon: Type,
            label: 'Bold Selection',
            action: () => onContentChange?.(currentContent + '**bold text**'),
            color: 'purple'
        },
        {
            icon: Sparkles,
            label: 'Add Transition',
            action: () => onContentChange?.(currentContent + '\n\nFurthermore, '),
            color: 'green'
        },
        {
            icon: BookOpen,
            label: 'Cite Source',
            action: () => onContentChange?.(currentContent + ' (Author, Year)'),
            color: 'orange'
        }
    ];

    // Analyze the actual document content to identify strengths and weaknesses
    const analyzeDocumentContent = (content: string) => {
        const text = content.toLowerCase();
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        const analysis = {
            // Structure analysis
            hasIntroduction: text.includes('introduction') || text.includes('begin') || text.includes('start'),
            hasConclusion: text.includes('conclusion') || text.includes('finally') || text.includes('in summary'),
            hasThesis: text.includes('thesis') || text.includes('argue that') || text.includes('believe that'),
            hasTransitions: /however|therefore|furthermore|moreover|additionally|consequently|meanwhile|nevertheless/.test(text),

            // Content analysis
            hasPersonalExperience: /i|my|me|mine|myself/.test(text),
            hasEvidence: text.includes('research') || text.includes('study') || text.includes('data') || text.includes('according to'),
            hasExamples: text.includes('example') || text.includes('instance') || text.includes('such as'),
            hasQuotes: content.includes('"') || content.includes("'") || content.includes('"') || content.includes('"'),

            // Writing quality indicators
            sentenceVariety: calculateSentenceVariety(sentences),
            vocabularyComplexity: calculateVocabularyComplexity(text),
            repetitiveWords: findRepetitiveWords(text),
            weakVerbs: findWeakVerbs(text),
            passiveVoice: countPassiveVoice(text),

            // Structure metrics
            paragraphCount: paragraphs.length,
            averageParagraphLength: paragraphs.reduce((acc, p) => acc + p.split(' ').length, 0) / paragraphs.length,
            averageSentenceLength: sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length,

            // Content gaps
            needsMoreDetail: paragraphs.some(p => p.split(' ').length < 30),
            needsMoreEvidence: !text.includes('research') && !text.includes('study') && !text.includes('data'),
            needsPersonalTouch: documentRequirements.type === 'college_essay' && !/i|my|me|mine/.test(text),
            needsBetterConclusion: !text.includes('conclusion') && !text.includes('finally') && content.split('\n').slice(-3).join('').length < 100
        };

        return analysis;
    };

    // Calculate sentence variety (simple heuristic)
    const calculateSentenceVariety = (sentences: string[]): number => {
        const lengths = sentences.map(s => s.split(' ').length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
        return Math.min(variance / 10, 10); // Scale to 0-10
    };

    // Calculate vocabulary complexity
    const calculateVocabularyComplexity = (text: string): number => {
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words);
        const complexWords = words.filter(word => word.length > 6).length;
        return (uniqueWords.size / words.length) * (complexWords / words.length) * 100;
    };

    // Find repetitive words
    const findRepetitiveWords = (text: string): string[] => {
        const words = text.split(/\s+/).filter(word => word.length > 3);
        const wordCount: { [key: string]: number } = {};
        words.forEach(word => {
            const clean = word.toLowerCase().replace(/[^\w]/g, '');
            wordCount[clean] = (wordCount[clean] || 0) + 1;
        });
        return Object.entries(wordCount)
            .filter(([word, count]) => count > 3 && word.length > 4)
            .map(([word]) => word);
    };

    // Find weak verbs
    const findWeakVerbs = (text: string): string[] => {
        const weakVerbs = ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'get', 'got', 'make', 'made', 'do', 'did'];
        const words = text.toLowerCase().split(/\s+/);
        return weakVerbs.filter(verb => words.includes(verb));
    };

    // Count passive voice instances
    const countPassiveVoice = (text: string): number => {
        const passivePattern = /(was|were|is|are|been|be)\s+\w+ed/gi;
        return (text.match(passivePattern) || []).length;
    };

    // Extract essay themes and topics from actual content
    const extractEssayThemes = (content: string) => {
        const lowerContent = content.toLowerCase();
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const firstParagraph = content.split('\n')[0] || '';

        // Extract key themes and subjects
        let mainTopic = 'your story';
        if (lowerContent.includes('fled') || lowerContent.includes('running') || lowerContent.includes('chase')) {
            mainTopic = 'escape and pursuit';
        } else if (lowerContent.includes('shadow') || lowerContent.includes('darkness') || lowerContent.includes('fear')) {
            mainTopic = 'confronting fears and darkness';
        } else if (lowerContent.includes('old man') || lowerContent.includes('haunting')) {
            mainTopic = 'haunting memories and confrontation';
        } else if (lowerContent.includes('college') || lowerContent.includes('education')) {
            mainTopic = 'educational journey';
        }

        return {
            mainTopic,
            hasDialogue: content.includes('"') || content.includes("'"),
            hasCharacters: lowerContent.includes('he ') || lowerContent.includes('she ') || lowerContent.includes('they '),
            isNarrative: sentences.some(s => s.includes('he ') || s.includes('she ') || s.includes('they ')),
            emotionalTone: lowerContent.includes('fear') || lowerContent.includes('panic') ? 'intense' :
                          lowerContent.includes('calm') || lowerContent.includes('peaceful') ? 'serene' : 'neutral',
            tenseUsed: lowerContent.includes('fled') || lowerContent.includes('ran') ? 'past' : 'present',
            settingElements: {
                hasLocation: lowerContent.includes('room') || lowerContent.includes('street') || lowerContent.includes('city'),
                hasTimeContext: lowerContent.includes('night') || lowerContent.includes('day') || lowerContent.includes('morning'),
                hasAtmosphere: lowerContent.includes('dark') || lowerContent.includes('light') || lowerContent.includes('shadow')
            }
        };
    };

    // Generate prompts based on actual essay content analysis AND requirements
    const generateRealEssayPrompts = (content: string, analysis: any, stats: WordStats, requirements: DocumentRequirements): string[] => {
        const themes = extractEssayThemes(content);
        const prompts: string[] = [];

        // Analyze the actual content and provide specific suggestions
        const lowerContent = content.toLowerCase();
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

        // REQUIREMENTS-AWARE CONTENT ANALYSIS

        // 1. Document Type & Purpose Integration
        const docType = requirements.type.replace('_', ' ');
        const purpose = requirements.purpose.replace('_', ' ');
        const audience = requirements.audience.replace('_', ' ');

        // Type-specific content analysis
        if (requirements.type === 'college_essay') {
            if (lowerContent.includes('he fled') || lowerContent.includes('old man')) {
                prompts.push(`For your college application, transform this powerful narrative about confronting fears into a statement about personal growth - how did facing the "old man" change who you are as a person?`);
            }
            if (!lowerContent.includes('i ') && !lowerContent.includes('my ')) {
                prompts.push(`College essays need personal voice - shift from third person ("he") to first person ("I") to make this YOUR story of overcoming challenges.`);
            }
        }

        // 2. Audience-Specific Suggestions
        if (requirements.audience === 'admissions_committee') {
            prompts.push(`For an admissions committee, highlight specific qualities this experience reveals - leadership, resilience, intellectual curiosity. What skills did you gain from this confrontation?`);
        } else if (requirements.audience === 'general_public') {
            prompts.push(`Make your narrative more universally relatable - what elements of fear, growth, or confrontation will resonate with general readers?`);
        }

        // 3. Purpose-Driven Content Analysis
        if (requirements.purpose === 'personal_narrative') {
            if (lowerContent.includes('shadow') && lowerContent.includes('empty chair')) {
                prompts.push(`Strong personal narrative setup with the "Shadow of the Empty Chair" - now reveal the deeper personal significance. What life event does this chair represent?`);
            }
        } else if (requirements.purpose === 'persuasive') {
            prompts.push(`For persuasive writing, strengthen your argument - what specific lesson or change are you advocating through this intense experience?`);
        }

        // 4. Tone Requirements Integration
        const requiredTone = requirements.tone;
        if (requiredTone === 'authentic' && lowerContent.includes('panic') && lowerContent.includes('fear')) {
            prompts.push(`Your authentic tone captures real fear effectively - now add authentic reflection on what this fear taught you about yourself.`);
        } else if (requiredTone === 'formal' && sentences.some(s => s.includes('he fled'))) {
            prompts.push(`For formal tone, consider more sophisticated language - "he fled" could become "he hastily retreated" or "he withdrew in apprehension."`);
        }

        // 5. Length Requirements Check
        const targetLength = requirements.length;
        if (targetLength === 'short' && stats.words > 800) {
            prompts.push(`You're over the short essay target - focus on the most impactful moments. Which scene (chase, confrontation, or resolution) best serves your main message?`);
        } else if (targetLength === 'long' && stats.words < 1000) {
            prompts.push(`Expand to meet length requirements - add more sensory details about the cobblestone streets, the old man's appearance, and your internal thoughts during the chase.`);
        }

        // 6. Subject-Specific Integration
        if (requirements.subject) {
            prompts.push(`Connect your narrative to ${requirements.subject} - how does this experience of confronting fears relate to your academic or professional interests?`);
        }

        // 7. Custom Instructions Integration
        if (requirements.customInstructions) {
            prompts.push(`Following your custom requirements: "${requirements.customInstructions}" - ensure your narrative addresses these specific guidelines.`);
        }

        // 8. Content-Specific Analysis (Based on Actual Essay)

        // Opening analysis
        const firstSentence = sentences[0] || '';
        if (firstSentence.includes('fled')) {
            prompts.push(`Strong opening with immediate action ("He fled") - perfect for ${docType}. Now ensure the rest maintains this urgency while serving your ${purpose} purpose.`);
        }

        // Character development for requirements
        if (lowerContent.includes('old man')) {
            if (requirements.type === 'college_essay') {
                prompts.push(`The "old man" figure is intriguing for a college essay - is this a mentor, family member, or symbolic representation? Clarify this relationship for admissions readers.`);
            } else {
                prompts.push(`Develop the "old man" character further - what does he represent in the context of your ${docType}?`);
            }
        }

        // Setting analysis with requirements
        if (lowerContent.includes('cobblestone')) {
            prompts.push(`Excellent atmospheric details with cobblestone streets - this setting supports your ${requiredTone} tone. Add more sensory details to fully immerse your ${audience} audience.`);
        }

        // Emotional depth for specific purposes
        if (lowerContent.includes('panic') || lowerContent.includes('fear')) {
            if (requirements.purpose === 'personal_narrative') {
                prompts.push(`Fear and panic are well-conveyed - now explore the personal transformation. How did this fear-confrontation experience shape your worldview?`);
            } else {
                prompts.push(`Use this emotional intensity to serve your ${purpose} purpose - what broader message does this fear convey?`);
            }
        }

        // Conclusion requirements check
        const lastParagraph = paragraphs[paragraphs.length - 1] || '';
        if (lastParagraph.length < 100) {
            prompts.push(`Strengthen your conclusion to match ${requirements.type} expectations - connect this experience to your future goals or personal development for ${audience}.`);
        }

        // Ensure we have enough prompts
        if (prompts.length < 6) {
            prompts.push(
                `Your ${stats.words}-word ${docType} needs stronger connection between content and your stated purpose of ${purpose}.`,
                `Consider how your ${requiredTone} tone serves your ${audience} audience throughout the narrative.`,
                `Integrate more elements that specifically support your ${requirements.type} objectives.`
            );
        }

        return prompts.slice(0, 8); // Return top 8 most relevant prompts
    };

    // Generate content-aware prompts based on document analysis
    const getContentAwarePrompts = (docType: string, progress: string, stats: WordStats, requirements: DocumentRequirements, analysis: any): string[] => {
        const contentSpecificPrompts: string[] = [];

        // Structure-based prompts
        if (!analysis.hasIntroduction && stats.words > 100) {
            contentSpecificPrompts.push("Add a compelling introduction that hooks your reader and clearly states your main argument");
        }

        if (!analysis.hasConclusion && stats.words > 200) {
            contentSpecificPrompts.push("Craft a strong conclusion that ties together your main points and leaves a lasting impression");
        }

        if (!analysis.hasThesis && ['college_essay', 'research_paper', 'argumentative'].includes(docType)) {
            contentSpecificPrompts.push("Develop a clear, specific thesis statement that guides your entire argument");
        }

        if (!analysis.hasTransitions && analysis.paragraphCount > 2) {
            contentSpecificPrompts.push("Add transition words and phrases to improve flow between your paragraphs");
        }

        // Content-based prompts
        if (analysis.needsMoreEvidence && docType === 'research_paper') {
            contentSpecificPrompts.push("Support your arguments with credible research, data, or expert opinions");
        }

        if (analysis.needsPersonalTouch && docType === 'college_essay') {
            contentSpecificPrompts.push("Include more personal anecdotes and experiences to make your essay uniquely yours");
        }

        if (!analysis.hasExamples && stats.words > 300) {
            contentSpecificPrompts.push("Add specific examples or case studies to illustrate your main points");
        }

        // Writing quality prompts
        if (analysis.sentenceVariety < 3) {
            contentSpecificPrompts.push("Vary your sentence structure - mix short, impactful sentences with longer, complex ones");
        }

        if (analysis.repetitiveWords.length > 0) {
            contentSpecificPrompts.push(`Reduce repetition of these words: ${analysis.repetitiveWords.slice(0, 3).join(', ')} - use synonyms for variety`);
        }

        if (analysis.passiveVoice > 2) {
            contentSpecificPrompts.push("Replace passive voice constructions with active voice for stronger, clearer writing");
        }

        if (analysis.weakVerbs.length > 5) {
            contentSpecificPrompts.push("Replace weak verbs (is, are, was, were, have, had) with more dynamic action verbs");
        }

        // Length-specific prompts
        if (analysis.needsMoreDetail) {
            contentSpecificPrompts.push("Expand your shorter paragraphs with more detailed explanations and supporting evidence");
        }

        if (analysis.averageSentenceLength < 10) {
            contentSpecificPrompts.push("Combine some shorter sentences to create more sophisticated, flowing prose");
        }

        if (analysis.averageSentenceLength > 25) {
            contentSpecificPrompts.push("Break up some longer sentences for better readability and impact");
        }

        // Get base prompts from requirements
        const basePrompts = getEnhancedContextualPrompts(docType, progress, stats, requirements);

        // Combine content-specific prompts with base prompts, prioritizing content-specific ones
        return [
            ...contentSpecificPrompts.slice(0, 5), // Top 5 content-specific prompts
            ...basePrompts.slice(0, 3) // Top 3 base prompts
        ].slice(0, 8); // Return top 8 total prompts
    };

    // Detect document type from content
    const detectDocumentType = (content: string): string => {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('college') || lowerContent.includes('university') || lowerContent.includes('admission')) return 'college_essay';
        if (lowerContent.includes('research') || lowerContent.includes('study') || lowerContent.includes('hypothesis')) return 'research_paper';
        if (lowerContent.includes('argument') || lowerContent.includes('thesis') || lowerContent.includes('evidence')) return 'argumentative';
        if (lowerContent.includes('story') || lowerContent.includes('narrative') || lowerContent.includes('experience')) return 'narrative';
        return 'general_essay';
    };

    // Analyze writing progress
    const analyzeWritingProgress = (content: string): string => {
        const wordCount = wordStats.words;
        if (wordCount < 100) return 'beginning';
        if (wordCount < 300) return 'developing';
        if (wordCount < 600) return 'substantial';
        return 'comprehensive';
    };

    // Enhanced contextual prompts using user requirements
    const getEnhancedContextualPrompts = (docType: string, progress: string, stats: WordStats, requirements: DocumentRequirements): string[] => {
        const typePrompts: { [key: string]: string[] } = {
            college_essay: [
                `Show your unique perspective on ${requirements.subject || 'your chosen topic'} through specific personal examples`,
                `Connect your experiences to future goals and how they align with ${requirements.audience === 'admissions_committee' ? 'this college\'s values' : 'your audience\'s interests'}`,
                `Use a ${requirements.tone} voice while maintaining professional authenticity`,
                `Demonstrate growth and self-reflection through concrete anecdotes`,
                `Address how this experience shaped your worldview or future aspirations`
            ],
            short_story: [
                `Develop your main character's internal conflict through ${requirements.tone} dialogue and actions`,
                `Create vivid sensory details that immerse readers in your story world`,
                `Build tension through pacing - vary sentence length and structure`,
                `Show character development through actions rather than exposition`,
                `Craft a satisfying resolution that ties back to your opening scene`
            ],
            novella: [
                `Develop multiple character arcs that intersect meaningfully with your central theme`,
                `Create subplots that enhance rather than distract from your main narrative`,
                `Build sustained tension across chapters while providing satisfying mini-resolutions`,
                `Establish a consistent ${requirements.tone} voice throughout the extended narrative`,
                `Layer in symbolism and motifs that deepen with each chapter`
            ],
            research_paper: [
                `Strengthen your thesis with more specific, arguable claims about ${requirements.subject}`,
                `Incorporate recent scholarly sources to support your argument`,
                `Address counterarguments to demonstrate comprehensive understanding`,
                `Use precise academic language appropriate for ${requirements.audience}`,
                `Connect your findings to broader implications in the field`
            ],
            business_plan: [
                `Quantify your market opportunity with specific data and projections`,
                `Detail your competitive advantage and how it addresses market gaps`,
                `Present realistic financial projections with clear assumptions`,
                `Outline your go-to-market strategy with specific milestones`,
                `Address potential risks and your mitigation strategies`
            ],
            personal_statement: [
                `Connect your background to your future goals in ${requirements.subject}`,
                `Demonstrate how your experiences prepare you for this opportunity`,
                `Show rather than tell your key qualities through specific examples`,
                `Address why this particular program/position aligns with your goals`,
                `Maintain a ${requirements.tone} tone while being genuinely authentic`
            ],
            memoir: [
                `Focus on a specific time period or theme rather than your entire life`,
                `Use sensory details to transport readers to key moments`,
                `Reflect on how past experiences shaped your current perspective`,
                `Balance personal vulnerability with universal themes`,
                `Create a narrative arc that shows transformation or insight`
            ],
            screenplay: [
                `Show character development through dialogue and action, not exposition`,
                `Create visual scenes that advance the plot efficiently`,
                `Develop subtext - what characters don't say is often more important`,
                `Use proper screenplay format and industry conventions`,
                `Build tension through conflict and pacing between scenes`
            ],
            grant_proposal: [
                `Clearly articulate the problem you're addressing with specific evidence`,
                `Demonstrate how your solution is innovative and feasible`,
                `Present a detailed budget with clear justifications`,
                `Show measurable outcomes and impact metrics`,
                `Establish your credibility and track record in this area`
            ],
            blog_post: [
                `Start with a hook that addresses your audience's pain point`,
                `Use subheadings and bullet points for easy scanning`,
                `Include actionable advice readers can implement immediately`,
                `Optimize for SEO while maintaining natural, conversational tone`,
                `End with a clear call-to-action for engagement`
            ],
            technical_documentation: [
                `Use clear, step-by-step instructions with numbered lists`,
                `Include screenshots or diagrams to illustrate complex concepts`,
                `Define technical terms for your intended audience level`,
                `Test your instructions with someone unfamiliar with the process`,
                `Organize information with clear headings and logical flow`
            ],
            marketing_copy: [
                `Focus on benefits rather than features in your messaging`,
                `Use persuasive language that addresses customer pain points`,
                `Include social proof and testimonials where relevant`,
                `Create urgency with limited-time offers or scarcity`,
                `Test different versions to optimize conversion rates`
            ],
            academic_thesis: [
                `Develop a clear, arguable thesis that contributes new knowledge`,
                `Conduct thorough literature review to establish context`,
                `Use rigorous methodology appropriate to your discipline`,
                `Present findings objectively with proper statistical analysis`,
                `Connect your research to broader implications in the field`
            ],
            news_article: [
                `Lead with the most newsworthy information in your opening`,
                `Use the inverted pyramid structure for information hierarchy`,
                `Include quotes from credible sources and stakeholders`,
                `Maintain objectivity while making complex issues accessible`,
                `Fact-check all claims and provide proper attribution`
            ],
            cover_letter: [
                `Address the specific position and company by name`,
                `Connect your experience directly to the job requirements`,
                `Show enthusiasm for the role and company mission`,
                `Quantify your achievements with specific metrics`,
                `Close with a confident call-to-action for next steps`
            ],
            poetry: [
                `Choose a form that enhances your poem's meaning and mood`,
                `Use concrete imagery that appeals to multiple senses`,
                `Pay attention to rhythm, sound, and line breaks`,
                `Show rather than tell emotions through specific details`,
                `Revise for precision - every word should serve a purpose`
            ],
            speech: [
                `Open with a compelling story or striking statistic`,
                `Organize your main points for easy audience comprehension`,
                `Use rhetorical devices like repetition and parallel structure`,
                `Include pauses and emphasis markers for effective delivery`,
                `End with a memorable call-to-action that inspires your audience`
            ]
        };

        const audiencePrompts: { [key: string]: string[] } = {
            admissions_committee: [
                "Demonstrate intellectual curiosity and love of learning",
                "Show how you'll contribute to campus diversity and community",
                "Connect your goals to the specific institution's resources"
            ],
            general_public: [
                "Use accessible language while maintaining depth",
                "Include relatable examples and universal themes",
                "Consider how your message serves your readers"
            ],
            academic_audience: [
                "Support claims with credible research and evidence",
                "Engage with existing scholarship in meaningful ways",
                "Use discipline-appropriate terminology and conventions"
            ],
            professional_audience: [
                "Focus on practical applications and real-world impact",
                "Demonstrate industry knowledge and relevant experience",
                "Present clear, actionable insights and recommendations"
            ]
        };

        const purposePrompts: { [key: string]: string[] } = {
            persuasive: [
                "Build your argument systematically with strong evidence",
                "Address and refute opposing viewpoints respectfully",
                "Use emotional appeals sparingly and effectively"
            ],
            informative: [
                "Present complex information in a clear, logical sequence",
                "Use examples and analogies to clarify difficult concepts",
                "Maintain objectivity while keeping readers engaged"
            ],
            personal_narrative: [
                "Use vivid, specific details to bring experiences to life",
                "Reflect on the significance and lessons learned",
                "Create emotional connection while maintaining focus"
            ],
            analytical: [
                "Break down complex topics into manageable components",
                "Support analysis with specific evidence and examples",
                "Draw meaningful conclusions from your examination"
            ]
        };

        const lengthPrompts: { [key: string]: string[] } = {
            short: [
                "Make every word count - eliminate unnecessary phrases",
                "Use concise, impactful language throughout",
                "Focus on one central idea or moment"
            ],
            medium: [
                "Develop your main points with sufficient detail and examples",
                "Ensure smooth transitions between sections",
                "Balance depth with breadability"
            ],
            long: [
                "Create a detailed outline to maintain focus across sections",
                "Develop multiple supporting arguments or themes",
                "Use varied sentence structures to maintain reader interest"
            ]
        };

        // Combine prompts based on requirements
        const selectedPrompts = [
            ...(typePrompts[docType] || typePrompts['college_essay']).slice(0, 2),
            ...(audiencePrompts[requirements.audience] || []).slice(0, 1),
            ...(purposePrompts[requirements.purpose] || []).slice(0, 1),
            ...(lengthPrompts[requirements.length] || []).slice(0, 1)
        ];

        // Add custom instruction-based prompts
        if (requirements.customInstructions.trim()) {
            selectedPrompts.push(`Consider this specific guidance: "${requirements.customInstructions}"`);
        }

        // Add progress-specific prompts
        const progressSpecificPrompts: { [key: string]: string[] } = {
            beginning: [
                "Start with a compelling hook to grab reader attention",
                "Clearly state your main thesis or purpose",
                "Create an outline to structure your ideas",
                "Focus on one main idea per paragraph"
            ],
            developing: [
                "Expand on your main points with more detail",
                "Add supporting evidence and examples",
                "Ensure each paragraph has a clear topic sentence",
                "Check that your ideas flow logically"
            ],
            substantial: [
                "Review and refine your argument structure",
                "Add sophisticated vocabulary and varied sentence patterns",
                "Strengthen weak paragraphs with additional evidence",
                "Polish transitions between major sections"
            ],
            comprehensive: [
                "Edit for clarity, conciseness, and impact",
                "Verify all citations and references are correct",
                "Proofread for grammar, spelling, and punctuation",
                "Consider the overall impression and final message"
            ]
        };

        selectedPrompts.push(...(progressSpecificPrompts[progress] || []).slice(0, 1));

        return selectedPrompts.slice(0, 8); // Return top 8 most relevant prompts
    };

    // Get contextual prompts based on analysis (legacy version)
    const getContextualPrompts = (docType: string, progress: string, stats: WordStats): string[] => {
        const basePrompts = [
            "Strengthen your thesis statement with more specific claims",
            "Add concrete examples to support your main arguments",
            "Improve transitions between paragraphs for better flow",
            "Enhance your conclusion with broader implications",
            "Use more varied sentence structures to improve readability"
        ];

        const typeSpecificPrompts: { [key: string]: string[] } = {
            college_essay: [
                "Show, don't tell - use specific anecdotes and examples",
                "Connect your experiences to personal growth and learning",
                "Demonstrate unique qualities that set you apart",
                "Avoid clichés and focus on authentic voice",
                "Address how you'll contribute to the campus community"
            ],
            research_paper: [
                "Cite more credible sources to strengthen your arguments",
                "Define key terms clearly for your audience",
                "Present counterarguments and address them thoroughly",
                "Use data and statistics to support your claims",
                "Ensure proper methodology in your analysis"
            ],
            argumentative: [
                "Present opposing viewpoints fairly before refuting them",
                "Use logical reasoning to connect evidence to claims",
                "Strengthen weak arguments with additional evidence",
                "Address potential objections to your position",
                "Use persuasive language while maintaining objectivity"
            ]
        };

        const progressPrompts: { [key: string]: string[] } = {
            beginning: [
                "Start with a compelling hook to grab reader attention",
                "Clearly state your main thesis or purpose",
                "Create an outline to structure your ideas",
                "Focus on one main idea per paragraph"
            ],
            developing: [
                "Expand on your main points with more detail",
                "Add supporting evidence and examples",
                "Ensure each paragraph has a clear topic sentence",
                "Check that your ideas flow logically"
            ],
            substantial: [
                "Review and refine your argument structure",
                "Add sophisticated vocabulary and varied sentence patterns",
                "Strengthen weak paragraphs with additional evidence",
                "Polish transitions between major sections"
            ],
            comprehensive: [
                "Edit for clarity, conciseness, and impact",
                "Verify all citations and references are correct",
                "Proofread for grammar, spelling, and punctuation",
                "Consider the overall impression and final message"
            ]
        };

        const contextPrompts = [
            ...basePrompts.slice(0, 2),
            ...(typeSpecificPrompts[docType] || []).slice(0, 3),
            ...(progressPrompts[progress] || []).slice(0, 2)
        ];

        return contextPrompts.slice(0, 7); // Return top 7 most relevant prompts
    };

    // Generate more inline comments
    const requestMoreInlineComments = async () => {
        if (!onStartReview) return;

        setRequestingMoreComments(true);
        try {
            // Trigger comprehensive analysis
            await onStartReview();
        } catch (error) {
            console.error('Error requesting more comments:', error);
        } finally {
            setRequestingMoreComments(false);
        }
    };

    // Generate intelligent prompts based on actual essay content
    const generatePromptsCallback = useCallback(() => {
        console.log('🔥 REFRESH BUTTON CLICKED! generatePromptsCallback called!', {
            contentLength: currentContent?.length,
            wordCount: wordStats.words,
            hasContent: !!currentContent,
            requirements: documentRequirements,
            currentTab: activeTab,
            timestamp: new Date().toISOString(),
            contentPreview: currentContent?.substring(0, 200) + '...'
        });

        if (!currentContent || currentContent.trim().length < 50) {
            console.log('❌ Content too short, clearing prompts. Length:', currentContent?.length);
            setIntelligentPrompts([]);
            return;
        }

        console.log('🚀 Starting REAL essay analysis...');
        setIsGeneratingPrompts(true);

        try {
            // Analyze the actual essay content in detail
            console.log('📊 Analyzing actual essay content...');
            const contentAnalysis = analyzeDocumentContent(currentContent);
            console.log('📊 Content analysis result:', contentAnalysis);

            const documentType = documentRequirements.type;
            const progress = analyzeWritingProgress(currentContent);
            console.log('📈 Progress analysis:', progress);

            // Generate REAL content-specific prompts based on actual essay
            const realPrompts = generateRealEssayPrompts(currentContent, contentAnalysis, wordStats, documentRequirements);

            console.log('✅ Generated REAL essay-specific prompts:', {
                documentType,
                progress,
                promptCount: realPrompts.length,
                prompts: realPrompts,
                requirements: documentRequirements,
                contentAnalysis
            });

            setIntelligentPrompts(realPrompts);
        } catch (error) {
            console.error('❌ Error generating prompts:', error);
            // Analyze essay and provide specific fallback prompts
            const essayThemes = extractEssayThemes(currentContent);
            setIntelligentPrompts([
                `Your essay about "${essayThemes.mainTopic}" needs stronger character development - show more internal thoughts`,
                `The pacing in your narrative could be improved - vary sentence length in the middle section`,
                `Add more sensory details to make readers feel present in the scene`,
                `Your dialogue needs more authenticity - make it sound more natural and revealing`,
                `The emotional impact could be stronger - explore the deeper meaning of this experience`,
                `Consider adding a clearer connection between the opening and closing of your story`
            ]);
        } finally {
            setIsGeneratingPrompts(false);
        }
    }, [currentContent, wordStats, documentRequirements, activeTab]);

    // Auto-generate prompts when content changes
    useEffect(() => {
        if (currentContent && currentContent.trim().length > 100) {
            generatePromptsCallback();
        }
    }, [currentContent, wordStats.words, generatePromptsCallback]);

    const tabs = [
        { id: 'editor', label: 'Edit Text', icon: Type },
        { id: 'info', label: 'Document Info', icon: FileText },
        { id: 'requirements', label: 'Requirements', icon: Settings },
        { id: 'prompts', label: 'Smart Prompts', icon: Lightbulb },
        { id: 'review', label: 'AI Review', icon: Brain }
    ];

    return (
        <div className="w-96 h-full flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
            {/* Sidebar with Vertical Tabs */}
            <div className="w-16 flex flex-col bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 rounded-l-lg">
                <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <Zap className="h-5 w-5 text-blue-500 mx-auto" />
                </div>

                <div className="flex-1 py-2 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full p-2 rounded-md transition-all group relative ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={tab.label}
                        >
                            <tab.icon className="w-4 h-4 mx-auto" />
                            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {tab.label}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                            <Clock className="w-2 h-2 mr-1" />
                            {wordStats.readingTime}m
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {tabs.find(t => t.id === activeTab)?.label || 'Essay Editor'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {wordStats.words} words • {wordStats.characters} characters
                    </p>
                </div>

                {/* Scrollable Content Area */}
                <ScrollArea className="flex-1 p-3">
                    {activeTab === 'editor' && (
                    <div className="space-y-4">
                        {/* Direct Text Editor */}
                        <Card>
                            <CardContent className="p-3">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-green-500" />
                                    Direct Essay Editor
                                </h4>

                                <div className="space-y-3">
                                    <textarea
                                        value={currentContent || ''}
                                        onChange={(e) => onContentChange?.(e.target.value)}
                                        placeholder="Start writing your essay here..."
                                        className="w-full h-60 text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        style={{ lineHeight: '1.6' }}
                                    />

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{wordStats.words} words • {wordStats.characters} characters</span>
                                        <span>{wordStats.sentences} sentences • {wordStats.paragraphs} paragraphs</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Formatting Tools */}
                        <Card>
                            <CardContent className="p-3">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    Quick Tools
                                </h4>

                                <div className="grid grid-cols-2 gap-2">
                                    {quickActions.map((action, index) => (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            onClick={action.action}
                                            className="h-8 text-xs flex items-center gap-1"
                                        >
                                            <action.icon className="w-3 h-3" />
                                            {action.label}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Find & Replace */}
                        <Card>
                            <CardContent className="p-3">
                                <button
                                    onClick={() => toggleSection('findReplace')}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Replace className="w-4 h-4" />
                                        Find & Replace
                                    </h4>
                                    {expandedSections.findReplace ?
                                        <ChevronUp className="w-4 h-4" /> :
                                        <ChevronDown className="w-4 h-4" />
                                    }
                                </button>

                                {expandedSections.findReplace && (
                                    <div className="mt-3 space-y-2">
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Find text..."
                                                value={findReplace.findText}
                                                onChange={(e) => setFindReplace(prev => ({ ...prev, findText: e.target.value }))}
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                placeholder="Replace with..."
                                                value={findReplace.replaceText}
                                                onChange={(e) => setFindReplace(prev => ({ ...prev, replaceText: e.target.value }))}
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {findReplace.matches} matches found
                                            </span>
                                            <Button
                                                size="sm"
                                                onClick={handleFindReplace}
                                                disabled={!findReplace.findText || findReplace.matches === 0}
                                                className="h-6 text-xs"
                                            >
                                                Replace All
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    {activeTab === 'info' && (
                    <div className="space-y-4">
                        {/* Word Count Section */}
                        <Card>
                            <CardContent className="p-3">
                                <button
                                    onClick={() => toggleSection('wordCount')}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Word Statistics</h4>
                                    {expandedSections.wordCount ?
                                        <ChevronUp className="w-4 h-4" /> :
                                        <ChevronDown className="w-4 h-4" />
                                    }
                                </button>

                                {expandedSections.wordCount && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Words:</span>
                                            <span className="font-medium">{wordStats.words.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Characters:</span>
                                            <span className="font-medium">{wordStats.characters.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">No spaces:</span>
                                            <span className="font-medium">{wordStats.charactersNoSpaces.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Sentences:</span>
                                            <span className="font-medium">{wordStats.sentences}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Paragraphs:</span>
                                            <span className="font-medium">{wordStats.paragraphs}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Read time:</span>
                                            <span className="font-medium">{wordStats.readingTime}m</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Find & Replace Section */}
                        <Card>
                            <CardContent className="p-3">
                                <button
                                    onClick={() => {
                                        toggleSection('findReplace');
                                        setShowFindReplace(!showFindReplace);
                                    }}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Replace className="w-4 h-4" />
                                        Find & Replace
                                    </h4>
                                    {expandedSections.findReplace ?
                                        <ChevronUp className="w-4 h-4" /> :
                                        <ChevronDown className="w-4 h-4" />
                                    }
                                </button>

                                {expandedSections.findReplace && (
                                    <div className="mt-3 space-y-2">
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Find text..."
                                                value={findReplace.findText}
                                                onChange={(e) => setFindReplace(prev => ({ ...prev, findText: e.target.value }))}
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                placeholder="Replace with..."
                                                value={findReplace.replaceText}
                                                onChange={(e) => setFindReplace(prev => ({ ...prev, replaceText: e.target.value }))}
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {findReplace.matches} matches found
                                            </span>
                                            <Button
                                                size="sm"
                                                onClick={handleFindReplace}
                                                disabled={!findReplace.findText || findReplace.matches === 0}
                                                className="h-6 text-xs"
                                            >
                                                Replace All
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardContent className="p-3">
                                <button
                                    onClick={() => toggleSection('quickActions')}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Quick Actions
                                    </h4>
                                    {expandedSections.quickActions ?
                                        <ChevronUp className="w-4 h-4" /> :
                                        <ChevronDown className="w-4 h-4" />
                                    }
                                </button>

                                {expandedSections.quickActions && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {quickActions.map((action, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                onClick={action.action}
                                                className="h-8 text-xs flex items-center gap-1"
                                            >
                                                <action.icon className="w-3 h-3" />
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    {activeTab === 'requirements' && (
                    <div className="space-y-4">
                        {/* Document Type */}
                        <Card>
                            <CardContent className="p-3">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-500" />
                                    Document Specifications
                                </h4>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                            Document Type
                                        </label>
                                        <select
                                            value={documentRequirements.type}
                                            onChange={(e) => setDocumentRequirements(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 bg-white dark:bg-slate-800"
                                        >
                                            <option value="college_essay">College Essay</option>
                                            <option value="short_story">Short Story</option>
                                            <option value="novella">Novella</option>
                                            <option value="research_paper">Research Paper</option>
                                            <option value="business_plan">Business Plan</option>
                                            <option value="personal_statement">Personal Statement</option>
                                            <option value="memoir">Memoir</option>
                                            <option value="screenplay">Screenplay</option>
                                            <option value="grant_proposal">Grant Proposal</option>
                                            <option value="blog_post">Blog Post</option>
                                            <option value="technical_documentation">Technical Documentation</option>
                                            <option value="marketing_copy">Marketing Copy</option>
                                            <option value="academic_thesis">Academic Thesis</option>
                                            <option value="news_article">News Article</option>
                                            <option value="cover_letter">Cover Letter</option>
                                            <option value="poetry">Poetry</option>
                                            <option value="speech">Speech</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                                Length
                                            </label>
                                            <select
                                                value={documentRequirements.length}
                                                onChange={(e) => setDocumentRequirements(prev => ({ ...prev, length: e.target.value }))}
                                                className="w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 bg-white dark:bg-slate-800"
                                            >
                                                <option value="short">Short (250-500)</option>
                                                <option value="medium">Medium (500-1000)</option>
                                                <option value="long">Long (1000+)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                                Tone
                                            </label>
                                            <select
                                                value={documentRequirements.tone}
                                                onChange={(e) => setDocumentRequirements(prev => ({ ...prev, tone: e.target.value }))}
                                                className="w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 bg-white dark:bg-slate-800"
                                            >
                                                <option value="authentic">Authentic</option>
                                                <option value="formal">Formal</option>
                                                <option value="conversational">Conversational</option>
                                                <option value="persuasive">Persuasive</option>
                                                <option value="analytical">Analytical</option>
                                                <option value="creative">Creative</option>
                                                <option value="professional">Professional</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                            Audience
                                        </label>
                                        <select
                                            value={documentRequirements.audience}
                                            onChange={(e) => setDocumentRequirements(prev => ({ ...prev, audience: e.target.value }))}
                                            className="w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 bg-white dark:bg-slate-800"
                                        >
                                            <option value="admissions_committee">Admissions Committee</option>
                                            <option value="general_public">General Public</option>
                                            <option value="academic_audience">Academic Audience</option>
                                            <option value="professional_audience">Professional Audience</option>
                                            <option value="hiring_manager">Hiring Manager</option>
                                            <option value="students">Students</option>
                                            <option value="peers">Peers</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                            Purpose
                                        </label>
                                        <select
                                            value={documentRequirements.purpose}
                                            onChange={(e) => setDocumentRequirements(prev => ({ ...prev, purpose: e.target.value }))}
                                            className="w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 bg-white dark:bg-slate-800"
                                        >
                                            <option value="personal_narrative">Personal Narrative</option>
                                            <option value="persuasive">Persuasive</option>
                                            <option value="informative">Informative</option>
                                            <option value="analytical">Analytical</option>
                                            <option value="creative_expression">Creative Expression</option>
                                            <option value="professional_advancement">Professional Advancement</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                            Subject/Topic
                                        </label>
                                        <Input
                                            value={documentRequirements.subject}
                                            onChange={(e) => setDocumentRequirements(prev => ({ ...prev, subject: e.target.value }))}
                                            placeholder="e.g., Computer Science, Leadership Experience..."
                                            className="h-8 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                            Custom Instructions
                                        </label>
                                        <textarea
                                            value={documentRequirements.customInstructions}
                                            onChange={(e) => setDocumentRequirements(prev => ({ ...prev, customInstructions: e.target.value }))}
                                            placeholder="Any specific requirements, guidelines, or focus areas..."
                                            className="w-full h-16 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            onClick={generatePromptsCallback}
                                            disabled={isGeneratingPrompts}
                                            className="w-full text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                            size="sm"
                                        >
                                            {isGeneratingPrompts ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    Generate Smart Prompts
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            onClick={() => {
                                                console.log('🔬 Test button clicked!');
                                                setIntelligentPrompts(['Test prompt 1', 'Test prompt 2', 'Test prompt 3']);
                                            }}
                                            variant="outline"
                                            className="w-full text-xs"
                                            size="sm"
                                        >
                                            Test Prompts (Debug)
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Requirements Summary */}
                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-3">
                                <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Current Settings</h5>
                                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Type:</span>
                                        <span className="font-medium capitalize">{documentRequirements.type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Audience:</span>
                                        <span className="font-medium capitalize">{documentRequirements.audience.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Purpose:</span>
                                        <span className="font-medium capitalize">{documentRequirements.purpose.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tone:</span>
                                        <span className="font-medium capitalize">{documentRequirements.tone}</span>
                                    </div>
                                    {documentRequirements.subject && (
                                        <div className="flex justify-between">
                                            <span>Subject:</span>
                                            <span className="font-medium">{documentRequirements.subject}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    {activeTab === 'prompts' && (
                    <div className="space-y-4">
                        {/* Intelligent Prompts Header */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        Smart Writing Prompts
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={generatePromptsCallback}
                                        disabled={isGeneratingPrompts || !currentContent || currentContent.trim().length < 50}
                                        className="h-6 text-xs"
                                    >
                                        {isGeneratingPrompts ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Refresh
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    AI-generated suggestions based on your document's content and progress
                                </p>
                            </CardContent>
                        </Card>

                        {/* Intelligent Prompts List */}
                        {intelligentPrompts.length > 0 ? (
                            <div className="space-y-2">
                                {intelligentPrompts.map((prompt, index) => (
                                    <Card key={index} className="border-l-4 border-blue-500">
                                        <CardContent className="p-3">
                                            <div className="flex items-start gap-2">
                                                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {prompt}
                                                    </p>
                                                    <div className="flex gap-1 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => copyToClipboard(prompt, `prompt-${index}`)}
                                                            className="h-5 px-2 text-xs text-slate-500 hover:text-slate-700"
                                                        >
                                                            {copiedText === `prompt-${index}` ? (
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
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => sendPromptToAI(prompt, index)}
                                                            disabled={Array.from(sendingPrompts).some(id => id.includes(`prompt-${index}`))}
                                                            className="h-5 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300"
                                                        >
                                                            {Array.from(sendingPrompts).some(id => id.includes(`prompt-${index}`)) ? (
                                                                <>
                                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                    Sending...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="w-3 h-3 mr-1" />
                                                                    Send to AI
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-slate-400 mb-2">
                                        <Lightbulb className="w-8 h-8 mx-auto mb-2" />
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                        {currentContent && currentContent.trim().length < 50
                                            ? "Write at least 50 characters to get smart prompts"
                                            : "Click refresh to generate intelligent prompts based on your content"
                                        }
                                    </p>
                                    {currentContent && currentContent.trim().length >= 50 && (
                                        <Button
                                            size="sm"
                                            onClick={generatePromptsCallback}
                                            disabled={isGeneratingPrompts}
                                            className="text-xs"
                                        >
                                            Generate Prompts
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Responses Section */}
                        {promptResponses.length > 0 && (
                            <div className="space-y-3">
                                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                                    <CardContent className="p-3">
                                        <h5 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            AI Responses ({promptResponses.length})
                                        </h5>
                                        <p className="text-xs text-purple-600 dark:text-purple-400">
                                            Context-aware feedback based on your document analysis
                                        </p>
                                    </CardContent>
                                </Card>

                                {promptResponses.map((response) => (
                                    <Card key={response.id} className="border-l-4 border-purple-500">
                                        <CardContent className="p-3">
                                            <div className="space-y-3">
                                                {/* Original Prompt */}
                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        📝 Your Prompt:
                                                    </p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                                        {response.prompt}
                                                    </p>
                                                </div>

                                                {/* AI Response */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="w-4 h-4 text-purple-600" />
                                                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                                            Claude AI Response:
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(response.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>

                                                    {response.isLoading ? (
                                                        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                                            <span className="text-sm text-purple-700 dark:text-purple-300">
                                                                Claude is analyzing your document and generating personalized feedback...
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                                            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                                                                {response.response.split('\n').map((line, lineIndex) => (
                                                                    <div key={lineIndex} className="mb-1">
                                                                        {line.trim() === '' ? <br /> : (
                                                                            <span className={
                                                                                line.startsWith('📝') || line.startsWith('✅') || line.startsWith('🎯') || line.startsWith('💡') || line.startsWith('📊')
                                                                                    ? 'font-medium text-purple-800 dark:text-purple-200'
                                                                                    : line.startsWith('-') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')
                                                                                        ? 'text-slate-600 dark:text-slate-400 ml-2'
                                                                                        : ''
                                                                            }>
                                                                                {line}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="flex gap-2 mt-3 pt-2 border-t border-purple-200 dark:border-purple-800">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => copyToClipboard(response.response, `response-${response.id}`)}
                                                                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800"
                                                                >
                                                                    {copiedText === `response-${response.id}` ? (
                                                                        <>
                                                                            <Check className="w-3 h-3 mr-1" />
                                                                            Copied
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy className="w-3 h-3 mr-1" />
                                                                            Copy Response
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Document Analysis Summary */}
                        {currentContent && currentContent.trim().length > 100 && (
                            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-3">
                                    <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Document Analysis
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Type:</span>
                                            <span className="font-medium capitalize">{detectDocumentType(currentContent).replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Progress:</span>
                                            <span className="font-medium capitalize">{analyzeWritingProgress(currentContent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Words:</span>
                                            <span className="font-medium">{wordStats.words}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Read time:</span>
                                            <span className="font-medium">{wordStats.readingTime}m</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    )}

                    {activeTab === 'review' && (
                    <div className="space-y-4">
                        {isReviewMode ? (
                            /* Review Mode Content */
                            <>
                                {activeAnnotation ? (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Target className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">Current Focus</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {reviewAnnotations.find(a => a.id === activeAnnotation)?.category || 'Reviewing suggestion...'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Review Mode Active</p>
                                        <p className="text-xs text-slate-500">Click highlighted text to see suggestions</p>
                                    </div>
                                )}

                                <Card>
                                    <CardContent className="p-4">
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Review Summary</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Total Issues</span>
                                                <Badge variant="outline">{reviewAnnotations.length}</Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-600 dark:text-slate-400">High Priority</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {reviewAnnotations.filter(a => a.severity === 'high').length}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Medium Priority</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {reviewAnnotations.filter(a => a.severity === 'medium').length}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Low Priority</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {reviewAnnotations.filter(a => a.severity === 'low').length}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <Button
                                                onClick={requestMoreInlineComments}
                                                disabled={requestingMoreComments}
                                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                size="sm"
                                            >
                                                {requestingMoreComments ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Get More Comments
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={onExitReview}
                                                variant="outline"
                                                className="w-full"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Exit Review Mode
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            /* Ready Mode Content */
                            <>
                                <div className="text-center py-8">
                                    <Brain className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                                    <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">AI Review Ready</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Get comprehensive feedback with interactive suggestions
                                    </p>

                                    <div className="space-y-2">
                                        <Button
                                            onClick={onStartReview}
                                            disabled={isAnalyzing || (!currentContent || currentContent.trim().length < 50)}
                                            className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 ${isAnalyzing ? 'animate-pulse' : ''}`}
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="h-4 w-4 mr-2" />
                                                    Start AI Review
                                                </>
                                            )}
                                        </Button>

                                        {currentContent && currentContent.trim().length >= 50 && (
                                            <Button
                                                onClick={requestMoreInlineComments}
                                                disabled={isAnalyzing || requestingMoreComments}
                                                variant="outline"
                                                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                                            >
                                                {requestingMoreComments ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Getting Comments...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        Quick Comment Analysis
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Card>
                                    <CardContent className="p-4">
                                        <h5 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            What You'll Get:
                                        </h5>
                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                                            <li className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <strong>Structure Analysis</strong> - Thesis, flow, organization
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                <strong>Rhetorical Enhancement</strong> - Persuasive techniques
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <strong>Clarity & Precision</strong> - Clear, concise writing
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                <strong>Tone Optimization</strong> - Essay style improvement
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                                    <CardContent className="p-4">
                                        <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" />
                                            AI-Powered Learning
                                        </h5>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Each suggestion includes recommendations to help you identify and fix similar issues independently.
                                        </p>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                    )}
                </ScrollArea>

                {/* Progress Indicator for Review Mode */}
                {isReviewMode && reviewProgress.total > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(reviewProgress.current / Math.max(reviewProgress.total, 1)) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                {reviewProgress.current}/{reviewProgress.total}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedEssayEditingPanel;