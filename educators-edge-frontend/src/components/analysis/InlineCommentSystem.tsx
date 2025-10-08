import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MessageCircle,
    ThumbsUp,
    ThumbsDown,
    Edit3,
    CheckCircle,
    AlertTriangle,
    Lightbulb,
    Target,
    Sparkles,
    Brain,
    X,
    ArrowRight,
    Quote,
    Wand2
} from 'lucide-react';

interface InlineComment {
    id: string;
    startOffset: number;
    endOffset: number;
    text: string;
    highlightedText: string;
    type: 'praise' | 'suggestion' | 'correction' | 'question' | 'enhancement' | 'flow' | 'style';
    severity: 'positive' | 'minor' | 'moderate' | 'major';
    message: string;
    suggestion?: string;
    explanation?: string;
    alternatives?: string[];
    confidence: number;
    category: string;
    position?: { x: number; y: number };
    isVisible?: boolean;
    timestamp: Date;
}

interface InlineCommentSystemProps {
    documentContent: string;
    comments: InlineComment[];
    onCommentAction: (commentId: string, action: 'apply' | 'dismiss' | 'like' | 'dislike') => void;
    onCommentHover?: (commentId: string | null) => void;
    isActive?: boolean;
    onTextSelect?: (selectedText: string, range: { start: number; end: number }) => void;
    className?: string;
}

