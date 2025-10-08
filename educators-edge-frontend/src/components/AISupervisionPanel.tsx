/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   AISupervisionPanel.tsx
 * =================================================================
 * DESCRIPTION: AI supervision panel for lesson interfaces
 */
import React, { useState, useEffect } from 'react';
import { useAISupervision } from '../hooks/useAISupervision';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Badge component (inline)
const Badge: React.FC<{ 
    children: React.ReactNode; 
    className?: string; 
    variant?: 'default' | 'secondary' | 'outline';
}> = ({ children, className = '', variant = 'outline' }) => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    const variantClasses = {
        default: 'bg-blue-600 text-white',
        secondary: 'bg-slate-600 text-slate-200',
        outline: 'border border-slate-500 text-slate-300'
    };
    
    return (
        <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
};
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
    Brain, 
    Lightbulb, 
    TrendingUp, 
    Clock, 
    Target, 
    MessageCircle,
    ChevronRight,
    Sparkles,
    AlertTriangle,
    CheckCircle,
    HelpCircle
} from 'lucide-react';

interface AISupervisionPanelProps {
    lessonId: string;
    enabled?: boolean;
    onCodeChange?: (code: string) => void;
    studentProfile?: any;
    isMinimized?: boolean;
}

// Intervention Modal Component
const InterventionModal: React.FC<{
    intervention: any;
    onDismiss: () => void;
    onRequestHint: () => void;
}> = ({ intervention, onDismiss, onRequestHint }) => {
    const getInterventionIcon = (type: string) => {
        switch (type) {
            case 'hint': return <Lightbulb className="h-5 w-5 text-yellow-400" />;
            case 'suggestion': return <MessageCircle className="h-5 w-5 text-blue-400" />;
            case 'correction': return <AlertTriangle className="h-5 w-5 text-red-400" />;
            case 'encouragement': return <Sparkles className="h-5 w-5 text-green-400" />;
            default: return <Brain className="h-5 w-5 text-cyan-400" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-red-500 bg-red-950/50';
            case 'medium': return 'border-yellow-500 bg-yellow-950/50';
            case 'low': return 'border-blue-500 bg-blue-950/50';
            default: return 'border-slate-600 bg-slate-900/50';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className={`max-w-lg w-full border-2 ${getSeverityColor(intervention.severity)} animate-in fade-in-0 zoom-in-95`}>
                <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                        {getInterventionIcon(intervention.type)}
                        <div className="flex-1">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                {intervention.title}
                                <Badge variant="outline" className="text-xs capitalize">
                                    {intervention.type}
                                </Badge>
                            </CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-300 leading-relaxed">
                        {intervention.content}
                    </p>
                    
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onDismiss} size="sm">
                            Got it
                        </Button>
                        {intervention.type === 'hint' && (
                            <Button onClick={onRequestHint} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                More Help
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export const AISupervisionPanel: React.FC<AISupervisionPanelProps> = ({
    lessonId,
    enabled = true,
    onCodeChange,
    studentProfile,
    isMinimized = false
}) => {
    const {
        session,
        analysis,
        isActive,
        interventionHistory,
        startSupervision,
        analyzeCode,
        requestHint,
        recordProgress,
        endSupervision,
        getStudentInsights,
        shouldShowIntervention,
        hintsUsed
    } = useAISupervision(lessonId, enabled);

    const [showIntervention, setShowIntervention] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Auto-start supervision when component mounts
    useEffect(() => {
        if (!isInitialized && enabled && lessonId && studentProfile) {
            startSupervision(studentProfile);
            setIsInitialized(true);
        }
    }, [lessonId, enabled, studentProfile, isInitialized, startSupervision]);

    // Show interventions when they occur
    useEffect(() => {
        if (shouldShowIntervention()) {
            setShowIntervention(true);
        }
    }, [shouldShowIntervention]);

    // Handle code changes
    useEffect(() => {
        if (onCodeChange && isActive) {
            const handleCodeChange = (code: string) => {
                analyzeCode({
                    code,
                    timestamp: Date.now(),
                    action: 'typing'
                });
            };
            
            // This would be called by the parent component when code changes
            // onCodeChange(handleCodeChange);
        }
    }, [onCodeChange, isActive, analyzeCode]);

    const insights = getStudentInsights();

    const handleRequestHint = async () => {
        try {
            const hint = await requestHint('User requested additional help');
            // Handle hint display - could show in a toast or modal
            console.log('Received hint:', hint);
        } catch (error) {
            console.error('Failed to get hint:', error);
        }
    };

    if (!enabled || !isActive) {
        return (
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                <CardContent className="p-4 text-center">
                    <Brain className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">AI Supervision Inactive</p>
                </CardContent>
            </Card>
        );
    }

    if (isMinimized) {
        return (
            <>
                <Sheet>
                    <SheetTrigger asChild>
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 cursor-pointer hover:border-cyan-500/50 transition-colors">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="relative">
                                    <Brain className="h-6 w-6 text-cyan-400" />
                                    {insights?.needsHelp && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">AI Tutor</p>
                                    <p className="text-xs text-slate-400">
                                        {insights ? `${insights.completion}% complete` : 'Monitoring...'}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </CardContent>
                        </Card>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 bg-slate-900/95 backdrop-blur border-slate-700">
                        <SheetHeader>
                            <SheetTitle className="text-white flex items-center gap-2">
                                <Brain className="h-5 w-5 text-cyan-400" />
                                AI Supervision
                            </SheetTitle>
                        </SheetHeader>
                        <AISupervisionContent 
                            session={session}
                            insights={insights}
                            hintsUsed={hintsUsed}
                            interventionHistory={interventionHistory}
                            onRequestHint={handleRequestHint}
                        />
                    </SheetContent>
                </Sheet>

                {/* Intervention Modal */}
                {showIntervention && analysis?.intervention && (
                    <InterventionModal
                        intervention={analysis.intervention}
                        onDismiss={() => setShowIntervention(false)}
                        onRequestHint={handleRequestHint}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="h-5 w-5 text-cyan-400" />
                        AI Tutor
                        <div className="ml-auto flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-slate-400">Active</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AISupervisionContent 
                        session={session}
                        insights={insights}
                        hintsUsed={hintsUsed}
                        interventionHistory={interventionHistory}
                        onRequestHint={handleRequestHint}
                    />
                </CardContent>
            </Card>

            {/* Intervention Modal */}
            {showIntervention && analysis?.intervention && (
                <InterventionModal
                    intervention={analysis.intervention}
                    onDismiss={() => setShowIntervention(false)}
                    onRequestHint={handleRequestHint}
                />
            )}
        </>
    );
};

// Extracted content component for reuse
const AISupervisionContent: React.FC<{
    session: any;
    insights: any;
    hintsUsed: number;
    interventionHistory: any[];
    onRequestHint: () => void;
}> = ({ session, insights, hintsUsed, interventionHistory, onRequestHint }) => {
    return (
        <div className="space-y-4">
            {/* Progress Overview */}
            {insights && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Understanding</span>
                        <span className="text-sm text-white">{insights.understanding}%</span>
                    </div>
                    <Progress value={insights.understanding} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Progress</span>
                        <span className="text-sm text-white">{insights.completion}%</span>
                    </div>
                    <Progress value={insights.completion} className="h-2" />
                </div>
            )}

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-3 w-3 text-yellow-400" />
                    <span className="text-slate-400">Hints: {hintsUsed}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-3 w-3 text-blue-400" />
                    <span className="text-slate-400">Tips: {interventionHistory.length}</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
                <Button 
                    onClick={onRequestHint}
                    size="sm" 
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Get Hint
                </Button>

                {insights?.isStuck && (
                    <div className="p-2 bg-amber-950/50 border border-amber-500/30 rounded text-xs text-amber-200">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        You seem stuck. Consider asking for help!
                    </div>
                )}

                {insights?.needsHelp && (
                    <div className="p-2 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-200">
                        <Brain className="h-3 w-3 inline mr-1" />
                        AI detected you might need assistance.
                    </div>
                )}
            </div>

            {/* Session Info */}
            {session && (
                <div className="pt-3 border-t border-slate-700 text-xs text-slate-500">
                    <p>Session started: {new Date(session.start_time).toLocaleTimeString()}</p>
                </div>
            )}
        </div>
    );
};

export default AISupervisionPanel;