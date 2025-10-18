/**
 * AI Writing Assistant (Powered by Claude)
 *
 * Real-time, interactive AI writing assistance (migrated from Gemini to Claude Haiku)
 *
 * Features:
 * - Floating assistant button (always accessible)
 * - Quick actions: Rewrite, Shorten, Elaborate, Change tone
 * - "Help me write" - Generate content from scratch
 * - Inline suggestions with accept/reject
 * - Context-aware assistance
 * - Real-time grammar and style improvements
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sparkles,
    Wand2,
    RotateCcw,
    Minimize2,
    Maximize2,
    ArrowRight,
    Check,
    X,
    Lightbulb,
    Zap,
    MessageSquare,
    RefreshCw,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

interface GeminiAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    requiresSelection?: boolean;
}

interface GeminiWritingAssistantProps {
    editor: any; // TipTap editor instance
    selectedText?: string;
    cursorPosition?: number;
    onTextInsert: (text: string) => void;
    onTextReplace: (oldText: string, newText: string) => void;
}

const GeminiWritingAssistant: React.FC<GeminiWritingAssistantProps> = ({
    editor,
    selectedText = '',
    cursorPosition = 0,
    onTextInsert,
    onTextReplace
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSuggestion, setGeneratedSuggestion] = useState<string>('');
    const [promptInput, setPromptInput] = useState('');
    const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
    const [inlineSuggestion, setInlineSuggestion] = useState('');
    const [suggestionHistory, setSuggestionHistory] = useState<string[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

    // Quick actions available in the assistant
    const quickActions: GeminiAction[] = [
        {
            id: 'help-write',
            label: 'Help me write',
            icon: <Sparkles className="w-4 h-4" />,
            description: 'Generate content based on a prompt',
            requiresSelection: false
        },
        {
            id: 'rewrite',
            label: 'Rewrite',
            icon: <RefreshCw className="w-4 h-4" />,
            description: 'Improve selected text',
            requiresSelection: true
        },
        {
            id: 'shorten',
            label: 'Make shorter',
            icon: <Minimize2 className="w-4 h-4" />,
            description: 'Condense text while keeping meaning',
            requiresSelection: true
        },
        {
            id: 'elaborate',
            label: 'Elaborate',
            icon: <Maximize2 className="w-4 h-4" />,
            description: 'Expand with more details',
            requiresSelection: true
        },
        {
            id: 'formalize',
            label: 'Formalize',
            icon: <MessageSquare className="w-4 h-4" />,
            description: 'Make more professional',
            requiresSelection: true
        },
        {
            id: 'casual',
            label: 'Make casual',
            icon: <MessageSquare className="w-4 h-4" />,
            description: 'Make more conversational',
            requiresSelection: true
        },
        {
            id: 'continue',
            label: 'Continue writing',
            icon: <ArrowRight className="w-4 h-4" />,
            description: 'Continue from where you left off',
            requiresSelection: false
        },
        {
            id: 'fix-grammar',
            label: 'Fix grammar',
            icon: <Check className="w-4 h-4" />,
            description: 'Correct grammar and spelling',
            requiresSelection: true
        }
    ];

    // Handle quick action click
    const handleQuickAction = async (actionId: string) => {
        const action = quickActions.find(a => a.id === actionId);

        if (!action) return;

        // Check if action requires selection
        if (action.requiresSelection && !selectedText) {
            toast.error('Please select some text first');
            return;
        }

        setActiveAction(actionId);
        setIsGenerating(true);
        setGeneratedSuggestion('');

        try {
            const response = await apiClient.post('/api/gemini-assistant/quick-action', {
                action: actionId,
                selectedText,
                documentContext: editor?.getText() || '',
                cursorPosition,
                customPrompt: actionId === 'help-write' ? promptInput : null
            });

            if (response.data.success) {
                const suggestion = response.data.suggestion;
                setGeneratedSuggestion(suggestion);
                setSuggestionHistory(prev => [...prev, suggestion]);
                setCurrentHistoryIndex(suggestionHistory.length);

                // Auto-show inline suggestion for certain actions
                if (['continue', 'help-write'].includes(actionId)) {
                    setInlineSuggestion(suggestion);
                    setShowInlineSuggestion(true);
                }
            } else {
                throw new Error(response.data.error || 'Failed to generate suggestion');
            }
        } catch (error: any) {
            console.error('Gemini action error:', error);
            toast.error(error.response?.data?.error || 'Failed to generate suggestion');
        } finally {
            setIsGenerating(false);
        }
    };

    // Accept the generated suggestion
    const acceptSuggestion = () => {
        if (!generatedSuggestion) return;

        if (selectedText) {
            onTextReplace(selectedText, generatedSuggestion);
        } else {
            onTextInsert(generatedSuggestion);
        }

        toast.success('Suggestion applied!');
        setGeneratedSuggestion('');
        setActiveAction(null);
        setShowInlineSuggestion(false);
    };

    // Reject the suggestion
    const rejectSuggestion = () => {
        setGeneratedSuggestion('');
        setActiveAction(null);
        setShowInlineSuggestion(false);
    };

    // Regenerate suggestion
    const regenerateSuggestion = () => {
        if (activeAction) {
            handleQuickAction(activeAction);
        }
    };

    // Navigate suggestion history
    const navigateHistory = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentHistoryIndex > 0) {
            const newIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(newIndex);
            setGeneratedSuggestion(suggestionHistory[newIndex]);
        } else if (direction === 'next' && currentHistoryIndex < suggestionHistory.length - 1) {
            const newIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(newIndex);
            setGeneratedSuggestion(suggestionHistory[newIndex]);
        }
    };

    // Floating button that's always visible
    if (!isOpen) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                >
                    <Sparkles className="w-6 h-6 text-white" />
                </Button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-auto' : 'w-[450px]'}`}>
            <Card className="shadow-2xl border-2 border-purple-200">
                {/* Header */}
                <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            {!isMinimized && (
                                <div>
                                    <h3 className="font-semibold text-sm">Writing Assistant</h3>
                                    <p className="text-xs text-gray-500">Powered by AI</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <CardContent className="p-4 space-y-4">
                        {/* Selection indicator */}
                        {selectedText && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-xs text-yellow-800 font-medium mb-1">Selected text:</p>
                                <p className="text-xs text-gray-700 italic line-clamp-2">
                                    "{selectedText.substring(0, 100)}..."
                                </p>
                            </div>
                        )}

                        {/* Help me write input */}
                        {!activeAction && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    <Lightbulb className="w-4 h-4 inline mr-1" />
                                    What would you like to write?
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., Write a paragraph about..."
                                        value={promptInput}
                                        onChange={(e) => setPromptInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && promptInput) {
                                                handleQuickAction('help-write');
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={() => handleQuickAction('help-write')}
                                        disabled={!promptInput || isGenerating}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Quick actions grid */}
                        {!activeAction && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-600">Quick actions:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {quickActions
                                        .filter(action => action.id !== 'help-write')
                                        .map((action) => (
                                            <Button
                                                key={action.id}
                                                onClick={() => handleQuickAction(action.id)}
                                                variant="outline"
                                                size="sm"
                                                disabled={action.requiresSelection && !selectedText}
                                                className="justify-start text-xs h-auto py-2"
                                            >
                                                {action.icon}
                                                <span className="ml-2">{action.label}</span>
                                            </Button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Generated suggestion */}
                        {(activeAction || generatedSuggestion) && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                        {quickActions.find(a => a.id === activeAction)?.label || 'Suggestion'}
                                    </Badge>
                                    {suggestionHistory.length > 1 && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigateHistory('prev')}
                                                disabled={currentHistoryIndex <= 0}
                                                className="h-6 w-6 p-0"
                                            >
                                                ←
                                            </Button>
                                            <span>{currentHistoryIndex + 1}/{suggestionHistory.length}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigateHistory('next')}
                                                disabled={currentHistoryIndex >= suggestionHistory.length - 1}
                                                className="h-6 w-6 p-0"
                                            >
                                                →
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isGenerating ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                        <span className="ml-2 text-sm text-gray-600">Generating...</span>
                                    </div>
                                ) : generatedSuggestion ? (
                                    <>
                                        <ScrollArea className="h-40 border rounded-lg p-3 bg-gradient-to-br from-purple-50 to-blue-50">
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {generatedSuggestion}
                                            </p>
                                        </ScrollArea>

                                        {/* Action buttons */}
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={acceptSuggestion}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                size="sm"
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Insert
                                            </Button>
                                            <Button
                                                onClick={regenerateSuggestion}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                onClick={rejectSuggestion}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* Tips */}
                        {!activeAction && !generatedSuggestion && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                    <Zap className="w-3 h-3 inline mr-1" />
                                    <strong>Tip:</strong> Select text for more actions, or use "Help me write" to generate new content
                                </p>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default GeminiWritingAssistant;
