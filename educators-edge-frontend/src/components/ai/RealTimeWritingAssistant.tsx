import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    CheckCircle, AlertTriangle, Lightbulb, X, Wand2,
    Edit3, Copy, RotateCcw, Zap, Target
} from 'lucide-react';

export interface WritingSuggestion {
    id: string;
    type: 'grammar' | 'style' | 'clarity' | 'word_choice' | 'structure';
    severity: 'low' | 'medium' | 'high';
    position: { start: number; end: number };
    originalText: string;
    suggestion: string;
    explanation: string;
    confidence: number;
    autoFix?: boolean;
}

interface RealTimeWritingAssistantProps {
    content: string;
    onContentChange: (content: string) => void;
    onSuggestionApply?: (suggestion: WritingSuggestion) => void;
    className?: string;
}

const RealTimeWritingAssistant: React.FC<RealTimeWritingAssistantProps> = ({
    content,
    onContentChange,
    onSuggestionApply,
    className
}) => {
    const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    // Real-time analysis
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (content.length > 10) {
                analyzeText(content);
            }
        }, 1500);

        return () => clearTimeout(debounceTimer);
    }, [content]);

    const analyzeText = async (text: string) => {
        setIsAnalyzing(true);

        try {
            // Simulate AI analysis
            await new Promise(resolve => setTimeout(resolve, 800));

            const newSuggestions = generateSuggestions(text);
            setSuggestions(newSuggestions.filter(s => !dismissed.has(s.id)));

        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateSuggestions = (text: string): WritingSuggestion[] => {
        const suggestions: WritingSuggestion[] = [];

        // Grammar patterns
        const grammarPatterns = [
            {
                regex: /\b(its)\b(?=\s+(?:a|an|the|very|really|quite))/gi,
                suggestion: "it's",
                explanation: "Use 'it's' (it is) instead of 'its' (possessive) here",
                type: 'grammar' as const,
                severity: 'high' as const
            },
            {
                regex: /\b(your)\b(?=\s+(?:are|were|going|the))/gi,
                suggestion: "you're",
                explanation: "Use 'you're' (you are) instead of 'your' (possessive) here",
                type: 'grammar' as const,
                severity: 'high' as const
            },
            {
                regex: /\b(there)\b(?=\s+(?:are|were|going|the))/gi,
                suggestion: "they're",
                explanation: "Consider 'they're' (they are) or 'their' (possessive) instead",
                type: 'grammar' as const,
                severity: 'medium' as const
            }
        ];

        // Style patterns
        const stylePatterns = [
            {
                regex: /\b(very|really|quite|rather)\s+(\w+)/gi,
                suggestion: (match: RegExpMatchArray) => `more precise word than "${match[0]}"`,
                explanation: "Weak qualifiers can make writing less impactful. Consider a stronger, more specific word.",
                type: 'style' as const,
                severity: 'medium' as const
            },
            {
                regex: /\b(a lot of|lots of)\b/gi,
                suggestion: "many, numerous, or considerable",
                explanation: "Use more formal language in academic writing",
                type: 'style' as const,
                severity: 'medium' as const
            },
            {
                regex: /\b(thing|stuff|things)\b/gi,
                suggestion: "specific term",
                explanation: "Vague words weaken your argument. Be more specific.",
                type: 'clarity' as const,
                severity: 'medium' as const
            }
        ];

        // Word choice patterns
        const wordChoicePatterns = [
            {
                regex: /\b(good|bad|nice|big|small)\b/gi,
                suggestion: "more descriptive adjective",
                explanation: "Use more precise and vivid adjectives to strengthen your writing",
                type: 'word_choice' as const,
                severity: 'low' as const
            },
            {
                regex: /\b(said)\b/gi,
                suggestion: "argued, claimed, suggested, or asserted",
                explanation: "Use more specific verbs to convey the speaker's intent",
                type: 'word_choice' as const,
                severity: 'low' as const
            }
        ];

        // Structure patterns
        const structurePatterns = [
            {
                regex: /^[^.!?]*[.!?]\s*[^.!?]*[.!?]\s*[^.!?]*[.!?]\s*[^.!?]*[.!?].*$/gm,
                suggestion: "vary sentence length",
                explanation: "This paragraph has many short sentences. Consider combining some for better flow.",
                type: 'structure' as const,
                severity: 'low' as const
            }
        ];

        // Apply all patterns
        const allPatterns = [
            ...grammarPatterns,
            ...stylePatterns,
            ...wordChoicePatterns,
            ...structurePatterns
        ];

        allPatterns.forEach((pattern, patternIndex) => {
            let match;
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

            while ((match = regex.exec(text)) !== null && suggestions.length < 10) {
                const suggestion: WritingSuggestion = {
                    id: `${patternIndex}-${match.index}`,
                    type: pattern.type,
                    severity: pattern.severity,
                    position: { start: match.index, end: match.index + match[0].length },
                    originalText: match[0],
                    suggestion: typeof pattern.suggestion === 'function'
                        ? pattern.suggestion(match)
                        : pattern.suggestion,
                    explanation: pattern.explanation,
                    confidence: calculateConfidence(pattern.type, pattern.severity),
                    autoFix: pattern.severity === 'high' && pattern.type === 'grammar'
                };

                suggestions.push(suggestion);
            }
        });

        return suggestions;
    };

    const calculateConfidence = (type: string, severity: string): number => {
        let baseConfidence = 0.7;

        if (type === 'grammar') baseConfidence = 0.9;
        if (type === 'style') baseConfidence = 0.8;
        if (severity === 'high') baseConfidence += 0.1;

        return Math.min(0.95, baseConfidence);
    };

    const applySuggestion = (suggestion: WritingSuggestion) => {
        const { start, end } = suggestion.position;
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);

        let newText: string;

        if (suggestion.type === 'grammar' && suggestion.autoFix) {
            // Direct replacement for grammar fixes
            newText = beforeText + suggestion.suggestion + afterText;
        } else {
            // For style/clarity suggestions, just highlight for now
            // In a real implementation, you might want to show a dropdown with options
            newText = content;
            toast.info(`Suggestion: ${suggestion.explanation}`);
        }

        if (newText !== content) {
            onContentChange(newText);
            toast.success('Applied suggestion');
        }

        // Remove suggestion after applying
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

        if (onSuggestionApply) {
            onSuggestionApply(suggestion);
        }
    };

    const dismissSuggestion = (suggestionId: string) => {
        setDismissed(prev => new Set([...prev, suggestionId]));
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'medium': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
            case 'low': return <Target className="w-4 h-4 text-blue-500" />;
            default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'grammar': return 'bg-red-50 border-red-200 text-red-800';
            case 'style': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'clarity': return 'bg-blue-50 border-blue-200 text-blue-800';
            case 'word_choice': return 'bg-purple-50 border-purple-200 text-purple-800';
            case 'structure': return 'bg-green-50 border-green-200 text-green-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    if (suggestions.length === 0 && !isAnalyzing) {
        return null;
    }

    return (
        <div className={cn("space-y-2", className)}>
            {isAnalyzing && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600 animate-pulse" />
                            <span className="text-sm text-blue-800">Analyzing writing...</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className={cn("border", getTypeColor(suggestion.type))}>
                    <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                            {getSeverityIcon(suggestion.severity)}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                        {suggestion.type.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                        {Math.round(suggestion.confidence * 100)}% confidence
                                    </span>
                                </div>

                                <div className="text-sm mb-2">
                                    <span className="font-medium">"{suggestion.originalText}"</span>
                                    {suggestion.autoFix && (
                                        <>
                                            <span className="mx-2">→</span>
                                            <span className="text-green-600 font-medium">"{suggestion.suggestion}"</span>
                                        </>
                                    )}
                                </div>

                                <p className="text-xs text-gray-600 mb-3">
                                    {suggestion.explanation}
                                </p>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => applySuggestion(suggestion)}
                                        className="h-6 text-xs"
                                    >
                                        {suggestion.autoFix ? (
                                            <>
                                                <Wand2 className="w-3 h-3 mr-1" />
                                                Fix
                                            </>
                                        ) : (
                                            <>
                                                <Edit3 className="w-3 h-3 mr-1" />
                                                Apply
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(suggestion.suggestion);
                                            toast.success('Copied to clipboard');
                                        }}
                                        className="h-6 text-xs"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => dismissSuggestion(suggestion.id)}
                                className="h-6 w-6 p-0"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {suggestions.length > 5 && (
                <Card className="border-gray-200 bg-gray-50">
                    <CardContent className="p-3 text-center">
                        <p className="text-sm text-gray-600">
                            Showing top {suggestions.length} suggestions. Continue writing for more analysis.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RealTimeWritingAssistant;