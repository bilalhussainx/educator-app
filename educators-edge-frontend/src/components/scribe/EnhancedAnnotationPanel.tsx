/**
 * Enhanced Annotation Panel with Filtering and Better UX
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Check,
    X,
    ChevronRight,
    ChevronLeft,
    Lightbulb,
    AlertCircle,
    Edit3,
    BookOpen,
    Target,
    HelpCircle,
    Zap,
    Brain,
    Search,
    Filter,
    ArrowUpDown
} from 'lucide-react';

interface Annotation {
    id: string;
    start?: number;
    end?: number;
    startIndex?: number;
    endIndex?: number;
    text?: string;
    highlightedText?: string;
    suggestion: string;
    comment?: string;
    explanation?: string;
    rationale?: string;
    category: string;
    severity: 'high' | 'medium' | 'low' | 'positive';
    type?: string;
    promptContext?: string;
}

interface EnhancedAnnotationPanelProps {
    annotations: Annotation[];
    activeAnnotationId: string | null;
    onAnnotationClick: (annotationId: string) => void;
    onAcceptSuggestion: (annotationId: string) => void;
    onRejectSuggestion: (annotationId: string) => void;
    onNextAnnotation: () => void;
    onPrevAnnotation: () => void;
    reviewProgress: { current: number; total: number };
}

const EnhancedAnnotationPanel: React.FC<EnhancedAnnotationPanelProps> = ({
    annotations,
    activeAnnotationId,
    onAnnotationClick,
    onAcceptSuggestion,
    onRejectSuggestion,
    onNextAnnotation,
    onPrevAnnotation,
    reviewProgress
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'position' | 'severity' | 'category'>('position');

    const activeAnnotation = annotations.find(a => a.id === activeAnnotationId);

    // Extract text from annotation
    const getAnnotationText = (annotation: Annotation): string => {
        const text = annotation.highlightedText || annotation.text || '';

        // Debug log for first 3 annotations
        if (annotations.indexOf(annotation) < 3) {
            console.log('🔍 EnhancedAnnotationPanel - getAnnotationText:', {
                annotationId: annotation.id,
                highlightedText: annotation.highlightedText,
                text: annotation.text,
                result: text,
                start: annotation.start || annotation.startIndex,
                end: annotation.end || annotation.endIndex
            });
        }

        return text;
    };

    // Get start position
    const getStartPosition = (annotation: Annotation): number => {
        return annotation.start ?? annotation.startIndex ?? 0;
    };

    // Get end position
    const getEndPosition = (annotation: Annotation): number => {
        return annotation.end ?? annotation.endIndex ?? 0;
    };

    // Get all unique categories
    const categories = useMemo(() => {
        const cats = new Set(annotations.map(a => a.category));
        return Array.from(cats).sort();
    }, [annotations]);

    // Filter and sort annotations
    const filteredAnnotations = useMemo(() => {
        let filtered = annotations;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(a =>
                getAnnotationText(a).toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.suggestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(a => a.category === filterCategory);
        }

        // Severity filter
        if (filterSeverity !== 'all') {
            filtered = filtered.filter(a => a.severity === filterSeverity);
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'position':
                    return getStartPosition(a) - getStartPosition(b);
                case 'severity':
                    const severityOrder = { high: 3, medium: 2, low: 1, positive: 0 };
                    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [annotations, searchQuery, filterCategory, filterSeverity, sortBy]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-red-400 bg-red-50 text-red-700';
            case 'medium': return 'border-yellow-400 bg-yellow-50 text-yellow-700';
            case 'low': return 'border-blue-400 bg-blue-50 text-blue-700';
            case 'positive': return 'border-green-400 bg-green-50 text-green-700';
            default: return 'border-gray-400 bg-gray-50 text-gray-700';
        }
    };

    const getCategoryIcon = (category: string) => {
        if (category.includes('Structure')) return <Target className="w-4 h-4" />;
        if (category.includes('Rhetorical')) return <Zap className="w-4 h-4" />;
        if (category.includes('Clarity')) return <Lightbulb className="w-4 h-4" />;
        if (category.includes('Admissions') || category.includes('Theme')) return <Brain className="w-4 h-4" />;
        return <Edit3 className="w-4 h-4" />;
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-lg">Writing Suggestions</h3>
                    </div>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                        {filteredAnnotations.length} of {annotations.length}
                    </Badge>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search suggestions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="position">Position</SelectItem>
                            <SelectItem value="severity">Severity</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Annotations List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredAnnotations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No suggestions found</p>
                            <p className="text-sm mt-1">
                                {searchQuery || filterCategory !== 'all' || filterSeverity !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Run AI Review to see recommendations'}
                            </p>
                        </div>
                    ) : (
                        filteredAnnotations.map((annotation, index) => (
                            <Card
                                key={annotation.id}
                                className={`cursor-pointer transition-all duration-200 ${
                                    annotation.id === activeAnnotationId
                                        ? 'border-2 border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border hover:border-gray-300 hover:shadow-md'
                                }`}
                                onClick={() => {
                                    onAnnotationClick(annotation.id);
                                }}
                            >
                                <CardContent className="p-4">
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getCategoryIcon(annotation.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {annotation.category}
                                                </span>
                                                <Badge
                                                    className={`text-xs ${getSeverityColor(annotation.severity)}`}
                                                >
                                                    {annotation.severity}
                                                </Badge>
                                            </div>

                                            {/* Original Text */}
                                            <div className="mb-2">
                                                <p className="text-xs text-gray-500 mb-1">📝 Highlighted Text:</p>
                                                <div className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-gray-700">
                                                    "{getAnnotationText(annotation) || 'No text available'}"
                                                </div>
                                            </div>

                                            {/* Suggestion */}
                                            <div className="mb-2">
                                                <p className="text-xs text-gray-500 mb-1">💡 Suggestion:</p>
                                                <p className="text-sm text-gray-800">
                                                    {annotation.suggestion}
                                                </p>
                                            </div>

                                            {/* Explanation/Rationale */}
                                            {(annotation.explanation || annotation.rationale || annotation.comment) && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-500 mb-1">❓ Why:</p>
                                                    <p className="text-xs text-gray-600">
                                                        {annotation.explanation || annotation.rationale || annotation.comment}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Prompt Context (if from smart prompt) */}
                                            {annotation.promptContext && (
                                                <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                    🎯 From prompt: "{annotation.promptContext.substring(0, 60)}..."
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {annotation.id === activeAnnotationId && (
                                        <div className="flex gap-2 pt-3 border-t">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAcceptSuggestion(annotation.id);
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                size="sm"
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Apply
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRejectSuggestion(annotation.id);
                                                }}
                                                variant="outline"
                                                className="flex-1"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Dismiss
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Navigation Footer */}
            {activeAnnotation && (
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            {reviewProgress.current} of {reviewProgress.total}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                onClick={onPrevAnnotation}
                                variant="outline"
                                size="sm"
                                disabled={reviewProgress.current <= 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={onNextAnnotation}
                                variant="outline"
                                size="sm"
                                disabled={reviewProgress.current >= reviewProgress.total}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedAnnotationPanel;