const InlineCommentSystem: React.FC<InlineCommentSystemProps> = ({
    documentContent,
    comments,
    onCommentAction,
    onCommentHover,
    isActive = true,
    onTextSelect,
    className
}) => {
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Generate highlighted document with inline comments
    const generateCommentedDocument = () => {
        if (!isActive || comments.length === 0) {
            return (
                <div className="prose max-w-none whitespace-pre-wrap">
                    {documentContent}
                </div>
            );
        }

        // Sort comments by start position
        const sortedComments = [...comments].sort((a, b) => a.startOffset - b.startOffset);

        let result = '';
        let lastOffset = 0;
        let commentIndex = 0;

        sortedComments.forEach((comment, index) => {
            // Add text before the comment
            result += documentContent.slice(lastOffset, comment.startOffset);

            // Add the highlighted text with comment marker
            const highlightedContent = documentContent.slice(comment.startOffset, comment.endOffset);
            const commentClass = getCommentHighlightClass(comment.type, comment.severity);
            const isHovered = hoveredCommentId === comment.id;
            const isActive = activeCommentId === comment.id;

            result += `<span class="${commentClass} comment-highlight" data-comment-id="${comment.id}" data-comment-index="${index}" title="${comment.message}">${highlightedContent}<span class="comment-indicator ${getCommentIndicatorClass(comment.type)}" data-comment-count="${index + 1}">${getCommentIcon(comment.type)}</span></span>`;

            lastOffset = comment.endOffset;
            commentIndex++;
        });

        // Add remaining text
        result += documentContent.slice(lastOffset);

        // Clean up the HTML to ensure proper rendering
        const cleanHTML = result
            .replace(/\n/g, '<br>')
            .replace(/\s+/g, ' ')
            .trim();

        console.log('Generated HTML for comments:', cleanHTML.substring(0, 500));

        return (
            <div
                className="prose max-w-none relative leading-relaxed"
                dangerouslySetInnerHTML={{ __html: cleanHTML }}
                onClick={handleDocumentClick}
                onMouseOver={handleDocumentHover}
            />
        );
    };

    // Handle clicking on comment highlights
    const handleDocumentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const commentHighlight = target.closest('.comment-highlight');

        if (commentHighlight) {
            const commentId = commentHighlight.getAttribute('data-comment-id');
            if (commentId) {
                setActiveCommentId(activeCommentId === commentId ? null : commentId);
                onCommentHover?.(commentId);
            }
        } else {
            setActiveCommentId(null);
            onCommentHover?.(null);
        }
    };

    // Handle hovering over comment highlights
    const handleDocumentHover = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const commentHighlight = target.closest('.comment-highlight');

        if (commentHighlight) {
            const commentId = commentHighlight.getAttribute('data-comment-id');
            if (commentId !== hoveredCommentId) {
                setHoveredCommentId(commentId);
                onCommentHover?.(commentId);
            }
        } else if (hoveredCommentId) {
            setHoveredCommentId(null);
            onCommentHover?.(null);
        }
    };

    // Get CSS class for comment highlight
    const getCommentHighlightClass = (type: string, severity: string) => {
        const baseClass = 'inline-block rounded-sm px-1 mx-0.5 relative cursor-pointer transition-all duration-200';

        switch (type) {
            case 'praise':
                return `${baseClass} bg-green-100 text-green-800 border-b-2 border-green-300`;
            case 'suggestion':
                return `${baseClass} bg-blue-100 text-blue-800 border-b-2 border-blue-300`;
            case 'correction':
                return `${baseClass} bg-red-100 text-red-800 border-b-2 border-red-300`;
            case 'question':
                return `${baseClass} bg-yellow-100 text-yellow-800 border-b-2 border-yellow-300`;
            case 'enhancement':
                return `${baseClass} bg-purple-100 text-purple-800 border-b-2 border-purple-300`;
            case 'flow':
                return `${baseClass} bg-indigo-100 text-indigo-800 border-b-2 border-indigo-300`;
            case 'style':
                return `${baseClass} bg-pink-100 text-pink-800 border-b-2 border-pink-300`;
            default:
                return `${baseClass} bg-gray-100 text-gray-800 border-b-2 border-gray-300`;
        }
    };

    // Get CSS class for comment indicator
    const getCommentIndicatorClass = (type: string) => {
        const baseClass = 'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shadow-sm';

        switch (type) {
            case 'praise':
                return `${baseClass} bg-green-500 text-white`;
            case 'suggestion':
                return `${baseClass} bg-blue-500 text-white`;
            case 'correction':
                return `${baseClass} bg-red-500 text-white`;
            case 'question':
                return `${baseClass} bg-yellow-500 text-white`;
            case 'enhancement':
                return `${baseClass} bg-purple-500 text-white`;
            case 'flow':
                return `${baseClass} bg-indigo-500 text-white`;
            case 'style':
                return `${baseClass} bg-pink-500 text-white`;
            default:
                return `${baseClass} bg-gray-500 text-white`;
        }
    };

    // Get icon for comment type
    const getCommentIcon = (type: string) => {
        switch (type) {
            case 'praise': return '👍';
            case 'suggestion': return '💡';
            case 'correction': return '✏️';
            case 'question': return '❓';
            case 'enhancement': return '⭐';
            case 'flow': return '🔗';
            case 'style': return '🎨';
            default: return '💬';
        }
    };

    // Get the active comment
    const activeComment = activeCommentId ? comments.find(c => c.id === activeCommentId) : null;

    return (
        <div className={className || "relative"}>
            {/* Document with inline comments */}
            <div ref={containerRef} className="relative">
                {generateCommentedDocument()}
            </div>

            {/* Comment popup */}
            {activeComment && (
                <CommentPopup
                    comment={activeComment}
                    onAction={onCommentAction}
                    onClose={() => setActiveCommentId(null)}
                />
            )}

            {/* Comment statistics - positioned to not interfere with scroll */}
            {isActive && comments.length > 0 && (
                <div className="sticky top-4 z-40 flex justify-end mb-4">
                    <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-purple-200 max-w-fit">
                        <CardContent className="p-3">
                            <div className="flex items-center space-x-2 text-sm">
                                <Brain className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-purple-800">
                                    {comments.length} MozartStroke Comments
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {['praise', 'suggestion', 'correction', 'question', 'enhancement'].map(type => {
                                    const count = comments.filter(c => c.type === type).length;
                                    if (count === 0) return null;
                                    return (
                                        <Badge key={type} variant="outline" className="text-xs">
                                            {getCommentIcon(type)} {count}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CSS for comment highlights */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    .comment-highlight {
                        transition: all 0.2s ease;
                        position: relative;
                        display: inline-block;
                    }

                    .comment-highlight:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        z-index: 20;
                    }

                    .comment-indicator {
                        animation: pulse 2s infinite;
                        z-index: 10;
                        pointer-events: none;
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }

                    .prose {
                        line-height: 1.8;
                        font-size: 16px;
                    }
                `
            }} />
        </div>
    );
};

// Comment popup component
interface CommentPopupProps {
    comment: InlineComment;
    onAction: (commentId: string, action: 'apply' | 'dismiss' | 'like' | 'dislike') => void;
    onClose: () => void;
}

const CommentPopup: React.FC<CommentPopupProps> = ({ comment, onAction, onClose }) => {
    const getCommentTypeIcon = (type: string) => {
        switch (type) {
            case 'praise': return <ThumbsUp className="w-4 h-4 text-green-600" />;
            case 'suggestion': return <Lightbulb className="w-4 h-4 text-blue-600" />;
            case 'correction': return <Edit3 className="w-4 h-4 text-red-600" />;
            case 'question': return <MessageCircle className="w-4 h-4 text-yellow-600" />;
            case 'enhancement': return <Sparkles className="w-4 h-4 text-purple-600" />;
            case 'flow': return <ArrowRight className="w-4 h-4 text-indigo-600" />;
            case 'style': return <Wand2 className="w-4 h-4 text-pink-600" />;
            default: return <MessageCircle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'positive': return 'border-green-300 bg-green-50';
            case 'minor': return 'border-blue-300 bg-blue-50';
            case 'moderate': return 'border-yellow-300 bg-yellow-50';
            case 'major': return 'border-red-300 bg-red-50';
            default: return 'border-gray-300 bg-gray-50';
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-end overflow-hidden">
            <Card className={`w-96 h-full shadow-xl border-2 ${getSeverityColor(comment.severity)} rounded-none border-r-0`}>
                <CardContent className="p-6 h-full overflow-y-auto flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            {getCommentTypeIcon(comment.type)}
                            <div>
                                <h3 className="font-semibold text-gray-900 capitalize">
                                    {comment.type.replace('_', ' ')} Comment
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                    {comment.category}
                                </Badge>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Highlighted text */}
                    <div className="bg-gray-100 p-3 rounded-lg mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <Quote className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">Selected Text:</span>
                        </div>
                        <p className="text-gray-800 italic">"{comment.highlightedText}"</p>
                    </div>

                    {/* Comment message */}
                    <div className="mb-4">
                        <p className="text-gray-800 leading-relaxed">{comment.message}</p>
                    </div>

                    {/* Replacement Text */}
                    {comment.replacementText && (
                        <div className="bg-green-50 p-3 rounded-lg mb-4 border border-green-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Replace With:</span>
                            </div>
                            <p className="text-green-800 font-medium">"{comment.replacementText}"</p>
                        </div>
                    )}

                    {/* Suggestion */}
                    {comment.suggestion && !comment.replacementText && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Target className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">Suggested Improvement:</span>
                            </div>
                            <p className="text-blue-800">{comment.suggestion}</p>
                        </div>
                    )}

                    {/* Explanation */}
                    {comment.explanation && (
                        <div className="bg-purple-50 p-3 rounded-lg mb-4 border border-purple-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Brain className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-800">Why this matters:</span>
                            </div>
                            <p className="text-purple-800 text-sm">{comment.explanation}</p>
                        </div>
                    )}

                    {/* Alternatives */}
                    {comment.alternatives && comment.alternatives.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <Sparkles className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-800">Alternative Options:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {comment.alternatives.map((alt, index) => (
                                    <li key={index} className="text-gray-700 text-sm">{alt}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto pt-4 space-y-3">
                        <div className="flex flex-col space-y-2">
                            {(comment.suggestion || comment.replacementText) && (
                                <Button
                                    size="sm"
                                    onClick={() => onAction(comment.id, 'apply')}
                                    className="bg-blue-600 hover:bg-blue-700 w-full"
                                    title={comment.replacementText ? `Replace with: "${comment.replacementText}"` : 'Apply suggestion'}
                                >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {comment.replacementText ? 'Replace Text' : 'Apply Suggestion'}
                                </Button>
                            )}
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    onClick={() => onAction(comment.id, 'like')}
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50 flex-1"
                                >
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    Helpful
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onAction(comment.id, 'dislike')}
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50 flex-1"
                                >
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    Not Helpful
                                </Button>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => onAction(comment.id, 'dismiss')}
                                variant="outline"
                                className="w-full"
                            >
                                Dismiss
                            </Button>
                        </div>

                        {/* Confidence indicator */}
                        <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Confidence: {Math.round(comment.confidence * 100)}%</span>
                                <span>{comment.timestamp.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default InlineCommentSystem;
export type { InlineComment };