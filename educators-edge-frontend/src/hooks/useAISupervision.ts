/*
 * =================================================================
 * FOLDER: src/hooks/
 * FILE:   useAISupervision.ts
 * =================================================================
 * DESCRIPTION: Hook for AI supervision during coding lessons
 */
import { useState, useCallback, useEffect } from 'react';
import apiClient from '../services/apiClient';
import type { AISupervisionSession } from '../types/index.ts';

interface AIAnalysis {
    shouldIntervene: boolean;
    intervention?: {
        type: 'hint' | 'suggestion' | 'correction' | 'encouragement';
        title: string;
        content: string;
        severity: 'low' | 'medium' | 'high';
    };
    progress_assessment: {
        understanding_level: number; // 0-100
        completion_percentage: number;
        stuck_duration: number; // seconds
    };
    next_steps?: string[];
}

interface StudentProfile {
    course_id?: string;
    lesson_id?: string;
    difficulty_preference?: string;
    learning_goals?: string[];
    learning_style?: string;
}

interface CodeChange {
    code: string;
    timestamp: number;
    file_name?: string;
    language?: string;
    action?: 'typing' | 'deletion' | 'execution' | 'test';
}

export const useAISupervision = (lessonId: string, enabled: boolean = true) => {
    const [session, setSession] = useState<AISupervisionSession | null>(null);
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [interventionHistory, setInterventionHistory] = useState<AIAnalysis['intervention'][]>([]);
    const [lastCodeChangeTime, setLastCodeChangeTime] = useState<number>(0);
    
    // Debounce delay for code analysis (ms)
    const ANALYSIS_DEBOUNCE_DELAY = 2000;
    
    const startSupervision = useCallback(async (studentProfile: StudentProfile) => {
        if (!enabled || !lessonId) return;
        
        try {
            const response = await apiClient.post(`/api/ai-courses/start-supervision/${lessonId}`, {
                studentProfile: {
                    ...studentProfile,
                    lesson_id: lessonId,
                    session_start: new Date().toISOString()
                }
            });
            
            const newSession = response.data.session;
            setSession(newSession);
            setIsActive(true);
            
            console.log('AI Supervision started:', newSession);
            return newSession;
        } catch (error) {
            console.error('Failed to start AI supervision:', error);
            throw error;
        }
    }, [lessonId, enabled]);

    const analyzeCode = useCallback(async (codeChange: CodeChange) => {
        if (!session || !isActive || !enabled) return;
        
        const now = Date.now();
        setLastCodeChangeTime(now);
        
        // Debounce code analysis to avoid too many API calls
        setTimeout(async () => {
            // Only proceed if this is still the latest code change
            if (lastCodeChangeTime !== now) return;
            
            try {
                const response = await apiClient.post(`/api/ai-courses/analyze-code/${session.id}`, {
                    codeChange: {
                        ...codeChange,
                        session_id: session.id,
                        timestamp: now
                    }
                });
                
                const newAnalysis: AIAnalysis = response.data.analysis;
                setAnalysis(newAnalysis);
                
                // Track interventions
                if (newAnalysis.intervention) {
                    setInterventionHistory(prev => [...prev, newAnalysis.intervention!]);
                }
                
                return newAnalysis;
            } catch (error) {
                console.error('Failed to analyze code:', error);
            }
        }, ANALYSIS_DEBOUNCE_DELAY);
    }, [session, isActive, enabled, lastCodeChangeTime]);

    const requestHint = useCallback(async (context?: string) => {
        if (!session || !isActive) return;
        
        try {
            const response = await apiClient.post(`/api/ai-courses/request-hint/${session.id}`, {
                context,
                timestamp: Date.now()
            });
            
            const hint = response.data.hint;
            
            // Update session hint count
            setSession(prev => prev ? {
                ...prev,
                hints_used: prev.hints_used + 1
            } : null);
            
            return hint;
        } catch (error) {
            console.error('Failed to request hint:', error);
            throw error;
        }
    }, [session, isActive]);

    const recordProgress = useCallback(async (progressData: {
        milestone?: string;
        completion_percentage?: number;
        time_spent?: number;
        test_results?: any;
    }) => {
        if (!session || !isActive) return;
        
        try {
            await apiClient.post(`/api/ai-courses/record-progress/${session.id}`, {
                progress_data: progressData,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to record progress:', error);
        }
    }, [session, isActive]);

    const endSupervision = useCallback(async () => {
        if (!session) return;
        
        try {
            await apiClient.post(`/api/ai-courses/end-supervision/${session.id}`, {
                end_time: new Date().toISOString(),
                final_metrics: {
                    total_interventions: interventionHistory.length,
                    hints_used: session.hints_used,
                    session_duration: Date.now() - new Date(session.start_time).getTime()
                }
            });
            
            setSession(null);
            setAnalysis(null);
            setIsActive(false);
            setInterventionHistory([]);
        } catch (error) {
            console.error('Failed to end supervision:', error);
        }
    }, [session, interventionHistory]);

    // Auto-cleanup on unmount
    useEffect(() => {
        return () => {
            if (isActive) {
                endSupervision();
            }
        };
    }, [isActive, endSupervision]);

    // Helper functions for UI integration
    const getStudentInsights = useCallback(() => {
        if (!analysis) return null;
        
        return {
            understanding: analysis.progress_assessment.understanding_level,
            completion: analysis.progress_assessment.completion_percentage,
            isStuck: analysis.progress_assessment.stuck_duration > 300, // 5 minutes
            needsHelp: analysis.shouldIntervene,
            intervention: analysis.intervention
        };
    }, [analysis]);

    const shouldShowIntervention = useCallback(() => {
        return analysis?.shouldIntervene && analysis.intervention;
    }, [analysis]);

    return {
        // State
        session,
        analysis,
        isActive,
        interventionHistory,
        
        // Actions
        startSupervision,
        analyzeCode,
        requestHint,
        recordProgress,
        endSupervision,
        
        // Helpers
        getStudentInsights,
        shouldShowIntervention,
        
        // Utilities
        isEnabled: enabled,
        hasSession: !!session,
        interventionCount: interventionHistory.length,
        hintsUsed: session?.hints_used || 0
    };
};

export default useAISupervision;