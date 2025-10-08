import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Check,
    X,
    ChevronRight,
    ChevronLeft,
    Lightbulb,
    AlertCircle,
    Edit3,
    BookOpen,
    Palette,
    Brain,
    Target,
    HelpCircle,
    ArrowRight,
    Zap
} from 'lucide-react';

interface Annotation {
    id: string;
    startIndex: number;
    endIndex: number;
    highlightedText: string;
    suggestion: string;
    category: string;
    rationale: string;
    severity: 'high' | 'medium' | 'low';
    tool_recommendation?: string;
    passType?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'modified';
}

interface AnnotationLayerProps {
    annotations: Annotation[];
    activeAnnotationId: string | null;
    onAnnotationClick: (annotationId: string) => void;
    onAcceptSuggestion: (annotationId: string) => void;
    onRejectSuggestion: (annotationId: string) => void;
    onNextAnnotation: () => void;
    onPrevAnnotation: () => void;
    reviewProgress: { current: number; total: number };
    editorElement?: HTMLElement;
}

interface HighlightPosition {
    top: number;
    left: number;
    width: number;
    height: number;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    annotations,
    activeAnnotationId,
    onAnnotationClick,
    onAcceptSuggestion,
    onRejectSuggestion,
    onNextAnnotation,
    onPrevAnnotation,
    reviewProgress,
    editorElement
}) => {
    const [highlightPositions, setHighlightPositions] = useState<Map<string, HighlightPosition>>(new Map());
    const [showSuggestionPanel, setShowSuggestionPanel] = useState(false);
    const layerRef = useRef<HTMLDivElement>(null);

    const activeAnnotation = annotations.find(a => a.id === activeAnnotationId);

    // Calculate highlight positions based on text positions in the editor
    const calculateHighlightPositions = useCallback(() => {
        if (!editorElement || annotations.length === 0) return;

        const newPositions = new Map<string, HighlightPosition>();
        const editorRect = editorElement.getBoundingClientRect();

        annotations.forEach(annotation => {
            try {
                // Create a temporary range to find the text position
                const range = document.createRange();
                const walker = document.createTreeWalker(
                    editorElement,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let currentOffset = 0;
                let startNode = null;
                let endNode = null;
                let startOffset = 0;
                let endOffset = 0;

                while (walker.nextNode()) {
                    const node = walker.currentNode as Text;
                    const nodeLength = node.textContent?.length || 0;

                    if (currentOffset <= annotation.startIndex && currentOffset + nodeLength > annotation.startIndex) {
                        startNode = node;
                        startOffset = annotation.startIndex - currentOffset;
                    }

                    if (currentOffset <= annotation.endIndex && currentOffset + nodeLength >= annotation.endIndex) {
                        endNode = node;
                        endOffset = annotation.endIndex - currentOffset;
                        break;
                    }

                    currentOffset += nodeLength;
                }

                if (startNode && endNode) {
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);

                    const rects = range.getClientRects();
                    if (rects.length > 0) {
                        const rect = rects[0];
                        newPositions.set(annotation.id, {
                            top: rect.top - editorRect.top,
                            left: rect.left - editorRect.left,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                }
            } catch (error) {
                console.warn('Error calculating highlight position for annotation:', annotation.id, error);
            }
        });

        setHighlightPositions(newPositions);
    }, [editorElement, annotations]);

    // Recalculate positions when annotations or editor changes
    useEffect(() => {
        calculateHighlightPositions();

        // Recalculate on window resize or scroll
        const handleResize = () => calculateHighlightPositions();
        const handleScroll = () => calculateHighlightPositions();

        window.addEventListener('resize', handleResize);
        editorElement?.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', handleResize);
            editorElement?.removeEventListener('scroll', handleScroll);
        };
    }, [calculateHighlightPositions]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-red-400 bg-red-50 text-red-700';
            case 'medium': return 'border-yellow-400 bg-yellow-50 text-yellow-700';
            case 'low': return 'border-blue-400 bg-blue-50 text-blue-700';
            default: return 'border-gray-400 bg-gray-50 text-gray-700';
        }
    };

    const getCategoryIcon = (category: string) => {
        if (category.includes('Structure')) return <Target className="w-4 h-4" />;
        if (category.includes('Rhetorical')) return <Zap className="w-4 h-4" />;
        if (category.includes('Clarity')) return <Lightbulb className="w-4 h-4" />;
        if (category.includes('Admissions')) return <Brain className="w-4 h-4" />;
        return <Edit3 className="w-4 h-4" />;
    };

    const getHighlightColor = (annotation: Annotation, isActive: boolean) => {
        if (isActive) {
            return 'rgba(59, 130, 246, 0.4)'; // Blue for active
        }

        switch (annotation.severity) {
            case 'high': return 'rgba(239, 68, 68, 0.3)'; // Red
            case 'medium': return 'rgba(245, 158, 11, 0.3)'; // Yellow
            case 'low': return 'rgba(59, 130, 246, 0.2)'; // Light blue
            default: return 'rgba(107, 114, 128, 0.2)'; // Gray
        }
    };

    return (
        <div className="relative w-full h-full">
            {/* Highlight Overlays */}
            {editorElement && (
                <div
                    ref={layerRef}
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{ position: 'relative' }}
                >
                    {annotations.map(annotation => {
                        const position = highlightPositions.get(annotation.id);
                        if (!position) return null;

                        const isActive = annotation.id === activeAnnotationId;

                        return (
                            <div
                                key={annotation.id}
                                className={`absolute pointer-events-auto cursor-pointer border-2 rounded-sm transition-all duration-200 ${isActive ? 'border-blue-500 shadow-lg z-20' : 'border-transparent hover:border-gray-400'}`}
                                style={{
                                    top: position.top,
                                    left: position.left,
                                    width: position.width,
                                    height: position.height,
                                    backgroundColor: getHighlightColor(annotation, isActive)
                                }}
                                onClick={() => {
                                    onAnnotationClick(annotation.id);
                                    setShowSuggestionPanel(true);
                                }}
                                title={`${annotation.category}: ${annotation.suggestion.substring(0, 100)}...`}
                            >
                                {/* Severity Indicator */}
                                <div
                                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                                        annotation.severity === 'high' ? 'bg-red-500' :
                                        annotation.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Suggestion Panel */}
            {showSuggestionPanel && activeAnnotation && (
                <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-50 w-96">
                    <Card className="shadow-2xl border-2 border-blue-200 bg-white">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(activeAnnotation.category)}
                                    <CardTitle className="text-sm font-semibold">
                                        {activeAnnotation.category}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={getSeverityColor(activeAnnotation.severity)}
                                    >
                                        {activeAnnotation.severity.toUpperCase()}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSuggestionPanel(false)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Progress Indicator */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{reviewProgress.current} of {reviewProgress.total}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1">
                                    <div
                                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${(reviewProgress.current / reviewProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Original Text */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Original Text
                                </label>
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
                                    "{activeAnnotation.highlightedText}"
                                </div>
                            </div>

                            {/* Suggestion */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Suggested Improvement
                                </label>
                                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                    {activeAnnotation.suggestion}
                                </div>
                            </div>

                            {/* Rationale */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" />
                                    Why This Improves Your Writing
                                </label>
                                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                    {activeAnnotation.rationale}
                                </div>
                            </div>

                            {/* Tool Recommendation (Phase 3) */}
                            {activeAnnotation.tool_recommendation && (
                                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                    <div className="flex items-center gap-2 text-purple-700 font-medium text-xs uppercase tracking-wide mb-2">
                                        <BookOpen className="w-3 h-3" />
                                        Pro Tip
                                    </div>
                                    <p className="text-sm text-purple-600">
                                        You can find issues like this yourself using the <strong>{activeAnnotation.tool_recommendation}</strong> tool.
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => onAcceptSuggestion(activeAnnotation.id)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    size="sm"
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    Accept
                                </Button>
                                <Button
                                    onClick={() => onRejectSuggestion(activeAnnotation.id)}
                                    variant="outline"
                                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                    size="sm"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                </Button>
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between items-center pt-2 border-t">
                                <Button
                                    onClick={onPrevAnnotation}
                                    variant="ghost"
                                    size="sm"
                                    disabled={reviewProgress.current <= 1}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    onClick={onNextAnnotation}
                                    variant="ghost"
                                    size="sm"
                                    disabled={reviewProgress.current >= reviewProgress.total}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Annotations Sidebar */}
            <div className="fixed right-4 top-20 bottom-20 w-80 z-40">
                <Card className="h-full shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            Writing Suggestions
                            <Badge variant="secondary" className="ml-auto">
                                {annotations.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-full">
                            <div className="space-y-2 p-4">
                                {annotations.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No suggestions available</p>
                                        <p className="text-xs">Run MozartStroke Review to see recommendations</p>
                                    </div>
                                ) : (
                                    annotations.map((annotation, index) => (
                                        <div
                                            key={annotation.id}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                                annotation.id === activeAnnotationId
                                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                            }`}
                                            onClick={() => {
                                                onAnnotationClick(annotation.id);
                                                setShowSuggestionPanel(true);
                                            }}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-shrink-0">
                                                    {getCategoryIcon(annotation.category)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-900">
                                                            {annotation.category}
                                                        </span>
                                                        <Badge
                                                            size="sm"
                                                            className={getSeverityColor(annotation.severity)}
                                                        >
                                                            {annotation.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-600 line-clamp-2">
                                                        {annotation.suggestion}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        "{annotation.highlightedText.substring(0, 30)}..."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnnotationLayer;