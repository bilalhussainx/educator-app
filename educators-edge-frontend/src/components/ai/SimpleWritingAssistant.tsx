import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    MessageCircle, Send, FileText, Eye, CheckCircle, ArrowRight,
    BookOpen, Edit3, Target, Lightbulb, Search
} from 'lucide-react';

// Repository of proven writing prompts
const WRITING_PROMPTS_REPOSITORY = {
    // Academic Essay Prompts
    academic: [
        {
            id: 'thesis-review',
            prompt: 'Review this paragraph/sentence for thesis clarity. Is the main argument specific, arguable, and well-defined? How can it be improved?',
            category: 'Structure',
            usedFor: ['introduction', 'thesis', 'argument']
        },
        {
            id: 'evidence-analysis',
            prompt: 'Analyze this paragraph: Does it provide enough evidence to support its main point? Is the evidence credible and relevant?',
            category: 'Evidence',
            usedFor: ['body', 'support', 'proof']
        },
        {
            id: 'paragraph-structure',
            prompt: 'Check this paragraph structure: Does it have a clear topic sentence, supporting evidence, analysis, and conclusion?',
            category: 'Structure',
            usedFor: ['body', 'paragraph', 'organization']
        },
        {
            id: 'transition-flow',
            prompt: 'Examine the connections between these paragraphs. Are there clear transitions? How do the ideas flow from one to the next?',
            category: 'Flow',
            usedFor: ['transitions', 'connections', 'flow']
        },
        {
            id: 'conclusion-strength',
            prompt: 'Review this conclusion: Does it effectively summarize the main points and reinforce the thesis without introducing new information?',
            category: 'Structure',
            usedFor: ['conclusion', 'summary', 'ending']
        }
    ],

    // Narrative & Autobiography Prompts
    narrative: [
        {
            id: 'story-focus',
            prompt: 'What is the central theme or lesson in this narrative? Does every paragraph contribute to this main story?',
            category: 'Theme',
            usedFor: ['focus', 'theme', 'purpose']
        },
        {
            id: 'vivid-details',
            prompt: 'Identify places where you can add sensory details (sight, sound, smell, touch, taste) to make this scene more vivid.',
            category: 'Description',
            usedFor: ['details', 'imagery', 'senses']
        },
        {
            id: 'dialogue-check',
            prompt: 'Review the dialogue in this section: Does it sound natural? Does it advance the story or reveal character?',
            category: 'Dialogue',
            usedFor: ['conversation', 'characters', 'speech']
        },
        {
            id: 'emotion-connection',
            prompt: 'How does this paragraph connect emotionally with readers? What specific emotions are you trying to convey?',
            category: 'Emotion',
            usedFor: ['feelings', 'connection', 'emotion']
        },
        {
            id: 'chronology-flow',
            prompt: 'Check the timeline: Is the sequence of events clear? Would readers be able to follow what happened when?',
            category: 'Timeline',
            usedFor: ['sequence', 'time', 'order']
        }
    ],

    // General Writing Improvement Prompts
    general: [
        {
            id: 'clarity-check',
            prompt: 'Read this sentence/paragraph out loud. Is it clear and easy to understand? Are there any confusing parts?',
            category: 'Clarity',
            usedFor: ['understanding', 'confusion', 'clarity']
        },
        {
            id: 'word-choice',
            prompt: 'Look for weak or vague words (very, really, thing, stuff). What stronger, more specific words could replace them?',
            category: 'Vocabulary',
            usedFor: ['words', 'vocabulary', 'precision']
        },
        {
            id: 'sentence-variety',
            prompt: 'Check sentence lengths and structures. Do you have a good mix of short and long sentences? Any repetitive patterns?',
            category: 'Style',
            usedFor: ['sentences', 'variety', 'rhythm']
        },
        {
            id: 'redundancy-check',
            prompt: 'Are you repeating the same ideas or words? What can be cut to make the writing more concise?',
            category: 'Concision',
            usedFor: ['repetition', 'redundancy', 'cutting']
        },
        {
            id: 'audience-fit',
            prompt: 'Is this appropriate for your intended audience? Is the tone and language level right for who will read this?',
            category: 'Audience',
            usedFor: ['tone', 'audience', 'appropriateness']
        }
    ],

    // Revision-Specific Prompts
    revision: [
        {
            id: 'reverse-outline',
            prompt: 'Summarize each paragraph in one sentence. Do these summaries show a logical progression of ideas?',
            category: 'Organization',
            usedFor: ['structure', 'logic', 'progression']
        },
        {
            id: 'paragraph-purpose',
            prompt: 'What is this paragraph trying to accomplish? Does every sentence in it support that purpose?',
            category: 'Purpose',
            usedFor: ['focus', 'purpose', 'relevance']
        },
        {
            id: 'opening-strength',
            prompt: 'Does your opening sentence/paragraph grab attention and clearly introduce your topic? How could it be more engaging?',
            category: 'Engagement',
            usedFor: ['introduction', 'hook', 'beginning']
        },
        {
            id: 'specificity-check',
            prompt: 'Where can you be more specific? Replace general statements with concrete examples or precise details.',
            category: 'Specificity',
            usedFor: ['details', 'examples', 'precision']
        }
    ]
};

