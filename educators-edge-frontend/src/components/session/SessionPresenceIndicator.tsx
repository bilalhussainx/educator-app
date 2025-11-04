/**
 * ================================================================
 * SESSION PRESENCE INDICATOR
 * ================================================================
 * Real-time presence indicator showing who's in a session
 * Displays teacher and student connection status
 * Updates live via Socket.IO
 * ================================================================
 */

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { sessionOrchestrator, SessionPresence, UserRole } from '../../services/sessionOrchestrator';

interface SessionPresenceIndicatorProps {
    sessionId: string | number;
    currentRole: UserRole;
    className?: string;
    variant?: 'compact' | 'detailed' | 'banner';
}

export const SessionPresenceIndicator: React.FC<SessionPresenceIndicatorProps> = ({
    sessionId,
    currentRole,
    className = '',
    variant = 'detailed'
}) => {
    const [presence, setPresence] = useState<SessionPresence | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const initializePresence = async () => {
            try {
                // Get initial presence
                const initialPresence = await sessionOrchestrator.getSessionPresence(sessionId);
                if (initialPresence) {
                    setPresence(initialPresence);
                }
                setIsLoading(false);

                // Subscribe to updates
                unsubscribe = sessionOrchestrator.onPresenceUpdate(sessionId, (updatedPresence) => {
                    setPresence(updatedPresence);
                });
            } catch (error) {
                console.error('[SessionPresenceIndicator] Error:', error);
                setIsLoading(false);
            }
        };

        initializePresence();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [sessionId]);

    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">Loading presence...</span>
            </div>
        );
    }

    if (!presence) {
        return null;
    }

    const isTeacherPresent = presence.teacher.connected;
    const isStudentPresent = presence.student.connected;
    const isBothPresent = isTeacherPresent && isStudentPresent;

    // Determine waiting message
    const getWaitingMessage = () => {
        if (isBothPresent) {
            return 'Both users are present';
        }

        if (currentRole === 'teacher') {
            return isStudentPresent
                ? 'Student is here'
                : 'Waiting for student to join...';
        } else {
            return isTeacherPresent
                ? 'Teacher is here'
                : 'Waiting for teacher to start session...';
        }
    };

    // Compact variant - just icons
    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {isBothPresent ? (
                    <>
                        <Wifi className="h-4 w-4 text-green-500" />
                        <Users className="h-4 w-4 text-green-500" />
                    </>
                ) : (
                    <>
                        <WifiOff className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-slate-400">
                            {currentRole === 'teacher' ? 'Waiting for student' : 'Waiting for teacher'}
                        </span>
                    </>
                )}
            </div>
        );
    }

    // Banner variant - full-width notification
    if (variant === 'banner') {
        if (isBothPresent) {
            return null; // Don't show banner if both present
        }

        return (
            <div className={`bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-full">
                        <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-amber-200 text-sm">
                            {getWaitingMessage()}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                            The session will begin automatically when {currentRole === 'teacher' ? 'the student joins' : 'the teacher starts'}.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Detailed variant - full status display
    return (
        <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-slate-200">Session Status</h3>
            </div>

            <div className="space-y-2">
                {/* Teacher Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isTeacherPresent ? (
                            <UserCheck className="h-4 w-4 text-green-500" />
                        ) : (
                            <UserX className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-sm text-slate-300">Teacher</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${isTeacherPresent ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {isTeacherPresent ? 'Connected' : 'Not connected'}
                    </div>
                </div>

                {/* Student Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isStudentPresent ? (
                            <UserCheck className="h-4 w-4 text-green-500" />
                        ) : (
                            <UserX className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-sm text-slate-300">Student</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${isStudentPresent ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {isStudentPresent ? 'Connected' : 'Not connected'}
                    </div>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`mt-3 pt-3 border-t ${isBothPresent ? 'border-green-500/30' : 'border-amber-500/30'}`}>
                <div className="flex items-center gap-2">
                    {isBothPresent ? (
                        <>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-green-400 font-medium">
                                ✓ Session ready - both users present
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-xs text-amber-400">
                                {getWaitingMessage()}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Show usernames if available */}
            {(presence.teacher.username || presence.student.username) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400 space-y-1">
                        {presence.teacher.username && (
                            <div>Teacher: <span className="text-slate-300">{presence.teacher.username}</span></div>
                        )}
                        {presence.student.username && (
                            <div>Student: <span className="text-slate-300">{presence.student.username}</span></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionPresenceIndicator;
