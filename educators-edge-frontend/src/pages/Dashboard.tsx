import React, { useState, useEffect } from 'react';
import type { DashboardProps, Course, EnrolledCourse, LiveSession, StuckPointNotification } from '../types/index.ts';
import { useNavigate } from 'react-router-dom';
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle, Users, BookOpen, Settings, Search,
    AlertTriangle, Eye, RadioTower, ChevronsRight,
    BarChart, Zap, Calendar, Code, Trophy, Sparkles,
    Video, Play
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient'; // The centralized API client
import axios from 'axios'; // Import axios to check for specific error types
import { PortfolioWidget } from '../components/trade/PortfolioWidget'; // <-- 1. IMPORT THE WIDGET
import TeacherNotifications from '../components/TeacherNotifications';
import sessionWebSocketService from '../services/sessionWebSocketService';

// --- Reusable UI Components ---
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300", className)} {...props} />
);

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>>(
    ({ className, value, ...props }, ref) => (
        <ProgressPrimitive.Root
            ref={ref}
            className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-cyan-400 transition-all"
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    )
);
Progress.displayName = ProgressPrimitive.Root.displayName;


// --- Dashboard Widget Components ---

const HudStatCard: React.FC<{ icon: React.ElementType; value: string | number; label: string; }> = ({ icon: Icon, value, label }) => (
    <GlassCard>
        <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-slate-700/50 rounded-lg">
                <Icon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-slate-400">{label}</p>
            </div>
        </CardContent>
    </GlassCard>
);

const StuckPointNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await apiClient.get('/api/stuck-points');
                setNotifications(response.data);
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
        setNotifications(current => current.filter(n => !(n.student_id === studentId && n.details.lesson_id === lessonId)));
        navigate(`/lesson/${lessonId}`);
        await apiClient.post('/api/stuck-points/dismiss', { studentId, lessonId });
    };

    if (isLoading || notifications.length === 0) return null;

    return (
        <GlassCard className="border-fuchsia-500/50 hover:border-fuchsia-400 bg-fuchsia-950/20">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20">
                        <AlertTriangle className="h-6 w-6 text-fuchsia-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-fuchsia-300">AI-Powered Alerts</CardTitle>
                        <CardDescription className="text-fuchsia-400/80">Students detected requiring assistance.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {notifications.map(n => (
                        <li key={`${n.student_id}-${n.details.lesson_id}`} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div>
                                <p className="font-semibold text-gray-200">{n.message}</p>
                                <p className="text-sm text-gray-400">
                                    {`Test: "${n.details.stuck_on_test}" (${n.details.attempts_on_test} attempts)`}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleViewAndDismiss(n.student_id, n.details.lesson_id)} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
                                <Eye className="mr-2 h-4 w-4" /> Review
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </GlassCard>
    );
};

const LiveSessions: React.FC<{ sessions: LiveSession[] }> = ({ sessions }) => {
    const navigate = useNavigate();
    if (sessions.length === 0) return null;

    return (
        <GlassCard className="border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <RadioTower className="h-6 w-6 text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-cyan-300">Live Sessions Available</CardTitle>
                        <CardDescription className="text-cyan-400/80">Join a live instruction session now.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {sessions.map(session => (
                        <li key={session.sessionId} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div>
                                <p className="font-semibold text-gray-200">{session.courseName}</p>
                                <p className="text-sm text-gray-400">Hosted by {session.teacherName}</p>
                            </div>
                            <Button onClick={() => navigate(`/session/${session.sessionId}`)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                Join Now
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </GlassCard>
    );
};


// --- Main Dashboard Component ---
const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const [courses, setCourses] = useState<Course[] | EnrolledCourse[]>([]);
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                navigate('/login');
                return;
            }
            setIsLoading(true);
            try {
                const coursesEndpoint = user.role === 'teacher' ? '/api/courses' : '/api/students/my-courses';

                const coursesResponse = await apiClient.get(coursesEndpoint);
                setCourses(coursesResponse.data);

                if (user.role === 'student') {
                    const sessionsResponse = await apiClient.get('/api/sessions/active');
                    setLiveSessions(sessionsResponse.data);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                toast.error("Could not load dashboard data.");
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate, user]);

    // WebSocket connection and live session notifications
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Connect to WebSocket
        sessionWebSocketService.connect(user.id.toString(), token);

        // Listen for live session notifications (students only)
        if (user.role === 'student') {
            const unsubscribeSessionStarted = sessionWebSocketService.on('sessionStarted', (data) => {
                console.log('Live session started:', data);

                // Add the new session to the live sessions list
                const newSession: LiveSession = {
                    sessionId: data.sessionId,
                    courseName: data.courseName || 'Live Tutorial',
                    teacherName: data.teacherName || 'Teacher',
                    status: 'active'
                };

                setLiveSessions(current => [...current, newSession]);

                // Show notification
                toast.success(`🎓 Live session "${newSession.courseName}" started by ${newSession.teacherName}!`, {
                    action: {
                        label: "Join Now",
                        onClick: () => navigate(`/session/${data.sessionId}`)
                    },
                    duration: 10000
                });
            });

            // Listen for essay session notifications
            const unsubscribeEssaySessionStarted = sessionWebSocketService.on('essaySessionStarted', (data) => {
                console.log('Essay session started:', data);

                // Add the new essay session to the live sessions list
                const newEssaySession: LiveSession = {
                    sessionId: data.sessionId,
                    courseName: data.courseName || 'Essay Writing Session',
                    teacherName: data.teacherName || 'Teacher',
                    status: 'active'
                };

                setLiveSessions(current => [...current, newEssaySession]);

                // Show notification with essay-specific styling
                toast.success(`📝 Essay writing session "${newEssaySession.courseName}" started by ${newEssaySession.teacherName}!`, {
                    action: {
                        label: "Join Essay Session",
                        onClick: () => navigate(`/dual-mode-session/${data.sessionId}`)
                    },
                    duration: 10000
                });
            });

            return () => {
                unsubscribeSessionStarted();
                unsubscribeEssaySessionStarted();
                sessionWebSocketService.disconnect();
            };
        }

        return () => {
            sessionWebSocketService.disconnect();
        };
    }, [user, navigate]);

    // Handler for creating live tutorial sessions
    const handleStartLiveSession = () => {
        if (!user) return;

        // Generate a unique session ID client-side
        const sessionId = `live_${user.id}_${Date.now()}`;

        // Broadcast the session start to all connected students via WebSocket
        sessionWebSocketService.send('session_started', {
            sessionId,
            courseName: 'Live Tutorial Session',
            teacherName: user.username || user.email,
            teacherId: user.id,
            startTime: new Date().toISOString()
        });

        toast.success("Starting live tutorial session... Students will be notified!");

        // Navigate directly to the LiveTutorialPage with the generated sessionId
        navigate(`/session/${sessionId}`);
    };

    // [ADDITIVE CHANGE] - Add this new handler function for the Scribe Session button.
    const handleStartScribeSession = async () => {
        if (!user) return; // Guard clause

        toast.info("Creating a new document session...");

        try {
            // Step 1: Tell our backend to create a new collaborative document.
            // (We will need to create this simple endpoint next).
            const response = await apiClient.post('/api/documents/create', {
                title: `New Scribe Session - ${new Date().toLocaleString()}`,
                ownerId: user.id,
            });

            const { documentId } = response.data;

            if (!documentId) {
                throw new Error("Did not receive a document ID from the server.");
            }

            // Step 2: Navigate the user to the new Scribe Session page with the new document ID.
            toast.success("Session created. Redirecting...");
            navigate(`/scribe/${documentId}`);

        } catch (error) {
            console.error("Failed to create Scribe session:", error);
            toast.error("Could not create a new Scribe session. Please try again.");
        }
    };

    const renderTeacherDashboard = () => {
        const teacherCourses = courses as Course[];

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-12">
                    {/* Hero Header */}
                    <header className="text-center space-y-6">
                        <div className="relative">
                            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                                Teaching Hub
                            </h1>
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-lg blur-xl opacity-30"></div>
                        </div>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                            Welcome back, <span className="text-purple-400 font-semibold">{user?.username}</span>.
                            Shape the future through education and mentorship.
                        </p>

                        {/* Quick Action Bar with Achievement Stats */}
                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center justify-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                    <span className="text-purple-400 text-sm font-medium">42 Active Students</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                                    <BookOpen className="w-4 h-4 text-cyan-400" />
                                    <span className="text-cyan-400 text-sm font-medium">{teacherCourses.length} Courses</span>
                                </div>
                            </div>

                            {/* Teacher Achievement Stats Table */}
                            <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-3">
                                <table className="text-xs">
                                    <tbody className="space-y-1">
                                        <tr>
                                            <td className="text-slate-400 pr-3">XP:</td>
                                            <td className="text-cyan-400 font-bold">8,450</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400 pr-3">P-Score:</td>
                                            <td className="text-purple-400 font-bold">⚡ 94</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400 pr-3">Sessions:</td>
                                            <td className="text-emerald-400 font-bold">127</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400 pr-3">Rating:</td>
                                            <td className="text-amber-400 font-bold">★ 4.9</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </header>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Session Management Landing */}
                            <div className="group relative cursor-pointer" onClick={() => navigate('/sessions')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                                                <Calendar className="h-6 w-6 text-cyan-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-white">Sessions</p>
                                                <p className="text-xs text-slate-400">Manage & Schedule</p>
                                            </div>
                                        </div>
                                        <div className="text-cyan-400 opacity-60">
                                            <ChevronsRight className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <p className="text-sm font-medium text-white">Next Session</p>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">React Advanced Concepts</p>
                                        <p className="text-xs text-slate-300">Today, 3:00 PM</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Live</span>
                                            <span className="text-xs text-slate-500">5 students</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">3 pending requests</span>
                                        <span className="text-cyan-400 font-medium">Manage →</span>
                                    </div>
                                </div>
                            </div>

                            {/* Course Creation Landing */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300">
                                    {/* Clickable Course Stats Header */}
                                    <div
                                        className="flex items-center justify-between mb-4 cursor-pointer hover:bg-slate-800/30 rounded-lg p-2 -m-2 transition-all duration-200"
                                        onClick={() => {
                                            // Scroll to courses section on the same page
                                            const coursesSection = document.getElementById('teacher-courses-section');
                                            if (coursesSection) {
                                                coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                                                <BookOpen className="h-6 w-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-white">{teacherCourses.length}</p>
                                                <p className="text-xs text-slate-400">Courses Created</p>
                                            </div>
                                        </div>
                                        <div className="text-purple-400 opacity-60">
                                            <ChevronsRight className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {/* Quick Start Course Creation Section */}
                                    <div
                                        className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50 cursor-pointer hover:bg-slate-800/70 transition-all duration-200"
                                        onClick={() => navigate('/courses/new')}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                                <PlusCircle className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">Create New Course</p>
                                                <p className="text-xs text-slate-400">Share your expertise</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-2">Build engaging lessons with our course creator</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Templates Ready</span>
                                            <span className="text-xs text-green-400">Quick Start →</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Click stats to view • Quick Start to create</span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Session Creation Landing */}
                            <div className="group relative cursor-pointer" onClick={handleStartLiveSession}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30 relative">
                                                <Video className="h-6 w-6 text-emerald-400" />
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-white">Live Session</p>
                                                <p className="text-xs text-slate-400">Start Tutorial</p>
                                            </div>
                                        </div>
                                        <div className="text-emerald-400 opacity-60">
                                            <Play className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 mb-3 border border-emerald-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                                                <Video className="h-4 w-4 text-slate-900" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">Interactive Tutorial</p>
                                                <p className="text-xs text-emerald-400">Video + Code + Whiteboard</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-2">Real-time collaboration with students</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded animate-pulse">Ready to Go</span>
                                            <span className="text-xs text-green-400">Instant Start</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Video, Audio, Screen Share</span>
                                        <span className="text-emerald-400 font-medium">Start Live →</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="group relative h-full">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative h-full">
                                    <PortfolioWidget />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications & Quick Actions */}
                    <div className="space-y-8">
                        <StuckPointNotifications />
                        <TeacherNotifications className="mb-6" />
                    </div>

                    {/* Recent Courses Section */}
                    {teacherCourses.length > 0 && (
                        <div id="teacher-courses-section" className="space-y-6 scroll-mt-8">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                📚 Your Courses
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {teacherCourses.slice(0, 6).map(course => (
                                    <div key={course.id} className="group relative">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-500/50 transition-all duration-300">
                                            <div className="mb-4">
                                                <h3 className="text-lg font-bold text-white mb-2">{course.title}</h3>
                                                <p className="text-sm text-slate-400">{course.description}</p>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-cyan-400/70" />
                                                    <span>{course.student_count} Students</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-cyan-400/70" />
                                                    <span>{course.lesson_count} Lessons</span>
                                                </div>
                                            </div>
                                            <Button
                                                className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-slate-200"
                                                onClick={() => navigate(`/courses/${course.id}/edit`)}
                                            >
                                                <Settings className="mr-2 h-4 w-4" /> Manage Course
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Course Creation CTA */}
                    <div className="text-center pt-8">
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
                            onClick={() => navigate('/courses/new')}
                        >
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Create New Course
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStudentDashboard = () => {
        const enrolledCourses = courses as EnrolledCourse[];
        const primaryCourse = enrolledCourses.length > 0 ? enrolledCourses[0] : null;
        const otherCourses = enrolledCourses.slice(1);

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-12">
                    {/* Hero Header */}
                    <header className="text-center space-y-6">
                        <div className="relative">
                            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                                Career Launchpad
                            </h1>
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur-xl opacity-30"></div>
                        </div>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                            Welcome to your definitive crucible, <span className="text-cyan-400 font-semibold">{user?.username}</span>.
                            Today, you forge provable skills and expand your professional network.
                        </p>

                        {/* Quick Action Bar */}
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-400 text-sm font-medium">12 Days Active</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                                <Zap className="w-4 h-4 text-cyan-400" />
                                <span className="text-cyan-400 text-sm font-medium">2450 XP This Week</span>
                            </div>
                        </div>
                    </header>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* LeetCode Problems Landing */}
                            <div className="group relative cursor-pointer" onClick={() => navigate('/leetcode')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                                                <Trophy className="h-6 w-6 text-cyan-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-white">128</p>
                                                <p className="text-xs text-slate-400">Problems Solved</p>
                                            </div>
                                        </div>
                                        <div className="text-cyan-400 opacity-60">
                                            <ChevronsRight className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <p className="text-sm font-medium text-white">Two Sum</p>
                                        </div>
                                        <p className="text-xs text-slate-400">Solved 2 hours ago</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Easy</span>
                                            <span className="text-xs text-slate-500">+15 XP</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Next: Array problems</span>
                                        <span className="text-cyan-400 font-medium">Continue →</span>
                                    </div>
                                </div>
                            </div>

                            {/* Real Mentor Session Landing */}
                            <div className="group relative cursor-pointer" onClick={() => navigate('/trust-graph')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                                                <Users className="h-6 w-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-white">2450</p>
                                                <p className="text-xs text-slate-400">Weekly XP</p>
                                            </div>
                                        </div>
                                        <div className="text-purple-400 opacity-60">
                                            <ChevronsRight className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                b
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">bilalhussain.v1</p>
                                                <p className="text-xs text-orange-400">Pathfinder • ⚡ 0 P-Score</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Computer Science</span>
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Algorithms</span>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-2">Available for Programming & Software Development mentoring</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Teacher</span>
                                            <span className="text-xs text-cyan-400">Request Session</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Trust Graph Network</span>
                                        <span className="text-purple-400 font-medium">Book Session →</span>
                                    </div>
                                </div>
                            </div>

                            {/* TrustGraph Bot Urgent Help */}
                            <div className="group relative cursor-pointer" onClick={() => navigate('/trust-graph')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30 relative">
                                                <Sparkles className="h-6 w-6 text-emerald-400" />
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">AI Helper</p>
                                                <p className="text-xs text-slate-400">Urgent Session</p>
                                            </div>
                                        </div>
                                        <div className="text-emerald-400 opacity-60">
                                            <ChevronsRight className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 mb-3 border border-emerald-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center text-slate-900 text-xs font-bold">
                                                🤖
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">DataBot Pro</p>
                                                <p className="text-xs text-emerald-400">Algorithm Expert</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-2">"Need help with your sorting algorithm? I'm here!"</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded animate-pulse">Available Now</span>
                                            <span className="text-xs text-green-400">Free Session</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Trust Score: 4.9/5</span>
                                        <span className="text-emerald-400 font-medium">Get Help →</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="group relative h-full">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative h-full">
                                    <PortfolioWidget />
                                </div>
                            </div>
                        </div>
                    </div>

                {primaryCourse && (
                    <GlassCard className="border-cyan-500/50 hover:border-cyan-400">
                         <CardHeader>
                            <CardTitle className="text-2xl text-white">🎓 Learn - Active Learning Path</CardTitle>
                            <CardDescription className="text-slate-400 pt-1">{primaryCourse.title}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div>
                                <div className="flex justify-between text-sm text-slate-300 mb-2">
                                    <span>Progress</span>
                                    <span className="font-mono">{primaryCourse.lessons_completed} / {primaryCourse.lesson_count}</span>
                                </div>
                                <Progress value={(primaryCourse.lessons_completed / primaryCourse.lesson_count) * 100} />
                            </div>
                            <Button className="w-full text-lg py-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold" onClick={() => navigate(`/courses/${primaryCourse.id}/learn`)}>
                                <ChevronsRight className="mr-2 h-5 w-5" />
                                {primaryCourse.lessons_completed === primaryCourse.lesson_count ? 'Review Course' : 'Jump Back In'}
                            </Button>
                        </CardContent>
                    </GlassCard>
                )}

                <LiveSessions sessions={liveSessions} />

                {otherCourses.length > 0 && (
                    <div className="space-y-6 pt-4">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-200">📚 Learn - Additional Skill Paths</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {otherCourses.map(course => (
                                <GlassCard key={course.id} className="hover:border-slate-500 flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white">{course.title}</CardTitle>
                                        <CardDescription className="h-10 text-slate-400 pt-1">{course.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4 flex-grow flex flex-col justify-end">
                                        <div>
                                            <div className="flex justify-between text-sm text-slate-300 mb-2">
                                                <span>Progress</span>
                                                <span className="font-mono">{course.lessons_completed} / {course.lesson_count}</span>
                                            </div>
                                            <Progress value={(course.lessons_completed / course.lesson_count) * 100} />
                                        </div>
                                        <Button className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-slate-200" onClick={() => navigate(`/courses/${course.id}/learn`)}>
                                            <BookOpen className="mr-2 h-4 w-4" /> View Course
                                        </Button>
                                    </CardContent>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                    {/* Professional Workflow Sections */}
                    {/* Build - Project Portfolio */}
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-full">
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">🔨</span>
                                </div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                    Build - Project Portfolio
                                </h2>
                            </div>
                            <p className="text-slate-400 max-w-2xl mx-auto">Showcase your real-world applications and build algorithmic thinking through hands-on practice</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Portfolio Projects */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-orange-500/50 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30">
                                            <Code className="h-8 w-8 text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Portfolio Projects</h3>
                                            <p className="text-slate-400">Real-world applications</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed mb-6 flex-grow">
                                        Showcase your skills through interactive projects that demonstrate your expertise to potential employers.
                                    </p>
                                    <Button
                                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                                        onClick={() => navigate('/ascent-ide')}
                                    >
                                        <Code className="mr-2 h-5 w-5" /> Launch IDE
                                    </Button>
                                </div>
                            </div>

                            {/* LeetCode Mastery */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
                                            <Trophy className="h-8 w-8 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">LeetCode Mastery</h3>
                                            <p className="text-slate-400">Algorithmic thinking</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed mb-6 flex-grow">
                                        Build problem-solving skills and algorithmic thinking through structured practice and competitive programming.
                                    </p>
                                    <Button
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                                        onClick={() => navigate('/leetcode')}
                                    >
                                        <Trophy className="mr-2 h-5 w-5" /> Practice Now
                                    </Button>
                                </div>
                            </div>

                            {/* Trading Terminal */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
                                            <BarChart className="h-8 w-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Trading Terminal</h3>
                                            <p className="text-slate-400">Market analysis</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed mb-6 flex-grow">
                                        Professional market analysis and portfolio management tools for financial literacy and investment skills.
                                    </p>
                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                                        onClick={() => navigate('/ecosystem-dashboard')}
                                    >
                                        <BarChart className="mr-2 h-5 w-5" /> Open Terminal
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connect - Professional Network */}
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">🤝</span>
                                </div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    Connect - Professional Network
                                </h2>
                            </div>
                            <p className="text-slate-400 max-w-2xl mx-auto">Build meaningful professional relationships and connect with industry experts</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Trust Graph Network */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl border border-purple-500/30">
                                            <Users className="h-8 w-8 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Trust Graph Network</h3>
                                            <p className="text-slate-400">Professional relationships</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed mb-6 flex-grow">
                                        Build meaningful professional relationships through our trust-based networking system that prioritizes quality connections.
                                    </p>
                                    <Button
                                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                                        onClick={() => navigate('/trust-graph')}
                                    >
                                        <Users className="mr-2 h-5 w-5" /> Explore Network
                                    </Button>
                                </div>
                            </div>

                            {/* Mentorship Sessions */}
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-pink-500/50 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-500/30">
                                            <Calendar className="h-8 w-8 text-pink-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Mentorship Sessions</h3>
                                            <p className="text-slate-400">Industry professionals</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed mb-6 flex-grow">
                                        Connect with industry professionals for personalized guidance, career advice, and skill development sessions.
                                    </p>
                                    <Button
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                                        onClick={() => navigate('/sessions')}
                                    >
                                        <Calendar className="mr-2 h-5 w-5" /> Book Session
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Jump Back In Section */}
                    <div className="text-center pt-8">
                        <Button
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
                        >
                            <ChevronsRight className="mr-2 h-5 w-5" />
                            Jump Back In
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    if (!user) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto">
            {user.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}
        </div>
    );
};

export default Dashboard;