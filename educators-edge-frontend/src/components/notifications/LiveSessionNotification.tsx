/**
 * =================================================================
 * LIVE SESSION NOTIFICATION COMPONENT
 * =================================================================
 * Displays real-time notifications when teachers create live sessions
 * Auto-connects to WebSocket and listens for session:created events
 * =================================================================
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RadioTower, X, Video } from 'lucide-react';
import { User } from '@/types/index';

interface SessionNotification {
    type: 'live_session_created';
    sessionId: string;
    courseId: string;
    teacherId: string;
    teacherName: string;
    title: string;
    mode: 'coding' | 'essay';
    timestamp: string;
    message: string;
    joinUrl: string;
    priority: 'high' | 'normal';
}

interface LiveSessionNotificationProps {
    user: User | null;
}

export const LiveSessionNotification: React.FC<LiveSessionNotificationProps> = ({ user }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState<SessionNotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Only connect if user is a student
        if (!user || user.role !== 'student') {
            console.log('[Live Session Notifications] Not a student, skipping WebSocket connection');
            return;
        }

        console.log('[Live Session Notifications] Initializing WebSocket connection for user:', user.id);

        // Connect to Socket.IO server
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
        const newSocket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: false
        });

        setSocket(newSocket);

        // Connection handlers
        newSocket.on('connect', () => {
            console.log('[Live Session Notifications] ✅ Connected to WebSocket');
            setIsConnected(true);

            // Register for notifications
            newSocket.emit('register:notifications', user.id);
            console.log('[Live Session Notifications] 📢 Registered for notifications');
        });

        newSocket.on('disconnect', () => {
            console.log('[Live Session Notifications] ❌ Disconnected from WebSocket');
            setIsConnected(false);
        });

        newSocket.on('notifications:registered', (data) => {
            console.log('[Live Session Notifications] ✅ Registration confirmed:', data);

            // Check if there are any active sessions
            if (data.activeSessions && data.activeSessions.length > 0) {
                console.log(`[Live Session Notifications] 📢 Found ${data.activeSessions.length} active sessions`);

                // Add all active sessions to notifications
                setNotifications(data.activeSessions);

                // Show toast for each active session
                data.activeSessions.forEach((session: SessionNotification) => {
                    toast(
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-full bg-cyan-500/20">
                                    <RadioTower className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">Active Live Session!</div>
                                    <div className="text-xs text-slate-400 mt-1">{session.message}</div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    navigate(session.joinUrl);
                                    toast.dismiss();
                                }}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                            >
                                <Video className="h-4 w-4 mr-2" />
                                Join Now
                            </Button>
                        </div>,
                        {
                            duration: 15000, // Longer duration for active sessions
                            position: 'top-right',
                            className: 'bg-slate-800 border-cyan-500/50'
                        }
                    );
                });

                toast.success(`Found ${data.activeSessions.length} active session(s)!`, {
                    duration: 3000
                });
            } else {
                toast.success('You\'re connected to live session notifications!', {
                    duration: 2000
                });
            }
        });

        // Listen for session acceptance notifications
        newSocket.on('session:accepted', (notification: any) => {
            console.log('[Live Session Notifications] ✅ Session accepted notification:', notification);

            // Show toast notification
            toast.success(
                <div className="flex flex-col gap-1">
                    <div className="font-semibold text-sm">Session Request Accepted!</div>
                    <div className="text-xs">{notification.message}</div>
                </div>,
                {
                    duration: 8000,
                    position: 'top-right'
                }
            );

            // Play notification sound (optional)
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.log('Audio play failed:', err));
            } catch (err) {
                // Ignore audio errors
            }
        });

        // Listen for live session creation
        newSocket.on('session:created', (notification: SessionNotification) => {
            console.log('[Live Session Notifications] ========================================');
            console.log('[Live Session Notifications] 🔔 STUDENT RECEIVED NOTIFICATION');
            console.log('[Live Session Notifications] Session ID:', notification.sessionId);
            console.log('[Live Session Notifications] Mode:', notification.mode);
            console.log('[Live Session Notifications] Join URL:', notification.joinUrl);
            console.log('[Live Session Notifications] Liveblocks Room ID will be: essay-' + notification.sessionId);
            console.log('[Live Session Notifications] Full notification:', notification);
            console.log('[Live Session Notifications] ========================================');

            // Add to notifications list
            setNotifications(prev => [notification, ...prev]);

            // Show toast notification with action button
            toast(
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-cyan-500/20">
                            <RadioTower className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-sm">Live Session Started!</div>
                            <div className="text-xs text-slate-400 mt-1">{notification.message}</div>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            console.log('[Live Session Notifications] 🚀 STUDENT JOINING SESSION');
                            console.log('[Live Session Notifications] Navigating to:', notification.joinUrl);
                            navigate(notification.joinUrl);
                            toast.dismiss();
                        }}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                    >
                        <Video className="h-4 w-4 mr-2" />
                        Join Now
                    </Button>
                </div>,
                {
                    duration: 10000,
                    position: 'top-right',
                    className: 'bg-slate-800 border-cyan-500/50'
                }
            );

            // Play notification sound (optional)
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.log('Audio play failed:', err));
            } catch (err) {
                // Ignore audio errors
            }
        });

        // Listen for session ended events
        newSocket.on('session_ended', (data: { sessionId: string }) => {
            console.log('[Live Session Notifications] 🛑 Session ended:', data.sessionId);
            // Remove notification from list
            setNotifications(prev => prev.filter(n => n.sessionId !== data.sessionId));
            toast.info('A live session has ended', {
                duration: 3000
            });
        });

        newSocket.on('error', (error) => {
            console.error('[Live Session Notifications] ❌ Socket error:', error);
        });

        // Cleanup on unmount
        return () => {
            console.log('[Live Session Notifications] 🔌 Cleaning up WebSocket connection');
            if (newSocket) {
                newSocket.emit('unregister:notifications');
                newSocket.disconnect();
            }
        };
    }, [user, navigate]);

    const handleJoinSession = (notification: SessionNotification) => {
        navigate(notification.joinUrl);
        // Remove notification from list
        setNotifications(prev => prev.filter(n => n.sessionId !== notification.sessionId));
    };

    const handleDismissNotification = (sessionId: string) => {
        setNotifications(prev => prev.filter(n => n.sessionId !== sessionId));
    };

    // Don't render anything if not a student or no notifications
    if (!user || user.role !== 'student' || notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
            {notifications.map((notification) => (
                <div
                    key={notification.sessionId}
                    className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-lg p-4 shadow-2xl animate-in slide-in-from-right duration-300"
                >
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-full bg-cyan-500/20">
                            <RadioTower className="h-5 w-5 text-cyan-400 animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-white text-sm">
                                {notification.teacherName} started a live session!
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {notification.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDismissNotification(notification.sessionId)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <Button
                        onClick={() => handleJoinSession(notification)}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
                        size="sm"
                    >
                        <Video className="h-4 w-4 mr-2" />
                        Join {notification.mode === 'essay' ? 'Essay Session' : 'Coding Session'}
                    </Button>
                </div>
            ))}

            {/* Connection status indicator */}
            {isConnected && (
                <div className="text-xs text-center text-slate-500 flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Connected to live notifications
                </div>
            )}
        </div>
    );
};

export default LiveSessionNotification;