// Message interface
interface WritingMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    relatedText?: string;
    suggestedPrompts?: string[];
}

interface SimpleWritingAssistantProps {
    content: string;
    selectedText?: string;
    onContentChange: (content: string) => void;
    onTextSelect?: (text: string, position: { start: number; end: number }) => void;
}

const SimpleWritingAssistant: React.FC<SimpleWritingAssistantProps> = ({
    content,
    selectedText,
    onContentChange,
    onTextSelect
}) => {
    const [messages, setMessages] = useState<WritingMessage[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detectedWritingType, setDetectedWritingType] = useState<'academic' | 'narrative' | 'general'>('general');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize with welcome message
    useEffect(() => {
        const welcomeMessage: WritingMessage = {
            id: 'welcome',
            role: 'assistant',
            content: `**Simple Writing Assistant**

I'll help you improve your writing using proven techniques. Here's how I work:

📝 **Text Connection**: Select any part of your essay and I'll provide specific feedback
🎯 **Smart Prompts**: I use a repository of proven writing improvement prompts
✏️ **Practical Help**: Direct suggestions for revision and improvement

**Get Started:**
• Select a paragraph or sentence from your essay
• Ask specific questions like "How's my introduction?" or "Check this paragraph"
• I'll connect my feedback directly to your text

**Quick Actions:**`,
            timestamp: new Date(),
            suggestedPrompts: [
                'Check my introduction',
                'Review this paragraph structure',
                'How can I improve this sentence?',
                'Is my thesis clear?',
                'Add more details here'
            ]
        };
        setMessages([welcomeMessage]);
    }, []);

    // Analyze content to detect writing type
    useEffect(() => {
        if (content.length > 100) {
            const type = detectWritingType(content);
            setDetectedWritingType(type);
        }
    }, [content]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const detectWritingType = (text: string): 'academic' | 'narrative' | 'general' => {
        const academicIndicators = /\b(thesis|argument|research|evidence|analysis|conclude|argue|claim)\b/gi;
        const narrativeIndicators = /\b(story|experience|remember|felt|happened|childhood|journey|memoir)\b/gi;

        const academicMatches = (text.match(academicIndicators) || []).length;
        const narrativeMatches = (text.match(narrativeIndicators) || []).length;

        if (academicMatches > narrativeMatches && academicMatches > 2) return 'academic';
        if (narrativeMatches > academicMatches && narrativeMatches > 2) return 'narrative';
        return 'general';
    };

    const findRelevantPrompts = (userQuery: string, writingType: string): any[] => {
        const allPrompts = [
            ...WRITING_PROMPTS_REPOSITORY[writingType],
            ...WRITING_PROMPTS_REPOSITORY.general,
            ...WRITING_PROMPTS_REPOSITORY.revision
        ];

        const queryLower = userQuery.toLowerCase();

        // Match prompts based on keywords
        return allPrompts.filter(prompt => {
            return prompt.usedFor.some(keyword => queryLower.includes(keyword)) ||
                   prompt.category.toLowerCase().includes(queryLower) ||
                   prompt.prompt.toLowerCase().includes(queryLower);
        }).slice(0, 3); // Limit to top 3 most relevant
    };

    const analyzeTextWithPrompts = (text: string, prompts: any[]): string => {
        if (!text || !prompts.length) {
            return "Please select some text from your essay for me to analyze.";
        }

        let analysis = `**Analysis of Selected Text:**\n"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\n`;

        prompts.forEach((prompt, index) => {
            analysis += `**${prompt.category} Check:**\n`;
            analysis += `${prompt.prompt}\n\n`;

            // Provide specific analysis based on the prompt
            analysis += generateSpecificAnalysis(text, prompt);
            analysis += '\n\n';
        });

        return analysis;
    };

    const generateSpecificAnalysis = (text: string, prompt: any): string => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/);

        switch (prompt.id) {
            case 'thesis-review':
                const hasThesis = text.toLowerCase().includes('thesis') ||
                                text.toLowerCase().includes('argue') ||
                                text.toLowerCase().includes('claim');
                return hasThesis
                    ? "✅ Contains thesis-related language. Check if it's specific and arguable."
                    : "⚠️ No clear thesis statement detected. Consider adding your main argument.";

            case 'paragraph-structure':
                const hasTopicSentence = sentences.length > 0;
                const hasEvidence = text.toLowerCase().includes('evidence') ||
                                  text.toLowerCase().includes('example') ||
                                  text.toLowerCase().includes('research');
                return `Structure check: ${hasTopicSentence ? '✅ Has opening sentence' : '⚠️ Needs topic sentence'} | ${hasEvidence ? '✅ Contains evidence' : '⚠️ Needs supporting evidence'}`;

            case 'word-choice':
                const weakWords = text.match(/\b(very|really|quite|thing|stuff)\b/gi) || [];
                return weakWords.length > 0
                    ? `⚠️ Found ${weakWords.length} weak words: ${weakWords.join(', ')}. Consider stronger alternatives.`
                    : "✅ No obvious weak words detected.";

            case 'sentence-variety':
                const avgLength = words.length / sentences.length;
                const variety = sentences.length > 3 ? "Good sentence count" : "Consider adding more sentences";
                return `Average sentence length: ${Math.round(avgLength)} words. ${variety}`;

            case 'vivid-details':
                const sensoryWords = text.match(/\b(see|hear|feel|smell|taste|touch|bright|loud|soft|rough|sweet)\b/gi) || [];
                return sensoryWords.length > 0
                    ? `✅ Found ${sensoryWords.length} sensory details. Good use of vivid language.`
                    : "⚠️ Consider adding sensory details to make the scene more vivid.";

            default:
                return "Consider the specific question above and revise accordingly.";
        }
    };

    const handleUserMessage = async () => {
        if (!currentInput.trim()) return;

        const userMessage: WritingMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: currentInput,
            timestamp: new Date(),
            relatedText: selectedText
        };

        setMessages(prev => [...prev, userMessage]);
        const query = currentInput;
        setCurrentInput('');
        setIsAnalyzing(true);

        try {
            // Find relevant prompts based on user query and detected writing type
            const relevantPrompts = findRelevantPrompts(query, detectedWritingType);

            // Generate response using the text and prompts
            const responseContent = selectedText
                ? analyzeTextWithPrompts(selectedText, relevantPrompts)
                : generateGeneralResponse(query, relevantPrompts);

            // Create follow-up prompt suggestions
            const followUpPrompts = relevantPrompts.length > 0
                ? relevantPrompts.map(p => p.prompt.split('?')[0] + '?').slice(0, 3)
                : getDefaultPrompts(detectedWritingType);

            const assistantMessage: WritingMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
                relatedText: selectedText,
                suggestedPrompts: followUpPrompts
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
            console.error('Error processing message:', error);
            toast.error('Sorry, there was an error processing your request.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateGeneralResponse = (query: string, prompts: any[]): string => {
        const queryLower = query.toLowerCase();

        if (queryLower.includes('introduction') || queryLower.includes('intro')) {
            return generateIntroductionGuidance();
        }

        if (queryLower.includes('conclusion')) {
            return generateConclusionGuidance();
        }

        if (queryLower.includes('paragraph') || queryLower.includes('structure')) {
            return generateParagraphGuidance();
        }

        if (queryLower.includes('thesis')) {
            return generateThesisGuidance();
        }

        // Use relevant prompts if found
        if (prompts.length > 0) {
            let response = `**Here are proven techniques for: "${query}"**\n\n`;
            prompts.forEach((prompt, index) => {
                response += `**${index + 1}. ${prompt.category}:**\n${prompt.prompt}\n\n`;
            });
            response += "Select specific text from your essay and ask me to apply these techniques!";
            return response;
        }

        return `I understand you're asking about: "${query}"\n\nTo give you the most helpful feedback, please:\n1. Select the specific text you want me to review\n2. Ask a specific question about that text\n\nExample: Select a paragraph and ask "How's the structure?" or "Check this introduction"`;
    };

    const generateIntroductionGuidance = (): string => {
        return `**Introduction Review Guide**

Here's how to check your introduction:

🎯 **Hook Check**: Does your first sentence grab attention?
📍 **Context**: Do you provide necessary background?
🎪 **Thesis**: Is your main argument clear and specific?
🗺️ **Roadmap**: Do readers know what to expect?

**Select your introduction paragraph and I'll analyze it using these criteria!**`;
    };

    const generateConclusionGuidance = (): string => {
        return `**Conclusion Review Guide**

Strong conclusions should:

🔄 **Restate**: Reaffirm your thesis (don't just repeat)
📋 **Summarize**: Briefly review main points
🌟 **Significance**: Why does this matter?
🚫 **Avoid**: New information or weak phrases like "in conclusion"

**Select your conclusion and I'll help you strengthen it!**`;
    };

    const generateParagraphGuidance = (): string => {
        return `**Paragraph Structure Guide**

Each body paragraph needs:

📝 **Topic Sentence**: Clear main idea
🔍 **Evidence**: Facts, quotes, examples
🧠 **Analysis**: Explain how evidence supports your point
🔗 **Transition**: Connect to next paragraph

**Select a paragraph and I'll check its structure!**`;
    };

    const generateThesisGuidance = (): string => {
        return `**Thesis Statement Guide**

A strong thesis is:

🎯 **Specific**: Not vague or general
⚔️ **Arguable**: Someone could disagree
📍 **Clear**: Easy to understand
🎪 **Focused**: Covers what your essay will prove

**Select your thesis statement for specific feedback!**`;
    };

    const getDefaultPrompts = (writingType: string): string[] => {
        const defaults = {
            academic: [
                'Is my thesis clear and specific?',
                'Does this paragraph support my argument?',
                'How can I strengthen this evidence?'
            ],
            narrative: [
                'Does this scene feel vivid?',
                'Is the timeline clear?',
                'How can I show more emotion?'
            ],
            general: [
                'Is this sentence clear?',
                'Can I be more specific here?',
                'How does this flow?'
            ]
        };
        return defaults[writingType] || defaults.general;
    };

    const handlePromptSuggestion = (prompt: string) => {
        setCurrentInput(prompt);
        inputRef.current?.focus();
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border">
            {/* Simple Header */}
            <div className="p-4 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Writing Assistant</h3>
                            <p className="text-sm text-slate-600">
                                {detectedWritingType === 'academic' ? '📚 Academic Essay' :
                                 detectedWritingType === 'narrative' ? '📖 Narrative/Story' :
                                 '✏️ General Writing'} • Select text for feedback
                            </p>
                        </div>
                    </div>
                    {selectedText && (
                        <Badge variant="outline" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            {selectedText.length} chars selected
                        </Badge>
                    )}
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
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-white" />
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[80%] rounded-lg p-3",
                                    message.role === 'user'
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-50 border"
                                )}>
                                    {message.relatedText && (
                                        <div className="mb-2 p-2 bg-slate-100 rounded text-xs">
                                            <span className="font-medium">Selected text: </span>
                                            "{message.relatedText.substring(0, 60)}..."
                                        </div>
                                    )}

                                    <div className="text-sm whitespace-pre-wrap">
                                        {message.content}
                                    </div>

                                    {message.suggestedPrompts && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs font-medium text-slate-600">Try these:</p>
                                            <div className="space-y-1">
                                                {message.suggestedPrompts.map((prompt, idx) => (
                                                    <Button
                                                        key={idx}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePromptSuggestion(prompt)}
                                                        className="w-full justify-start text-xs h-8"
                                                    >
                                                        <ArrowRight className="w-3 h-3 mr-1" />
                                                        {prompt}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-400 mt-2">
                                        {message.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm">You</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isAnalyzing && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-white animate-pulse" />
                            </div>
                            <div className="bg-slate-50 border rounded-lg p-3">
                                <div className="text-sm text-slate-600">Analyzing your text...</div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
                <div className="flex gap-2 mb-3">
                    <Input
                        ref={inputRef}
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Ask about your writing: 'Check my introduction', 'How's this paragraph?', 'Is this clear?'"
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleUserMessage()}
                        className="flex-1"
                        disabled={isAnalyzing}
                    />
                    <Button
                        onClick={handleUserMessage}
                        disabled={!currentInput.trim() || isAnalyzing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromptSuggestion('Check my introduction')}
                        className="text-xs"
                    >
                        <Target className="w-3 h-3 mr-1" />
                        Introduction
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromptSuggestion('Review this paragraph structure')}
                        className="text-xs"
                    >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Structure
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromptSuggestion('How can I be more specific here?')}
                        className="text-xs"
                    >
                        <Search className="w-3 h-3 mr-1" />
                        Clarity
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromptSuggestion('Is my thesis clear?')}
                        className="text-xs"
                    >
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Thesis
                    </Button>
                </div>

                {selectedText && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border">
                        <p className="text-xs text-blue-700 font-medium mb-1">Text Selected:</p>
                        <p className="text-xs text-blue-600">"{selectedText.substring(0, 100)}..."</p>
                        <Button
                            size="sm"
                            className="mt-2 h-6 text-xs"
                            onClick={() => handlePromptSuggestion('Analyze this selected text')}
                        >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Analyze Selection
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleWritingAssistant;