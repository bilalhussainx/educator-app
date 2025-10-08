/**
 * Enhanced AI Comment Panel with Memory, Learning, and Custom Prompts
 *
 * Features:
 * - Shows 20+ comprehensive comments
 * - Remembers previous comments
 * - Learns from user actions
 * - Custom prompt templates
 * - "Generate More Comments" functionality
 * - Filtering and sorting
 * - Real-time sync between teacher and student
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
    Brain,
    Sparkles,
    Filter,
    SortAsc,
    RefreshCw,
    Settings,
    Plus,
    ThumbsUp,
    ThumbsDown,
    X,
    CheckCircle,
    Lightbulb,
    Target,
    Wand2,
    BookOpen,
    TrendingUp,
    Eye,
    EyeOff,
    Download,
    History
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

interface Comment {
    id: string;
    highlightedText: string;
    startOffset: number;
    endOffset: number;
    commentType: string;
    severity: string;
    category: string;
    message: string;
    suggestion: string;
    explanation: string;
    replacementText: string;
    alternatives: string[];
    confidence: number;
    timestamp: Date;
    applied?: boolean;
    dismissed?: boolean;
}

interface CoachingPrompt {
    id: number;
    name: string;
    description: string;
    category: string;
    focusAreas: string[];
    commentTypes: string[];
    densityTarget: number;
    isDefault: boolean;
}

interface EnhancedAICommentPanelProps {
    documentContent: string;
    documentType?: string;
    sessionId?: number;
    onApplySuggestion: (originalText: string, replacementText: string, startOffset?: number, endOffset?: number) => void;
    isVisible: boolean;
    onToggle: () => void;
    sendWsMessage?: (type: string, payload: any) => void;
}

const EnhancedAICommentPanel: React.FC<EnhancedAICommentPanelProps> = ({
    documentContent,
    documentType = 'essay',
    sessionId,
    onApplySuggestion,
    isVisible,
    onToggle,
    sendWsMessage
}) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [coachingPrompts, setCoachingPrompts] = useState<CoachingPrompt[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string>('Essay Coach - Comprehensive');
    const [customPrompt, setCustomPrompt] = useState('');
    const [targetComments, setTargetComments] = useState(50);
    const [rememberPrevious, setRememberPrevious] = useState(true);

    // Filtering and sorting
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('position');
    const [showOnlyUnresolved, setShowOnlyUnresolved] = useState(false);

    // UI state
    const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
    const [showCustomPromptDialog, setShowCustomPromptDialog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Statistics
    const [stats, setStats] = useState({
        totalGenerated: 0,
        applied: 0,
        dismissed: 0,
        averageConfidence: 0
    });

    // Load coaching prompts on mount
    useEffect(() => {
        loadCoachingPrompts();
    }, []);

    // Auto-generate comments when panel first opens (if no comments exist)
    useEffect(() => {
        if (isVisible && comments.length === 0 && documentContent.trim().length >= 50 && !isGenerating) {
            // Small delay to let the panel animation complete
            const timer = setTimeout(() => {
                generateComments();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    // Filter and sort comments
    useEffect(() => {
        let filtered = [...comments];

        // Filter by category
        if (filterCategory !== 'all') {
            filtered = filtered.filter(c => c.category === filterCategory);
        }

        // Filter by severity
        if (filterSeverity !== 'all') {
            filtered = filtered.filter(c => c.severity === filterSeverity);
        }

        // Filter unresolved only
        if (showOnlyUnresolved) {
            filtered = filtered.filter(c => !c.applied && !c.dismissed);
        }

        // Sort
        switch (sortBy) {
            case 'position':
                filtered.sort((a, b) => a.startOffset - b.startOffset);
                break;
            case 'severity':
                const severityOrder = { major: 4, moderate: 3, minor: 2, positive: 1 };
                filtered.sort((a, b) =>
                    (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
                );
                break;
            case 'confidence':
                filtered.sort((a, b) => b.confidence - a.confidence);
                break;
            case 'category':
                filtered.sort((a, b) => a.category.localeCompare(b.category));
                break;
        }

        setFilteredComments(filtered);
    }, [comments, filterCategory, filterSeverity, sortBy, showOnlyUnresolved]);

    // Listen for WebSocket messages (real-time sync)
    useEffect(() => {
        // This would be connected to your WebSocket system
        // For now, it's a placeholder for the real-time functionality
    }, []);

    const loadCoachingPrompts = async () => {
        try {
            const response = await apiClient.get('/api/ai-comments/coaching-prompts');
            if (response.data.success) {
                setCoachingPrompts(response.data.prompts);
            }
        } catch (error) {
            console.error('Error loading coaching prompts:', error);
            toast.error('Failed to load coaching templates');
        }
    };

    const generateComments = async () => {
        if (!documentContent || documentContent.trim().length < 50) {
            toast.error('Document too short - need at least 50 characters');
            return;
        }

        setIsGenerating(true);

        try {
            const response = await apiClient.post('/api/ai-comments/generate', {
                documentContent,
                documentType,
                sessionId,
                targetComments,
                promptTemplate: selectedPrompt,
                customPrompt: customPrompt || null,
                rememberPrevious,
                excludeCommentIds: comments.map(c => c.id)
            });

            if (response.data.success) {
                const newComments = response.data.comments;
                setComments(newComments);

                // Update stats
                setStats({
                    totalGenerated: newComments.length,
                    applied: 0,
                    dismissed: 0,
                    averageConfidence: newComments.reduce((sum, c) => sum + c.confidence, 0) / newComments.length
                });

                // Broadcast to WebSocket (for real-time sync)
                if (sendWsMessage && sessionId) {
                    sendWsMessage('ai_comments_generated', {
                        sessionId,
                        comments: newComments,
                        metadata: response.data.metadata
                    });
                }

                toast.success(`Generated ${newComments.length} AI comments!`);
            }
        } catch (error) {
            console.error('Error generating comments:', error);
            toast.error('Failed to generate comments');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateMoreComments = async () => {
        setIsGenerating(true);

        try {
            const response = await apiClient.post('/api/ai-comments/generate-more', {
                documentContent,
                documentType,
                existingCommentIds: comments.map(c => c.id),
                additionalComments: 20,
                promptTemplate: selectedPrompt,
                customPrompt: customPrompt || null
            });

            if (response.data.success) {
                const newComments = [...comments, ...response.data.comments];
                setComments(newComments);

                // Broadcast update
                if (sendWsMessage && sessionId) {
                    sendWsMessage('ai_comments_updated', {
                        sessionId,
                        newComments: response.data.comments
                    });
                }

                toast.success(`Added ${response.data.comments.length} more comments!`);
            }
        } catch (error) {
            console.error('Error generating more comments:', error);
            toast.error('Failed to generate more comments');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCommentAction = async (comment: Comment, action: 'apply' | 'dismiss' | 'like' | 'dislike') => {
        try {
            // Record feedback
            await apiClient.post('/api/ai-comments/feedback', {
                commentId: comment.id,
                action,
                timeToAction: Date.now() - new Date(comment.timestamp).getTime()
            });

            // Update local state
            if (action === 'apply') {
                setComments(prev => prev.map(c =>
                    c.id === comment.id ? { ...c, applied: true } : c
                ));
                setStats(prev => ({ ...prev, applied: prev.applied + 1 }));

                // Apply the suggestion with offsets
                onApplySuggestion(comment.highlightedText, comment.replacementText, comment.startOffset, comment.endOffset);

                // Broadcast action
                if (sendWsMessage && sessionId) {
                    sendWsMessage('comment_applied', {
                        sessionId,
                        commentId: comment.id,
                        replacement: comment.replacementText
                    });
                }

                toast.success('Suggestion applied!');
            } else if (action === 'dismiss') {
                setComments(prev => prev.map(c =>
                    c.id === comment.id ? { ...c, dismissed: true } : c
                ));
                setStats(prev => ({ ...prev, dismissed: prev.dismissed + 1 }));

                toast.success('Comment dismissed');
            } else if (action === 'like') {
                toast.success('Thanks for your feedback!');
            } else if (action === 'dislike') {
                toast.success('Feedback recorded');
            }

        } catch (error) {
            console.error('Error recording action:', error);
            toast.error('Failed to record action');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'positive': return 'bg-green-100 text-green-800 border-green-300';
            case 'minor': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'major': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'thematic_insight': return <Brain className="w-4 h-4" />;
            case 'rhetorical_strategy': return <Target className="w-4 h-4" />;
            case 'stylistic_craft': return <Wand2 className="w-4 h-4" />;
            case 'word_choice': return <Sparkles className="w-4 h-4" />;
            default: return <Lightbulb className="w-4 h-4" />;
        }
    };

    if (!isVisible) {
        return (
            <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
                <Button
                    onClick={onToggle}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                    size="lg"
                >
                    <Brain className="w-5 h-5 mr-2" />
                    AI Review ({comments.length})
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-600" />
                        AI Essay Coach
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onToggle}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-white rounded p-2 text-center">
                        <div className="text-2xl font-bold text-purple-600">{comments.length}</div>
                        <div className="text-xs text-gray-600">Comments</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
                        <div className="text-xs text-gray-600">Applied</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                        <div className="text-2xl font-bold text-gray-600">{stats.dismissed}</div>
                        <div className="text-xs text-gray-600">Dismissed</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {Math.round(stats.averageConfidence * 100)}%
                        </div>
                        <div className="text-xs text-gray-600">Confidence</div>
                    </div>
                </div>

                {/* Coaching Prompt Selector */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Coaching Style</Label>
                    <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {coachingPrompts.map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.name}>
                                    {prompt.name} {prompt.isDefault && '⭐'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowCustomPromptDialog(true)}
                    >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Custom Prompt
                    </Button>
                </div>

                {/* Generate Buttons */}
                <div className="flex gap-2 mt-3">
                    <Button
                        onClick={generateComments}
                        disabled={isGenerating}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Review
                            </>
                        )}
                    </Button>
                    {comments.length > 0 && (
                        <Button
                            onClick={generateMoreComments}
                            disabled={isGenerating}
                            variant="outline"
                            className="border-purple-300"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters and Sort */}
            {comments.length > 0 && (
                <div className="p-3 border-b bg-gray-50 space-y-2">
                    <div className="flex gap-2">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {Array.from(new Set(comments.map(c => c.category))).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="position">Position</SelectItem>
                                <SelectItem value="severity">Severity</SelectItem>
                                <SelectItem value="confidence">Confidence</SelectItem>
                                <SelectItem value="category">Category</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={showOnlyUnresolved}
                                onCheckedChange={setShowOnlyUnresolved}
                            />
                            <Label className="text-sm">Unresolved only</Label>
                        </div>
                        <Badge variant="outline">
                            {filteredComments.length} / {comments.length}
                        </Badge>
                    </div>
                </div>
            )}

            {/* Comments List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredComments.length === 0 && !isGenerating && (
                        <div className="text-center py-12">
                            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No comments yet</p>
                            <p className="text-sm text-gray-400">
                                Click "Generate Review" to get AI feedback
                            </p>
                        </div>
                    )}

                    {filteredComments.map((comment, index) => (
                        <Card
                            key={comment.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                comment.applied ? 'opacity-60' : ''
                            } ${comment.dismissed ? 'opacity-40' : ''}`}
                            onClick={() => setSelectedComment(comment)}
                        >
                            <CardHeader className="p-3 pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1">
                                        {getTypeIcon(comment.commentType)}
                                        <Badge className={`text-xs ${getSeverityColor(comment.severity)}`}>
                                            {comment.severity}
                                        </Badge>
                                        <span className="text-xs text-gray-500">#{index + 1}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {comment.applied && <CheckCircle className="w-4 h-4 text-green-600" />}
                                        {comment.dismissed && <X className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{comment.category}</div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-sm bg-gray-50 p-2 rounded mb-2 italic">
                                    "{comment.highlightedText.substring(0, 60)}..."
                                </div>
                                <p className="text-sm text-gray-800 mb-2">{comment.message}</p>
                                {comment.replacementText && (
                                    <div className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-500">
                                        <strong>Replace with:</strong> "{comment.replacementText.substring(0, 60)}..."
                                    </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                    {comment.replacementText && !comment.applied && (
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCommentAction(comment, 'apply');
                                            }}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                                        >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Apply
                                        </Button>
                                    )}
                                    {!comment.dismissed && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCommentAction(comment, 'dismiss');
                                            }}
                                            className="flex-1 text-xs"
                                        >
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            {/* Custom Prompt Dialog */}
            <Dialog open={showCustomPromptDialog} onOpenChange={setShowCustomPromptDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Custom Coaching Prompt</DialogTitle>
                        <DialogDescription>
                            Define your own coaching style and focus areas
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Custom Instructions</Label>
                            <Textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Example: Focus on making my writing more conversational and engaging. Help me use active voice and vivid imagery."
                                rows={6}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Target Number of Comments</Label>
                            <div className="flex items-center gap-4 mt-2">
                                <Slider
                                    value={[targetComments]}
                                    onValueChange={([value]) => setTargetComments(value)}
                                    min={20}
                                    max={100}
                                    step={10}
                                    className="flex-1"
                                />
                                <span className="font-bold text-lg w-12">{targetComments}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={rememberPrevious}
                                onCheckedChange={setRememberPrevious}
                            />
                            <Label>Remember previous comments (avoid duplication)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCustomPromptDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            setShowCustomPromptDialog(false);
                            generateComments();
                        }}>
                            Generate with Custom Prompt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EnhancedAICommentPanel;
