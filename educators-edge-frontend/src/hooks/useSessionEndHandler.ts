/**
 * ================================================================
 * USE SESSION END HANDLER HOOK
 * ================================================================
 * React hook to handle session end events and auto-redirect
 * Use this in session editor pages (LiveTutorialPage, UrgentEssaySessionPage, etc.)
 * ================================================================
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionOrchestrator } from '../services/sessionOrchestrator';
import { toast } from 'sonner';

interface UseSessionEndHandlerOptions {
    sessionId: string | number;
    redirectPath?: string; // Where to redirect after session ends (default: /sessions)
    showNotification?: boolean; // Show toast notification (default: true)
    onSessionEnd?: (data: any) => void; // Custom callback before redirect
}

/**
 * Hook to handle session end events
 *
 * @example
 * ```tsx
 * // In LiveTutorialPage or UrgentEssaySessionPage
 * const { sessionId } = useParams();
 *
 * useSessionEndHandler({
 *     sessionId,
 *     redirectPath: '/sessions',
 *     onSessionEnd: (data) => {
 *         console.log('Session ended:', data);
 *         // Save any work, cleanup, etc.
 *     }
 * });
 * ```
 */
export function useSessionEndHandler(options: UseSessionEndHandlerOptions) {
    const {
        sessionId,
        redirectPath = '/sessions',
        showNotification = true,
        onSessionEnd
    } = options;

    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionId) {
            console.warn('[useSessionEndHandler] No sessionId provided');
            return;
        }

        console.log('[useSessionEndHandler] Setting up session end handler for session:', sessionId);

        // Subscribe to session end events
        const unsubscribe = sessionOrchestrator.onSessionEnded(sessionId, (data) => {
            console.log('[useSessionEndHandler] Session ended event received:', data);

            // Call custom callback if provided
            if (onSessionEnd) {
                try {
                    onSessionEnd(data);
                } catch (error) {
                    console.error('[useSessionEndHandler] Error in onSessionEnd callback:', error);
                }
            }

            // Show notification
            if (showNotification) {
                toast.error('Session Ended', {
                    description: data.message || 'The teacher has ended this session',
                    duration: 5000,
                    action: {
                        label: 'Go to Sessions',
                        onClick: () => navigate(redirectPath)
                    }
                });
            }

            // Auto-redirect after a short delay (allow user to see notification)
            setTimeout(() => {
                console.log('[useSessionEndHandler] Redirecting to:', redirectPath);
                navigate(redirectPath);
            }, 2000); // 2 second delay
        });

        // Cleanup on unmount
        return () => {
            console.log('[useSessionEndHandler] Cleaning up session end handler');
            unsubscribe();
        };
    }, [sessionId, redirectPath, showNotification, onSessionEnd, navigate]);
}

export default useSessionEndHandler;
