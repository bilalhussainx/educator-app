/**
 * =================================================================
 * PATTERN TEACHING VIEWER COMPONENT
 * =================================================================
 * Displays AI-generated pattern teaching documents in a beautiful,
 * educational format with markdown rendering
 * =================================================================
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BookOpen,
    Clock,
    X,
    ChevronRight,
    Sparkles,
    GraduationCap,
    Lightbulb
} from 'lucide-react';
import apiClient from '../services/apiClient';

interface PatternTeachingViewerProps {
    courseId: string;
    moduleIndex: number;
    moduleName: string;
}

interface PatternTeachingData {
    patternName: string;
    content: string;
    metadata: {
        lessonCount: number;
        sections: string[];
        estimatedReadingTime: number;
    };
    generatedAt: string;
    moduleTitle: string;
}

export const PatternTeachingViewer: React.FC<PatternTeachingViewerProps> = ({
    courseId,
    moduleIndex,
    moduleName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [patternData, setPatternData] = useState<PatternTeachingData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasViewed, setHasViewed] = useState(false);

    const fetchPatternTeaching = async () => {
        if (patternData || isLoading) return; // Don't fetch if already loaded

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.get(
                `/api/enhanced-courses/${courseId}/pattern-teaching/${moduleIndex}`
            );
            setPatternData(response.data);
            setHasViewed(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Pattern teaching document not available');
            console.error('Error fetching pattern teaching document:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        fetchPatternTeaching();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={handleOpen}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Learn This Pattern
                    <Sparkles className="ml-2 h-4 w-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl h-[85vh] bg-slate-900 text-white border-slate-700">
                <DialogHeader className="border-b border-slate-700 pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                <BookOpen className="h-6 w-6 text-purple-400" />
                                {moduleName}
                            </DialogTitle>
                            {patternData && (
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {patternData.metadata.estimatedReadingTime} min read
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Lightbulb className="h-4 w-4" />
                                        {patternData.metadata.sections.length} sections
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                                <p className="text-slate-400">Loading pattern teaching document...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
                            <p className="text-red-300 mb-2">{error}</p>
                            <p className="text-sm text-slate-400">
                                This module may not have a pattern teaching document yet.
                            </p>
                        </div>
                    )}

                    {patternData && (
                        <div className="prose prose-invert prose-slate max-w-none">
                            <style>{`
                                .prose {
                                    color: #cbd5e1;
                                }
                                .prose h1 {
                                    color: #f1f5f9;
                                    font-size: 2rem;
                                    font-weight: bold;
                                    margin-bottom: 1rem;
                                    border-bottom: 2px solid #6366f1;
                                    padding-bottom: 0.5rem;
                                }
                                .prose h2 {
                                    color: #e2e8f0;
                                    font-size: 1.5rem;
                                    font-weight: 600;
                                    margin-top: 2rem;
                                    margin-bottom: 1rem;
                                }
                                .prose h3 {
                                    color: #cbd5e1;
                                    font-size: 1.25rem;
                                    font-weight: 600;
                                    margin-top: 1.5rem;
                                }
                                .prose p {
                                    margin-bottom: 1rem;
                                    line-height: 1.75;
                                }
                                .prose ul, .prose ol {
                                    margin-left: 1.5rem;
                                    margin-bottom: 1rem;
                                }
                                .prose li {
                                    margin-bottom: 0.5rem;
                                }
                                .prose code {
                                    background-color: #1e293b;
                                    color: #22d3ee;
                                    padding: 0.2rem 0.4rem;
                                    border-radius: 0.25rem;
                                    font-size: 0.875rem;
                                }
                                .prose pre {
                                    background-color: #0f172a;
                                    border: 1px solid #334155;
                                    border-radius: 0.5rem;
                                    padding: 1rem;
                                    overflow-x: auto;
                                    margin-bottom: 1rem;
                                }
                                .prose pre code {
                                    background-color: transparent;
                                    padding: 0;
                                    color: #cbd5e1;
                                }
                                .prose strong {
                                    color: #f1f5f9;
                                    font-weight: 600;
                                }
                                .prose blockquote {
                                    border-left: 4px solid #6366f1;
                                    padding-left: 1rem;
                                    font-style: italic;
                                    color: #94a3b8;
                                    margin: 1rem 0;
                                }
                                .prose a {
                                    color: #22d3ee;
                                    text-decoration: underline;
                                }
                                .prose a:hover {
                                    color: #06b6d4;
                                }
                                .prose table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    margin: 1rem 0;
                                }
                                .prose th {
                                    background-color: #1e293b;
                                    color: #f1f5f9;
                                    padding: 0.75rem;
                                    text-align: left;
                                    border: 1px solid #334155;
                                }
                                .prose td {
                                    padding: 0.75rem;
                                    border: 1px solid #334155;
                                }
                            `}</style>
                            <ReactMarkdown>{patternData.content}</ReactMarkdown>
                        </div>
                    )}
                </ScrollArea>

                <div className="border-t border-slate-700 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">
                            {hasViewed && patternData && (
                                <span className="text-green-400 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Document loaded successfully
                                </span>
                            )}
                        </div>
                        <Button
                            onClick={() => setIsOpen(false)}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-800"
                        >
                            Close
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PatternTeachingViewer;
