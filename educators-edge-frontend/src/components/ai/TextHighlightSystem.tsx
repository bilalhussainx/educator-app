import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    AlertTriangle, CheckCircle, Info, Lightbulb, Zap, Edit3,
    Copy, ThumbsUp, ThumbsDown, X, Replace, Quote, Eye,
    ArrowRight, Paintbrush, Wand2
} from 'lucide-react';

export interface TextHighlight {
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
    confidence?: number;
}

export interface InlineEdit {
    id: string;
    start: number;
    end: number;
    originalText: string;
    suggestedText: string;
    reason: string;
    category: string;
    applied: boolean;
}

interface TextHighlightSystemProps {
    content: string;
    highlights: TextHighlight[];
    onApplyEdit: (edit: { start: number; end: number; replacement: string }) => void;
    onDismissHighlight: (highlightId: string) => void;
    onFeedback: (highlightId: string, feedback: 'positive' | 'negative') => void;
}

const TextHighlightSystem: React.FC<TextHighlightSystemProps> = ({
    content,
    highlights,
    onApplyEdit,
    onDismissHighlight,
    onFeedback
}) => {
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
    const [inlineEdits, setInlineEdits] = useState<InlineEdit[]>([]);

    // Generate inline edits from highlights
    useEffect(() => {
        const edits: InlineEdit[] = highlights
            .filter(h => h.replacementText)
            .map(h => ({
                id: `edit-${h.id}`,
                start: h.start,
                end: h.end,
                originalText: h.text,
                suggestedText: h.replacementText!,
                reason: h.message,
                category: h.category,
                applied: false
            }));
        setInlineEdits(edits);
    }, [highlights]);

    const getHighlightStyle = (highlight: TextHighlight) => {
        const baseClasses = "relative cursor-pointer transition-all";

        switch (highlight.type) {
            case 'error':
                return `${baseClasses} bg-red-100 border-b-2 border-red-300 hover:bg-red-200`;
            case 'suggestion':
                return `${baseClasses} bg-blue-100 border-b-2 border-blue-300 hover:bg-blue-200`;
            case 'improvement':
                return `${baseClasses} bg-orange-100 border-b-2 border-orange-300 hover:bg-orange-200`;
            case 'excellence':
                return `${baseClasses} bg-green-100 border-b-2 border-green-300 hover:bg-green-200`;
            case 'question':
                return `${baseClasses} bg-purple-100 border-b-2 border-purple-300 hover:bg-purple-200`;
            default:
                return `${baseClasses} bg-gray-100 border-b-2 border-gray-300 hover:bg-gray-200`;
        }
    };

    const getHighlightIcon = (highlight: TextHighlight) => {
        switch (highlight.type) {
            case 'error':
                return <AlertTriangle className="w-4 h-4 text-red-600" />;
            case 'suggestion':
                return <Lightbulb className="w-4 h-4 text-blue-600" />;
            case 'improvement':
                return <Zap className="w-4 h-4 text-orange-600" />;
            case 'excellence':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'question':
                return <Info className="w-4 h-4 text-purple-600" />;
            default:
                return <Eye className="w-4 h-4 text-gray-600" />;
        }
    };

    const getSeverityBadge = (severity: TextHighlight['severity']) => {
        switch (severity) {
            case 'critical':
                return <Badge variant="destructive" className="text-xs">Critical</Badge>;
            case 'high':
                return <Badge className="bg-orange-500 text-white text-xs">High</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-500 text-white text-xs">Medium</Badge>;
            case 'low':
                return <Badge variant="secondary" className="text-xs">Low</Badge>;
        }
    };

    const renderHighlightedText = () => {
        if (!content || highlights.length === 0) {
            return <div className="text-slate-600 italic">No highlights available</div>;
        }

        // Sort highlights by position
        const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

        let result: React.ReactNode[] = [];
        let lastIndex = 0;

        sortedHighlights.forEach((highlight, index) => {
            // Add text before highlight
            if (highlight.start > lastIndex) {
                result.push(
                    <span key={`text-${index}`}>
                        {content.slice(lastIndex, highlight.start)}
                    </span>
                );
            }

            // Add highlighted text
            result.push(
                <Popover key={highlight.id}>
                    <PopoverTrigger asChild>
                        <span
                            className={cn(
                                getHighlightStyle(highlight),
                                activeHighlight === highlight.id && "ring-2 ring-indigo-500"
                            )}
                            onClick={() => setActiveHighlight(highlight.id)}
                        >
                            {highlight.text}
                        </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" side="top">
                        <HighlightPopover
                            highlight={highlight}
                            onApplyEdit={onApplyEdit}
                            onDismiss={onDismissHighlight}
                            onFeedback={onFeedback}
                        />
                    </PopoverContent>
                </Popover>
            );

            lastIndex = highlight.end;
        });

        // Add remaining text
        if (lastIndex < content.length) {
            result.push(
                <span key="text-end">
                    {content.slice(lastIndex)}
                </span>
            );
        }

        return result;
    };

    const HighlightPopover: React.FC<{
        highlight: TextHighlight;
        onApplyEdit: (edit: { start: number; end: number; replacement: string }) => void;
        onDismiss: (highlightId: string) => void;
        onFeedback: (highlightId: string, feedback: 'positive' | 'negative') => void;
    }> = ({ highlight, onApplyEdit, onDismiss, onFeedback }) => (
        <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                    {getHighlightIcon(highlight)}
                    <div>
                        <h4 className="font-medium text-sm text-slate-900 capitalize">
                            {highlight.category} {highlight.type}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                            {getSeverityBadge(highlight.severity)}
                            {highlight.confidence && (
                                <Badge variant="outline" className="text-xs">
                                    {Math.round(highlight.confidence * 100)}% confident
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(highlight.id)}
                    className="h-6 w-6 p-0"
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>

            {/* Selected text */}
            <div className="bg-slate-50 p-3 rounded-lg border">
                <p className="text-xs text-slate-600 mb-1">Selected text:</p>
                <p className="text-sm font-medium text-slate-900 italic">"{highlight.text}"</p>
            </div>

            {/* Message */}
            <div className="text-sm text-slate-700">
                {highlight.message}
            </div>

            {/* Suggestion */}
            {highlight.suggestion && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">Suggestion:</p>
                    <p className="text-sm text-blue-800">{highlight.suggestion}</p>
                </div>
            )}

            {/* Replacement text */}
            {highlight.replacementText && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">Suggested replacement:</p>
                    <p className="text-sm text-green-800 font-medium">"{highlight.replacementText}"</p>
                </div>
            )}

            {/* Explanation */}
            {highlight.explanation && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    <strong>Why:</strong> {highlight.explanation}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex space-x-1">
                    {highlight.replacementText && (
                        <Button
                            size="sm"
                            onClick={() => {
                                onApplyEdit({
                                    start: highlight.start,
                                    end: highlight.end,
                                    replacement: highlight.replacementText!
                                });
                                toast.success('Edit applied successfully');
                            }}
                            className="text-xs bg-green-600 hover:bg-green-700"
                        >
                            <Replace className="w-3 h-3 mr-1" />
                            Apply Edit
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            navigator.clipboard.writeText(highlight.suggestion || highlight.message);
                            toast.success('Copied to clipboard');
                        }}
                        className="text-xs"
                    >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                    </Button>
                </div>

                <div className="flex space-x-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFeedback(highlight.id, 'positive')}
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    >
                        <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFeedback(highlight.id, 'negative')}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                        <ThumbsDown className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const InlineEditsPanel = () => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-slate-900">Suggested Edits</h4>
                <Badge variant="secondary" className="text-xs">
                    {inlineEdits.filter(e => !e.applied).length} pending
                </Badge>
            </div>

            {inlineEdits.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {inlineEdits.map((edit) => (
                        <Card key={edit.id} className={cn(
                            "border transition-all",
                            edit.applied ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
                        )}>
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {edit.category}
                                    </Badge>
                                    {edit.applied && (
                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Applied
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs">
                                        <span className="text-slate-600">Original: </span>
                                        <span className="font-medium line-through text-red-600">"{edit.originalText}"</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-600">Suggested: </span>
                                        <span className="font-medium text-green-600">"{edit.suggestedText}"</span>
                                    </div>
                                    <p className="text-xs text-slate-600">{edit.reason}</p>
                                </div>

                                {!edit.applied && (
                                    <div className="flex space-x-1 mt-3">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                onApplyEdit({
                                                    start: edit.start,
                                                    end: edit.end,
                                                    replacement: edit.suggestedText
                                                });
                                                setInlineEdits(prev =>
                                                    prev.map(e => e.id === edit.id ? { ...e, applied: true } : e)
                                                );
                                                toast.success('Edit applied');
                                            }}
                                            className="text-xs bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Apply
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setInlineEdits(prev => prev.filter(e => e.id !== edit.id));
                                                toast.info('Edit dismissed');
                                            }}
                                            className="text-xs"
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Dismiss
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <Edit3 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No edits suggested yet</p>
                </div>
            )}
        </div>
    );

    const HighlightsSummary = () => {
        const errorCount = highlights.filter(h => h.type === 'error').length;
        const suggestionCount = highlights.filter(h => h.type === 'suggestion').length;
        const improvementCount = highlights.filter(h => h.type === 'improvement').length;
        const excellenceCount = highlights.filter(h => h.type === 'excellence').length;

        return (
            <div className="space-y-3">
                <h4 className="font-medium text-sm text-slate-900">Highlights Summary</h4>

                <div className="grid grid-cols-2 gap-2">
                    {errorCount > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span className="text-red-600">{errorCount} errors</span>
                        </div>
                    )}
                    {suggestionCount > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                            <Lightbulb className="w-3 h-3 text-blue-600" />
                            <span className="text-blue-600">{suggestionCount} suggestions</span>
                        </div>
                    )}
                    {improvementCount > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                            <Zap className="w-3 h-3 text-orange-600" />
                            <span className="text-orange-600">{improvementCount} improvements</span>
                        </div>
                    )}
                    {excellenceCount > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">{excellenceCount} excellent</span>
                        </div>
                    )}
                </div>

                {highlights.length === 0 && (
                    <div className="text-center py-4">
                        <Paintbrush className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No highlights yet</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Highlighted Text Display */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-slate-900">Text with Highlights</h4>
                        <Badge variant="outline" className="text-xs">
                            {highlights.length} highlights
                        </Badge>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {renderHighlightedText()}
                    </div>
                </CardContent>
            </Card>

            {/* Summary and Edits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <HighlightsSummary />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <InlineEditsPanel />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TextHighlightSystem;