import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Brain,
    Target,
    Lightbulb,
    X,
    Loader2
} from 'lucide-react';

interface MozartStrokePanelProps {
    isReviewMode: boolean;
    isAnalyzing: boolean;
    reviewProgress: { current: number; total: number };
    reviewAnnotations: any[];
    activeAnnotation: string | null;
    currentContent: string;
    inlineCommentsCount?: number;
    onStartReview: () => void;
    onExitReview: () => void;
}

const MozartStrokePanel: React.FC<MozartStrokePanelProps> = ({
    isReviewMode,
    isAnalyzing,
    reviewProgress,
    reviewAnnotations,
    activeAnnotation,
    currentContent,
    inlineCommentsCount = 0,
    onStartReview,
    onExitReview
}) => {
    return (
        <div className="w-96 flex flex-col bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-500/50">
            <div className="p-4 border-b border-purple-500/30">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    MozartStroke Review
                </h3>
                <p className="text-sm text-purple-200 mt-1">
                    AI Writing Mentor with Socratic Guidance
                </p>

                {isReviewMode && (
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 bg-purple-800/30 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(reviewProgress.current / Math.max(reviewProgress.total, 1)) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs text-purple-200">
                            {reviewProgress.current}/{reviewProgress.total}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 space-y-4">
                {isReviewMode ? (
                    /* Review Mode Content */
                    <>
                        {activeAnnotation ? (
                            <div className="bg-purple-800/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-medium text-white">Current Focus</span>
                                </div>
                                <p className="text-sm text-purple-100">
                                    {reviewAnnotations.find(a => a.id === activeAnnotation)?.category || 'Reviewing suggestion...'}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                                <p className="text-sm text-purple-200 mb-2">Review Mode Active</p>
                                <p className="text-xs text-purple-300">
                                    {inlineCommentsCount > 0
                                        ? `${inlineCommentsCount} inline comments - Click highlighted text to see suggestions`
                                        : 'Click highlighted text to see suggestions'
                                    }
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="bg-purple-900/30 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-white mb-2">Review Summary</h4>
                                <div className="text-xs text-purple-200 space-y-1">
                                    <p>📊 Total Issues: {reviewAnnotations.length}</p>
                                    <p>🔴 High Priority: {reviewAnnotations.filter(a => a.severity === 'high').length}</p>
                                    <p>🟡 Medium Priority: {reviewAnnotations.filter(a => a.severity === 'medium').length}</p>
                                    <p>🔵 Low Priority: {reviewAnnotations.filter(a => a.severity === 'low').length}</p>
                                </div>
                            </div>

                            <Button
                                onClick={onExitReview}
                                variant="outline"
                                className="w-full border-purple-500 text-purple-300 hover:bg-purple-800/30"
                                size="sm"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Exit Review Mode
                            </Button>
                        </div>
                    </>
                ) : (
                    /* Ready Mode Content */
                    <>
                        <div className="text-center py-8">
                            <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                            <h4 className="text-lg font-medium text-white mb-2">Ready to Review</h4>
                            <p className="text-sm text-purple-200 mb-4">
                                Get comprehensive feedback with interactive suggestions
                            </p>

                            <Button
                                onClick={onStartReview}
                                disabled={isAnalyzing || (!currentContent || currentContent.trim().length < 50)}
                                className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 ${isAnalyzing ? 'animate-pulse' : ''}`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Brain className="h-4 w-4 mr-2" />
                                        Start Review
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-white mb-2">✨ What You'll Get:</h5>
                                <ul className="text-xs text-slate-300 space-y-1">
                                    <li>• 🏗️ <strong>Structure Analysis</strong> - Thesis, flow, organization</li>
                                    <li>• 🎭 <strong>Rhetorical Enhancement</strong> - Persuasive techniques</li>
                                    <li>• 💎 <strong>Clarity & Precision</strong> - Clear, concise writing</li>
                                    <li>• 🎓 <strong>Admissions Tone</strong> - College essay optimization</li>
                                </ul>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-blue-200 mb-1">🧠 Socratic Learning</h5>
                                <p className="text-xs text-blue-300">
                                    Each suggestion includes tool recommendations to help you find similar issues independently.
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MozartStrokePanel;