/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   Dashboard.tsx (REDESIGNED - Final)
 * =================================================================
 * DESCRIPTION: The final redesigned Personal HQ. This version uses a
 * professional widget-based layout, removes redundant logic now handled
 * by the global sidebar, and preserves all original data-fetching
 * and role-based rendering.
 */
import React, {useState, useEffect } from 'react';
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
    BarChart, Zap, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

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
            const token = localStorage.getItem('authToken');
            try {
                const response = await fetch('http://localhost:5000/api/stuck-points', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                if (response.status === 401) throw new Error('AuthError');
                const data = await response.json();
                setNotifications(data);
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
                // Don't redirect to login here - let the main app handle authentication
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotifications();
    }, [navigate]);

    const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
        setNotifications(current => current.filter(n => !(n.student_id === studentId && n.details.lesson_id === lessonId)));
        navigate(`/lesson/${lessonId}`); // Use the new AscentIDE route
        const token = localStorage.getItem('authToken');
        await fetch('http://localhost:5000/api/stuck-points/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ studentId, lessonId })
        });
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
            if (!user) return; // Let the main app handle authentication
            setIsLoading(true);
            const token = localStorage.getItem('authToken');
            try {
                const coursesEndpoint = user.role === 'teacher' ? '/api/courses' : '/api/students/my-courses';
                const coursesResponse = await fetch(`http://localhost:5000${coursesEndpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!coursesResponse.ok) {
                    console.error('Failed to fetch courses:', coursesResponse.status);
                    return;
                }
                const coursesData = await coursesResponse.json();
                setCourses(coursesData);
                
                if (user.role === 'student') {
                    const sessionsResponse = await fetch('http://localhost:5000/api/sessions/active', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (sessionsResponse.ok) setLiveSessions(await sessionsResponse.json());
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                toast.error("Could not load dashboard data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate, user]);

    const renderTeacherDashboard = () => (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tighter text-white">Teacher Dashboard</h1>
                <p className="text-lg text-slate-400 mt-2">Oversee your courses and student progress.</p>
            </header>
            <StuckPointNotifications />
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-200">My Courses</h2>
                <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Course
                </Button>
            </div>
            {isLoading ? <p className="text-slate-400">Loading courses...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {courses.length > 0 ? (courses as Course[]).map(course => (
                        <GlassCard key={course.id} className="hover:border-slate-500">
                            <CardHeader>
                                <CardTitle className="text-xl text-white">{course.title}</CardTitle>
                                <CardDescription className="h-10 text-slate-400 pt-1">{course.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <Separator className="bg-slate-700" />
                                <div className="flex justify-between text-sm text-slate-400">
                                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400/70" /><span>{course.student_count} Students</span></div>
                                    <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400/70" /><span>{course.lesson_count} Lessons</span></div>
                                </div>
                                <Button className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-slate-200" onClick={() => navigate(`/courses/${course.id}/manage`)}>
                                    <Settings className="mr-2 h-4 w-4" /> Manage Course
                                </Button>
                            </CardContent>
                        </GlassCard>
                    )) : (
                        <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
                            <h3 className="text-lg font-medium text-slate-300">No courses yet</h3>
                            <p className="text-slate-500 mb-4">Create your first course to begin your teaching journey.</p>
                            <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Create First Course</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
    const renderStudentDashboard = () => {
    // Assume `courses` is an array of EnrolledCourse objects available in the component's scope.
    const enrolledCourses = courses as EnrolledCourse[];
    
    // The first course in the sorted list is the primary one for the "Continue" widget.
    const primaryCourse = enrolledCourses.length > 0 ? enrolledCourses[0] : null;
    
    // All subsequent courses are for the "My Learning Paths" grid.
    const otherCourses = enrolledCourses.slice(1);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tighter text-white">Welcome back, {user?.username}</h1>
                <p className="text-lg text-slate-400 mt-2">Let's continue your ascent. Your mission for today is clear.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HudStatCard icon={BarChart} value={128} label="Problems Solved" />
                <HudStatCard icon={Zap} value={2450} label="Weekly XP" />
                <HudStatCard icon={Calendar} value={"12 Days"} label="Active Streak" />
            </div>

            {/* "Continue Your Ascent" Widget for the primary course */}
            {primaryCourse && (
                <GlassCard className="border-cyan-500/50 hover:border-cyan-400">
                     <CardHeader>
                        <CardTitle className="text-2xl text-white">Continue Your Ascent</CardTitle>
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

            {/* Live Sessions Widget */}
            <LiveSessions sessions={liveSessions} />

            {/* NEW SECTION: "My Other Learning Paths" grid */}
            {otherCourses.length > 0 && (
                <div className="space-y-6 pt-4">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-200">My Other Learning Paths</h2>
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

            {/* Fallback display for students with no enrolled courses */}
            {courses.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
                    <h3 className="text-lg font-medium text-slate-300">Your learning journey awaits!</h3>
                    <p className="text-slate-500 mb-4">Enroll in a course to begin your ascent.</p>
                    <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
                </div>
            )}
        </div>
    );
};
    // const renderStudentDashboard = () => {
    //     const lastCourse = (courses as EnrolledCourse[])[0];
    //     return (
    //         <div className="space-y-8">
    //             <header>
    //                 <h1 className="text-4xl font-bold tracking-tighter text-white">Welcome back, {user?.username}</h1>
    //                 <p className="text-lg text-slate-400 mt-2">Let's continue your ascent. Your mission for today is clear.</p>
    //             </header>
    //             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    //                 <HudStatCard icon={BarChart} value={128} label="Problems Solved" />
    //                 <HudStatCard icon={Zap} value={2450} label="Weekly XP" />
    //                 <HudStatCard icon={Calendar} value={"12 Days"} label="Active Streak" />
    //             </div>
    //             {lastCourse && (
    //                 <GlassCard className="border-cyan-500/50 hover:border-cyan-400">
    //                      <CardHeader>
    //                         <CardTitle className="text-2xl text-white">Continue Your Ascent</CardTitle>
    //                         <CardDescription className="text-slate-400 pt-1">{lastCourse.title}</CardDescription>
    //                     </CardHeader>
    //                     <CardContent className="space-y-4 pt-4">
    //                         <div>
    //                             <div className="flex justify-between text-sm text-slate-300 mb-2">
    //                                 <span>Progress</span>
    //                                 <span className="font-mono">{lastCourse.lessons_completed} / {lastCourse.lesson_count}</span>
    //                             </div>
    //                             <Progress value={(lastCourse.lessons_completed / lastCourse.lesson_count) * 100} />
    //                         </div>
    //                         <Button className="w-full text-lg py-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold" onClick={() => navigate(`/courses/${lastCourse.id}/learn`)}>
    //                             <ChevronsRight className="mr-2 h-5 w-5" />
    //                             {lastCourse.lessons_completed === lastCourse.lesson_count ? 'Review Course' : 'Jump Back In'}
    //                         </Button>
    //                     </CardContent>
    //                 </GlassCard>
    //             )}
    //             <LiveSessions sessions={liveSessions} />
    //             {courses.length === 0 && !isLoading && (
    //                 <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
    //                     <h3 className="text-lg font-medium text-slate-300">Your learning journey awaits!</h3>
    //                     <p className="text-slate-500 mb-4">Enroll in a course to begin your ascent.</p>
    //                     <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
    //                 </div>
    //             )}
    //         </div>
    //     );
    // };
    
    if (!user) { return null; }

    return (
        <div className="max-w-7xl mx-auto">
            {user.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}
        </div>
    );
};

export default Dashboard;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (REDESIGNED - Personal HQ)
//  * =================================================================
//  * DESCRIPTION: The new Personal Command Center for CoreZenith users.
//  * This version uses a professional widget-based layout and preserves
//  * all original data-fetching and role-based rendering logic.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, User, Course, EnrolledCourse } from '../types/index.ts';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import { PlusCircle, Users, BookOpen, Settings, Search, AlertTriangle, Eye, RadioTower, ChevronsRight, BarChart, Zap, Calendar } from 'lucide-react';

// // --- Reusable Components (can be moved to their own files later) ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => ( <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300", className)} {...props} /> );
// const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>>(({ className, value, ...props }, ref) => ( <ProgressPrimitive.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)} {...props}> <ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-cyan-400 transition-all" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} /> </ProgressPrimitive.Root> ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // --- Dashboard Widgets ---

// const HudStatCard: React.FC<{ icon: React.ElementType; value: string | number; label: string; }> = ({ icon: Icon, value, label }) => (
//     <GlassCard>
//         <CardContent className="p-4 flex items-center gap-4">
//             <div className="p-2 bg-slate-700/50 rounded-lg">
//                 <Icon className="h-6 w-6 text-cyan-400" />
//             </div>
//             <div>
//                 <p className="text-2xl font-bold">{value}</p>
//                 <p className="text-sm text-slate-400">{label}</p>
//             </div>
//         </CardContent>
//     </GlassCard>
// );

// const StuckPointNotifications: React.FC = () => { /* ... 1:1 copy of your existing component ... */ };
// const LiveSessions: React.FC<{ sessions: any[] }> = ({ sessions }) => { /* ... 1:1 copy of your existing component, but takes sessions as a prop ... */ };


// // --- Main Dashboard Component ---
// const Dashboard: React.FC<DashboardProps> = ({ user }) => {
//     const [courses, setCourses] = useState<Course[] | EnrolledCourse[]>([]);
//     const [liveSessions, setLiveSessions] = useState<any[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     // --- 1:1 Data Fetching Logic ---
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!user) { navigate('/login'); return; }
//             setIsLoading(true);
//             const token = localStorage.getItem('authToken');
//             try {
//                 // Fetch courses based on role
//                 const coursesEndpoint = user.role === 'teacher' ? '/api/courses' : '/api/students/my-courses';
//                 const coursesResponse = await fetch(`http://localhost:5000${coursesEndpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (coursesResponse.status === 401) { navigate('/login'); return; }
//                 const coursesData = await coursesResponse.json();
//                 setCourses(coursesData);
                
//                 // For students, also fetch live sessions
//                 if (user.role === 'student') {
//                     const sessionsResponse = await fetch('http://localhost:5000/api/sessions/active', { headers: { 'Authorization': `Bearer ${token}` } });
//                     if (sessionsResponse.ok) setLiveSessions(await sessionsResponse.json());
//                 }
//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchData();
//     }, [navigate, user]);

//     // --- Render Methods ---
//     const renderTeacherDashboard = () => (
//         <div className="space-y-8">
//             <header>
//                 <h1 className="text-4xl font-bold tracking-tighter text-white">Teacher Dashboard</h1>
//                 <p className="text-lg text-slate-400 mt-2">Oversee your courses and student progress.</p>
//             </header>

//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-bold tracking-tight text-slate-200">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p className="text-slate-400">Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                     {courses.length > 0 ? (courses as Course[]).map(course => (
//                         <GlassCard key={course.id} className="hover:border-slate-500">
//                             <CardHeader>
//                                 <CardTitle className="text-xl text-white">{course.title}</CardTitle>
//                                 <CardDescription className="h-10 text-slate-400 pt-1">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4 pt-4">
//                                 <Separator className="bg-slate-700" />
//                                 <div className="flex justify-between text-sm text-slate-400">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400/70" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400/70" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-slate-200" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </GlassCard>
//                     )) : (
//                          <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
//                             <h3 className="text-lg font-medium text-slate-300">No courses yet</h3>
//                             <p className="text-slate-500 mb-4">Create your first course to begin your teaching journey.</p>
//                             <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Create First Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => {
//         const lastCourse = (courses as EnrolledCourse[])[0]; // Assuming the API returns the most recent course first

//         return (
//             <div className="space-y-8">
//                 <header>
//                     <h1 className="text-4xl font-bold tracking-tighter text-white">Welcome back, {user?.username}</h1>
//                     <p className="text-lg text-slate-400 mt-2">Let's continue your ascent. Your mission for today is clear.</p>
//                 </header>

//                 {/* --- Heads-Up Display (HUD) --- */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <HudStatCard icon={BarChart} value={128} label="Problems Solved" />
//                     <HudStatCard icon={Zap} value={2450} label="Weekly XP" />
//                     <HudStatCard icon={Calendar} value={"12 Days"} label="Active Streak" />
//                 </div>
                
//                 {/* --- Primary "Continue Ascent" Card --- */}
//                 {lastCourse && (
//                     <GlassCard className="border-cyan-500/50 hover:border-cyan-400">
//                          <CardHeader>
//                             <CardTitle className="text-2xl text-white">Continue Your Ascent</CardTitle>
//                             <CardDescription className="text-slate-400 pt-1">{lastCourse.title}</CardDescription>
//                         </CardHeader>
//                         <CardContent className="space-y-4 pt-4">
//                             <div>
//                                 <div className="flex justify-between text-sm text-slate-300 mb-2">
//                                     <span>Progress</span>
//                                     <span className="font-mono">{lastCourse.lessons_completed} / {lastCourse.lesson_count}</span>
//                                 </div>
//                                 <Progress value={(lastCourse.lessons_completed / lastCourse.lesson_count) * 100} />
//                             </div>
//                             <Button className="w-full text-lg py-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold" onClick={() => navigate(`/courses/${lastCourse.id}/learn`)}>
//                                 <ChevronsRight className="mr-2 h-5 w-5" />
//                                 {lastCourse.lessons_completed === lastCourse.lesson_count ? 'Review Course' : 'Jump Back In'}
//                             </Button>
//                         </CardContent>
//                     </GlassCard>
//                 )}

//                 {liveSessions.length > 0 && <LiveSessions sessions={liveSessions} />}

//                 {courses.length === 0 && !isLoading && (
//                     <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
//                         <h3 className="text-lg font-medium text-slate-300">Your learning journey awaits!</h3>
//                         <p className="text-slate-500 mb-4">Enroll in a course to begin your ascent.</p>
//                         <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                     </div>
//                 )}
//             </div>
//         );
//     };
    
//     if (!user) { return null; }

//     return (
//         <div className="max-w-7xl mx-auto">
//             {user.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}
//         </div>
//     );
// };

// export default Dashboard;

// MVP designed
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: The central command center for CoreZenith users.
//  * This version corrects the TypeScript type import errors.
//  */
// import React, { useState, useEffect } from 'react';
// // --- CORRECTED: Import EnrolledCourse and remove unused Course type ---
// import type { DashboardProps, User, Course, EnrolledCourse } from '../types/index.ts';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';

// // Utility and Animation
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // CoreZenith UI Components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Textarea } from "@/components/ui/textarea";

// // Lucide Icons
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, RadioTower, LogOut, Code, ChevronsRight, Map } from 'lucide-react';

// // --- CoreZenith Themed Progress Bar ---
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-cyan-400 transition-all duration-500 ease-out"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;


// // --- CORRECTED: This local interface is no longer needed as it's now imported ---
// // interface EnrolledCourse extends Course {
// //     lessons_completed: number;
// // }

// // Type for the AI-powered alert object
// interface StuckPointNotification {
//     alert_type: "stuck_point";
//     student_id: string;
//     teacher_id: string;
//     message: string;
//     details: {
//         lesson_id: string;
//         problem_id: string;
//         stuck_on_test: string;
//         attempts_on_test: number;
//     };
// }
// // Type for live session object
// interface LiveSession {
//     sessionId: string;
//     teacherName: string;
//     courseName: string;
// }

// // --- Glassmorphism Card Wrapper ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card 
//         className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:border-slate-500", className)}
//         {...props} 
//     />
// );


// // --- APE PHASE 2: Component for User Goal Setting ---
// const ChartYourCourse = () => {
//     const [goal, setGoal] = useState('');
//     const [initialGoal, setInitialGoal] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);

//     useEffect(() => {
//         const fetchGoal = async () => {
//             setIsLoading(true);
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/users/goal', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.ok) {
//                     const data = await response.json();
//                     setGoal(data.goal_description || '');
//                     setInitialGoal(data.goal_description || '');
//                 }
//             } catch (err) {
//                 console.error("Failed to fetch user goal:", err);
//                 toast.error("Could not load your goal. Please try again later.");
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchGoal();
//     }, []);

//     const handleSaveGoal = async () => {
//         const token = localStorage.getItem('authToken');
//         setIsSaving(true);
        
//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const response = await fetch('http://localhost:5000/api/users/goal', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${token}`
//                     },
//                     body: JSON.stringify({ goal_description: goal })
//                 });

//                 if (!response.ok) {
//                     const errData = await response.json();
//                     return reject(new Error(errData.error || "Failed to save goal."));
//                 }
                
//                 setInitialGoal(goal);
//                 return resolve({ message: "Your ambition has been set!" });
                
//             } catch (err) {
//                 return reject(err);
//             } finally {
//                 setIsSaving(false);
//             }
//         });

//         toast.promise(promise, {
//             loading: 'Saving your ambition...',
//             success: (data: any) => data.message,
//             error: (err) => err.message,
//         });
//     };

//     return (
//         <GlassCard className="border-amber-500/50 hover:border-amber-400 bg-amber-950/20">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
//                         <Map className="h-6 w-6 text-amber-400" />
//                     </div>
//                     <div>
//                         <CardTitle className="text-xl text-amber-300">Chart Your Course</CardTitle>
//                         <CardDescription className="text-amber-400/80">
//                             Tell the AI your ultimate goal. It will adapt your path to get you there.
//                         </CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent className="space-y-4">
//                  <Textarea
//                     placeholder="e.g., 'Become a Senior Backend Engineer at a fintech startup' or 'Build AI applications for climate science'."
//                     value={goal}
//                     onChange={(e) => setGoal(e.target.value)}
//                     disabled={isLoading || isSaving}
//                     className="bg-slate-900/50 border-slate-600 focus:border-amber-400 min-h-[80px]"
//                 />
//                 <Button 
//                     onClick={handleSaveGoal} 
//                     disabled={isLoading || isSaving || goal === initialGoal} 
//                     className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
//                 >
//                     {isSaving ? "Saving..." : "Set Ambition"}
//                 </Button>
//             </CardContent>
//         </GlassCard>
//     );
// };


// // --- AI-Powered Stuck Point Notifications (Teacher) ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//          const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
//                 });
//                 if (response.status === 401) throw new Error('AuthError');
//                 if (!response.ok) throw new Error(`Server error: ${response.status}`);
//                 const data = await response.json();
//                 setNotifications(data);
//             } catch (err) {
//                  if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login');
//                 }
//                 console.error("Failed to fetch notifications:", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchNotifications();
//     }, [navigate]);

//     const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
//         setNotifications(current => current.filter(n => !(n.student_id === studentId && n.details.lesson_id === lessonId)));
//         navigate(`/lessons/${lessonId}`);
//         const token = localStorage.getItem('authToken');
//         await fetch('http://localhost:5000/api/stuck-points/dismiss', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
//             body: JSON.stringify({ studentId, lessonId })
//         });
//     };
    
//     if (isLoading || notifications.length === 0) return null;

//     return (
//         <GlassCard className="border-fuchsia-500/50 hover:border-fuchsia-400 bg-fuchsia-950/20">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <div className="p-2 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20">
//                         <AlertTriangle className="h-6 w-6 text-fuchsia-400" />
//                     </div>
//                     <div>
//                         <CardTitle className="text-xl text-fuchsia-300">AI-Powered Alerts</CardTitle>
//                         <CardDescription className="text-fuchsia-400/80">Students detected requiring assistance.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={`${n.student_id}-${n.details.lesson_id}`} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
//                             <div>
//                                 <p className="font-semibold text-gray-200">{n.message}</p>
//                                 <p className="text-sm text-gray-400">
//                                     {`Test: "${n.details.stuck_on_test}" (${n.details.attempts_on_test} attempts)`}
//                                 </p>
//                             </div>
//                             <Button variant="outline" size="sm" onClick={() => handleViewAndDismiss(n.student_id, n.details.lesson_id)} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
//                                 <Eye className="mr-2 h-4 w-4" /> Review
//                             </Button>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </GlassCard>
//     );
// };


// // --- Live Sessions Component (Student) ---
// const LiveSessions = () => {
//     const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchLiveSessions = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/sessions/active', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.ok) setLiveSessions(await response.json());
//             } catch (err) {
//                 console.error("Failed to fetch live sessions:", err);
//             }
//         };
//         fetchLiveSessions();
//         const intervalId = setInterval(fetchLiveSessions, 5000);
//         return () => clearInterval(intervalId);
//     }, []);

//     if (liveSessions.length === 0) return null;

//     return (
//         <GlassCard className="border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
//                         <RadioTower className="h-6 w-6 text-cyan-400 animate-pulse" />
//                     </div>
//                     <div>
//                         <CardTitle className="text-xl text-cyan-300">Live Sessions Available</CardTitle>
//                         <CardDescription className="text-cyan-400/80">Join a live instruction session now.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {liveSessions.map(session => (
//                         <li key={session.sessionId} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
//                             <div>
//                                 <p className="font-semibold text-gray-200">{session.courseName}</p>
//                                 <p className="text-sm text-gray-400">Hosted by {session.teacherName}</p>
//                             </div>
//                             <Button onClick={() => navigate(`/session/${session.sessionId}`)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                                 Join Now
//                             </Button>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </GlassCard>
//     );
// };


// // --- CoreZenith Dashboard Component ---
// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     // --- CORRECTED: Use a single state for courses and check role for type safety ---
//     const [courses, setCourses] = useState<Course[] | EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !user) { navigate('/login'); return; }
//             setIsLoading(true);
//             try {
//                 const endpoint = user.role === 'teacher' ? '/api/courses' : '/api/students/my-courses';
//                 const response = await fetch(`http://localhost:5000${endpoint}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.status === 401) { navigate('/login'); return; }
//                 const data = await response.json();
//                 setCourses(data); // Set the unified state
//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchData();
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => navigate(`/session/${crypto.randomUUID()}`);
//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) navigate(`/session/${joinSessionId.trim()}`);
//     };

//     const CoreZenithLogo = () => (
//         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
//             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//         </svg>
//     );

//     // --- RENDER METHODS ---

//     const renderTeacherDashboard = () => (
//         <div className="space-y-8">
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold tracking-tight text-white">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p className="text-gray-400">Initializing course data...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                     {courses.length > 0 ? (courses as Course[]).map(course => (
//                         <GlassCard key={course.id}>
//                             <CardHeader>
//                                 <CardTitle className="text-xl text-white">{course.title}</CardTitle>
//                                 <CardDescription className="h-10 text-gray-400 pt-1">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4 pt-4">
//                                 <Separator className="bg-slate-700" />
//                                 <div className="flex justify-between text-sm text-gray-400">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400/70" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400/70" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-gray-200" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </GlassCard>
//                     )) : (
//                          <div className="col-span-full text-center py-16 border border-dashed border-slate-700 rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-300">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to begin your teaching journey.</p>
//                             <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Create First Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="space-y-8">
//             <ChartYourCourse />
//             <LiveSessions />
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold tracking-tight text-white">My Learning Path</h2>
//                  <Button variant="outline" onClick={() => navigate('/courses/discover')} className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
//                     <Search className="mr-2 h-4 w-4" /> Discover Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p className="text-gray-400">Loading learning path...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                     {courses.length > 0 ? (courses as EnrolledCourse[]).map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <GlassCard key={course.id}>
//                                 <CardHeader>
//                                     <CardTitle className="text-xl text-white">{course.title}</CardTitle>
//                                     <CardDescription className="h-10 text-gray-400 pt-1">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4 pt-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-400 mb-2">
//                                             <span>Progress</span>
//                                             <span className="font-mono">{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         <ChevronsRight className="mr-2 h-4 w-4" />
//                                         {progress === 100 ? 'Review Course' : 'Continue Ascent'}
//                                     </Button>
//                                 </CardContent>
//                             </GlassCard>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border border-dashed border-slate-700 rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-300">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to begin your ascent.</p>
//                             <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
    
//     if (!user) {
//         return <div className="min-h-screen bg-[#0a091a] w-full" />;
//     }

//     return (
//         <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             <header className="sticky top-0 z-50 p-4 bg-slate-950/40 backdrop-blur-xl border-b border-slate-800/50">
//                 <div className="mx-auto flex justify-between items-center max-w-[90rem]">
//                     <div className="flex items-center gap-4">
//                         <CoreZenithLogo />
//                         <span className="text-xl font-bold tracking-tight">CoreZenith</span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <span className="text-gray-400 text-sm hidden sm:block">Welcome, {user.username}</span>
//                          <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:bg-slate-700 hover:text-white">
//                             <LogOut className="h-4 w-4"/>
//                         </Button>
//                     </div>
//                 </div>
//             </header>

//             <main className="relative z-10 p-4 sm:p-6 lg:p-8">
//                 <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start max-w-[90rem] mx-auto">
                    
//                     <div className="lg:col-span-2 xl:col-span-3 space-y-6">
//                         {user.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}
//                     </div>

//                     <div className="lg:col-span-1 xl:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-bold tracking-tight text-white">Tools</h2>
//                         <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2"><RadioTower className="text-cyan-400"/> Live Session</CardTitle>
//                                 <CardDescription className="text-gray-400">Instantly start or join a session.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-gray-200">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required className="bg-black/20 border-gray-600 focus:border-cyan-400" />
//                                     <Button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </GlassCard>
//                          <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2"><Code className="text-fuchsia-400"/> Dev Tools</CardTitle>
//                                 <CardDescription className="text-gray-400">Utilities for development and testing.</CardDescription>
//                             </CardHeader>
//                             <CardContent>
//                                 <DevTools />
//                             </CardContent>
//                         </GlassCard>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default Dashboard;
// MVP designed
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (UPDATED for CoreZenith)
//  * =================================================================
//  * DESCRIPTION: The central command center for CoreZenith users.
//  * This design implements the "Digital Ascension" theme with a
//  * futuristic, immersive UI, glassmorphism, and an intelligent
// *  color system to provide a top 0.1% user experience.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course, User } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';

// // Utility and Animation
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // CoreZenith UI Components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// // Lucide Icons
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, RadioTower, LogOut, Code, ChevronsRight } from 'lucide-react';

// // --- CoreZenith Themed Progress Bar ---
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-cyan-400 transition-all duration-500 ease-out"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // Type for the AI-powered alert object
// interface StuckPointNotification {
//     alert_type: "stuck_point";
//     student_id: string;
//     teacher_id: string;
//     message: string;
//     details: {
//         lesson_id: string;
//         problem_id: string;
//         stuck_on_test: string;
//         attempts_on_test: number;
//     };
// }
// // Type for live session object
// interface LiveSession {
//     sessionId: string;
//     teacherName: string;
//     courseName: string;
// }

// // --- Glassmorphism Card Wrapper ---
// // A higher-order component for consistent card styling
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card 
//         className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:border-slate-500", className)}
//         {...props} 
//     />
// );


// // --- AI-Powered Stuck Point Notifications (Teacher) ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     // NOTE: Functionality for fetching, error handling, and dismissing is identical.
//     useEffect(() => {
//         // ... existing fetch logic from the original file
//          const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
//                 });
//                 if (response.status === 401) throw new Error('AuthError');
//                 if (!response.ok) throw new Error(`Server error: ${response.status}`);
//                 const data = await response.json();
//                 setNotifications(data);
//             } catch (err) {
//                  if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login');
//                 }
//                 console.error("Failed to fetch notifications:", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchNotifications();
//     }, [navigate]);

//     const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
//         // ... existing dismiss logic
//         setNotifications(current => current.filter(n => !(n.student_id === studentId && n.details.lesson_id === lessonId)));
//         navigate(`/lessons/${lessonId}`);
//         const token = localStorage.getItem('authToken');
//         await fetch('http://localhost:5000/api/stuck-points/dismiss', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
//             body: JSON.stringify({ studentId, lessonId })
//         });
//     };
    
//     if (isLoading || notifications.length === 0) return null;

//     return (
//         <GlassCard className="border-fuchsia-500/50 hover:border-fuchsia-400 bg-fuchsia-950/20">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <div className="p-2 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20">
//                         <AlertTriangle className="h-6 w-6 text-fuchsia-400" />
//                     </div>
//                     <div>
//                         <CardTitle className="text-xl text-fuchsia-300">AI-Powered Alerts</CardTitle>
//                         <CardDescription className="text-fuchsia-400/80">Students detected requiring assistance.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={`${n.student_id}-${n.details.lesson_id}`} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
//                             <div>
//                                 <p className="font-semibold text-gray-200">{n.message}</p>
//                                 <p className="text-sm text-gray-400">
//                                     {`Test: "${n.details.stuck_on_test}" (${n.details.attempts_on_test} attempts)`}
//                                 </p>
//                             </div>
//                             <Button variant="outline" size="sm" onClick={() => handleViewAndDismiss(n.student_id, n.details.lesson_id)} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
//                                 <Eye className="mr-2 h-4 w-4" /> Review
//                             </Button>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </GlassCard>
//     );
// };


// // --- Live Sessions Component (Student) ---
// const LiveSessions = () => {
//     const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
//     const navigate = useNavigate();

//     // NOTE: Functionality for fetching sessions is identical.
//     useEffect(() => {
//         // ... existing fetch and polling logic from original file
//         const fetchLiveSessions = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/sessions/active', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.ok) setLiveSessions(await response.json());
//             } catch (err) {
//                 console.error("Failed to fetch live sessions:", err);
//             }
//         };
//         fetchLiveSessions();
//         const intervalId = setInterval(fetchLiveSessions, 5000);
//         return () => clearInterval(intervalId);
//     }, []);

//     if (liveSessions.length === 0) return null;

//     return (
//         <GlassCard className="border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
//                         <RadioTower className="h-6 w-6 text-cyan-400 animate-pulse" />
//                     </div>
//                     <div>
//                         <CardTitle className="text-xl text-cyan-300">Live Sessions Available</CardTitle>
//                         <CardDescription className="text-cyan-400/80">Join a live instruction session now.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {liveSessions.map(session => (
//                         <li key={session.sessionId} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
//                             <div>
//                                 <p className="font-semibold text-gray-200">{session.courseName}</p>
//                                 <p className="text-sm text-gray-400">Hosted by {session.teacherName}</p>
//                             </div>
//                             <Button onClick={() => navigate(`/session/${session.sessionId}`)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                                 Join Now
//                             </Button>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </GlassCard>
//     );
// };


// // --- CoreZenith Dashboard Component ---
// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     // NOTE: All data fetching, state, and handlers are identical.
//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !user) { navigate('/login'); return; }
//             setIsLoading(true);
//             try {
//                 const endpoint = user.role === 'teacher' ? '/api/courses' : '/api/students/my-courses';
//                 const response = await fetch(`http://localhost:5000${endpoint}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.status === 401) { navigate('/login'); return; }
//                 const data = await response.json();
//                 if (user.role === 'teacher') setTeacherCourses(data);
//                 else setStudentCourses(data);
//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchData();
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => navigate(`/session/${crypto.randomUUID()}`);
//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) navigate(`/session/${joinSessionId.trim()}`);
//     };

//     const CoreZenithLogo = () => (
//         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
//             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//         </svg>
//     );

//     // --- RENDER METHODS ---

//     const renderTeacherDashboard = () => (
//         <div className="space-y-8">
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold tracking-tight text-white">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p className="text-gray-400">Initializing course data...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <GlassCard key={course.id}>
//                             <CardHeader>
//                                 <CardTitle className="text-xl text-white">{course.title}</CardTitle>
//                                 <CardDescription className="h-10 text-gray-400 pt-1">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4 pt-4">
//                                 <Separator className="bg-slate-700" />
//                                 <div className="flex justify-between text-sm text-gray-400">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400/70" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400/70" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-gray-200" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </GlassCard>
//                     )) : (
//                          <div className="col-span-full text-center py-16 border border-dashed border-slate-700 rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-300">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to begin your teaching journey.</p>
//                             <Button onClick={() => navigate('/courses/new')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Create First Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="space-y-8">
//             <LiveSessions />
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold tracking-tight text-white">My Learning Path</h2>
//                  <Button variant="outline" onClick={() => navigate('/courses/discover')} className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
//                     <Search className="mr-2 h-4 w-4" /> Discover Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p className="text-gray-400">Loading learning path...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <GlassCard key={course.id}>
//                                 <CardHeader>
//                                     <CardTitle className="text-xl text-white">{course.title}</CardTitle>
//                                     <CardDescription className="h-10 text-gray-400 pt-1">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4 pt-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-400 mb-2">
//                                             <span>Progress</span>
//                                             <span className="font-mono">{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         <ChevronsRight className="mr-2 h-4 w-4" />
//                                         {progress === 100 ? 'Review Course' : 'Continue Ascent'}
//                                     </Button>
//                                 </CardContent>
//                             </GlassCard>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border border-dashed border-slate-700 rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-300">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to begin your ascent.</p>
//                             <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
    
//     if (!user) {
//         // This is a fallback, user should be redirected by useEffect, but it prevents crashes.
//         return <div className="min-h-screen bg-[#0a091a] w-full" />;
//     }

//     return (
//         <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//             {/* Background decorative grid */}
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>

//             {/* Header */}
//             <header className="sticky top-0 z-50 p-4 bg-slate-950/40 backdrop-blur-xl border-b border-slate-800/50">
//                 <div className="mx-auto flex justify-between items-center max-w-[90rem]">
//                     <div className="flex items-center gap-4">
//                         <CoreZenithLogo />
//                         <span className="text-xl font-bold tracking-tight">CoreZenith</span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <span className="text-gray-400 text-sm hidden sm:block">Welcome, {user.username}</span>
//                          <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:bg-slate-700 hover:text-white">
//                             <LogOut className="h-4 w-4"/>
//                         </Button>
//                     </div>
//                 </div>
//             </header>

//             {/* Main Content Area */}
//             <main className="relative z-10 p-4 sm:p-6 lg:p-8">
//                 <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start max-w-[90rem] mx-auto">
                    
//                     {/* --- Left/Main Column (Dashboard Content) --- */}
//                     <div className="lg:col-span-2 xl:col-span-3 space-y-6">
//                         {user.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}
//                     </div>

//                     {/* --- Right Column: Tools --- */}
//                     <div className="lg:col-span-1 xl:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-bold tracking-tight text-white">Tools</h2>
//                         <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2"><RadioTower className="text-cyan-400"/> Live Session</CardTitle>
//                                 <CardDescription className="text-gray-400">Instantly start or join a session.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 text-gray-200">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required className="bg-black/20 border-gray-600 focus:border-cyan-400" />
//                                     <Button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </GlassCard>
//                         {/* The DevTools component can be styled similarly if needed */}
//                          <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2"><Code className="text-fuchsia-400"/> Dev Tools</CardTitle>
//                                 <CardDescription className="text-gray-400">Utilities for development and testing.</CardDescription>
//                             </CardHeader>
//                             <CardContent>
//                                 <DevTools />
//                             </CardContent>
//                         </GlassCard>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default Dashboard;
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V7.0 - AI System Integration)
//  * =================================================================
//  * DESCRIPTION: This version updates the dashboard to display the new,
//  * more detailed alert objects generated by the AI-powered stuck
//  * point detection system.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { RadioTower } from 'lucide-react'; // <-- Import a new icon

// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- UPDATED: Type definition for the new AI-powered alert object ---
// interface StuckPointNotification {
//     alert_type: "stuck_point";
//     student_id: string;
//     teacher_id: string;
//     message: string;
//     details: {
//         lesson_id: string;
//         problem_id: string;
//         stuck_on_test: string;
//         attempts_on_test: number;
//     };
// }
// interface LiveSession {
//     sessionId: string;
//     teacherName: string;
//     courseName: string;
// }


// // --- UPDATED: Stuck Point Notifications Component for the AI System ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json'
//                     }
//                 });
                
//                 if (response.status === 401) throw new Error('AuthError');

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 console.log('AI Stuck point notifications received from backend:', data);
//                 setNotifications(data);

//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);

//     const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
//         setNotifications(currentNotifications =>
//             currentNotifications.filter(
//                 n => !(n.student_id === studentId && n.details.lesson_id === lessonId)
//             )
//         );

//         navigate(`/lessons/${lessonId}`);

//         try {
//             const token = localStorage.getItem('authToken');
//             await fetch('http://localhost:5000/api/stuck-points/dismiss', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ studentId, lessonId })
//             });
//             console.log(`Dismissal request sent for student ${studentId} on lesson ${lessonId}`);
//         } catch (err) {
//             console.error("Failed to send dismissal request to backend:", err);
//         }
//     };
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Analyzing Student Progress...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Student Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }

//     if (notifications.length === 0) {
//         console.log('No new stuck point notifications to display.');
//         return null;
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={`${n.student_id}-${n.details.lesson_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold text-gray-800">{n.message}</p>
//                                 <p className="text-sm text-gray-500">
//                                     {`Stuck on test: "${n.details.stuck_on_test}" (${n.details.attempts_on_test} recent failed attempts).`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                <Button variant="outline" size="sm" onClick={() => handleViewAndDismiss(n.student_id, n.details.lesson_id)}>
//                                     <Eye className="mr-2 h-4 w-4" /> View Lesson & Dismiss
//                                 </Button>
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };

// // --- NEW: Live Sessions Component for Students ---
// const LiveSessions = () => {
//     const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchLiveSessions = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/sessions/active', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (response.ok) {
//                     const data: LiveSession[] = await response.json();
//                     setLiveSessions(data);
//                 }
//             } catch (err) {
//                 console.error("Failed to fetch live sessions:", err);
//             }
//         };

//         fetchLiveSessions(); // Fetch immediately on mount
//         const intervalId = setInterval(fetchLiveSessions, 5000); // Poll every 5 seconds

//         return () => clearInterval(intervalId); // Cleanup on unmount
//     }, []);

//     if (liveSessions.length === 0) {
//         return null; // Don't render anything if no sessions are active
//     }

//     return (
//         <Card className="bg-green-50 border-green-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <RadioTower className="h-8 w-8 text-green-600 animate-pulse" />
//                     <div>
//                         <CardTitle className="text-xl">Live Sessions Available</CardTitle>
//                         <CardDescription>A teacher has started a session for one of your courses.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {liveSessions.map(session => (
//                         <li key={session.sessionId} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold text-gray-800">{session.courseName}</p>
//                                 <p className="text-sm text-gray-500">Hosted by {session.teacherName}</p>
//                             </div>
//                             <Button onClick={() => navigate(`/session/${session.sessionId}`)}>
//                                 Join Session
//                             </Button>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return;
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <LiveSessions />
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;


// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V6.0 - Dismissible Alerts)
//  * =================================================================
//  * DESCRIPTION: This version makes the stuck point alerts dismissible.
//  * Clicking "View Lesson" now removes the alert from the UI and sends
//  * a request to a new backend endpoint to acknowledge it.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { formatDistanceToNow } from 'date-fns';


// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, X } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- UPDATED: Type definition for Stuck Point Notifications ---
// interface StuckPointNotification {
//     lesson_id: string; 
//     lesson_title: string;
//     student_id: string; 
//     student_username: string;
//     failure_count: number; // CORRECTED: Renamed from stuck_count to match backend
//     last_occurred_at: string; 
// }

// // --- NEW: Stuck Point Notifications Component for Teachers ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json' // Explicitly request JSON
//                     }
//                 });
                
//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 console.log('Stuck point notifications received from backend:', data);
//                 setNotifications(data);

//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);

//     // --- NEW: Function to handle dismissing an alert ---
//     const handleViewAndDismiss = async (studentId: string, lessonId: string) => {
//         // Optimistically remove the notification from the UI for a responsive feel.
//         setNotifications(currentNotifications =>
//             currentNotifications.filter(
//                 n => !(n.student_id === studentId && n.lesson_id === lessonId)
//             )
//         );

//         // Navigate to the lesson page immediately.
//         navigate(`/lessons/${lessonId}`);

//         // In the background, send a request to the backend to mark this as dismissed.
//         // This requires a new backend endpoint: POST /api/stuck-points/dismiss
//         try {
//             const token = localStorage.getItem('authToken');
//             await fetch('http://localhost:5000/api/stuck-points/dismiss', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ studentId, lessonId })
//             });
//             console.log(`Dismissal request sent for student ${studentId} on lesson ${lessonId}`);
//         } catch (err) {
//             console.error("Failed to send dismissal request to backend:", err);
//             // In a real-world scenario, you might add the notification back to the list
//             // or show a toast message to indicate the dismissal failed.
//         }
//     };
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Loading Alerts...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }
    
//     // Helper function to safely format dates and prevent crashes
//     const formatTimeAgo = (dateString: string) => {
//         try {
//             if (!dateString || isNaN(new Date(dateString).getTime())) {
//                 throw new Error("Invalid date string");
//             }
//             return formatDistanceToNow(new Date(dateString), { addSuffix: true });
//         } catch (e) {
//             console.warn(`Could not parse date for time ago: ${dateString}`);
//             return "a while ago";
//         }
//     };

//     if (notifications.length === 0) {
//         console.log('No stuck point notifications to display.');
//         return null; // Don't show the component if there are no notifications
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={`${n.student_id}-${n.lesson_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold">
//                                     <span className="text-blue-600">{n.student_username}</span> is stuck on <span className="text-blue-600">{n.lesson_title}</span>
//                                 </p>
//                                 <p className="text-sm text-gray-500">
//                                     {`Detected ${n.failure_count} times, last seen ${formatTimeAgo(n.last_occurred_at)}.`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                {/* UPDATED: OnClick now calls the new dismiss function */}
//                                <Button variant="outline" size="sm" onClick={() => handleViewAndDismiss(n.student_id, n.lesson_id)}>
//                                     <Eye className="mr-2 h-4 w-4" /> Clear Notification
//                                 </Button>
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return; // No user role, do nothing.
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         // If parsing the error response fails, throw a generic error.
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             {/* --- Stuck Point Notifications --- */}
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V5.9 - Fixed Data Mismatch)
//  * =================================================================
//  * DESCRIPTION: This version fixes a bug where the number of failed
//  * attempts was showing as "undefined". The frontend property name now
//  * correctly matches the 'failure_count' field from the backend.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { formatDistanceToNow } from 'date-fns';


// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, X } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- UPDATED: Type definition for Stuck Point Notifications ---
// interface StuckPointNotification {
//     lesson_id: string; 
//     lesson_title: string;
//     student_id: string; 
//     student_username: string;
//     failure_count: number; // CORRECTED: Renamed from stuck_count to match backend
//     last_occurred_at: string; 
// }

// // --- NEW: Stuck Point Notifications Component for Teachers ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json' // Explicitly request JSON
//                     }
//                 });
                
//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 console.log('Stuck point notifications received from backend:', data);
//                 setNotifications(data);

//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Loading Alerts...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }
    
//     // Helper function to safely format dates and prevent crashes
//     const formatTimeAgo = (dateString: string) => {
//         try {
//             // Check if the date string is valid before creating a Date object
//             if (!dateString || isNaN(new Date(dateString).getTime())) {
//                 throw new Error("Invalid date string");
//             }
//             return formatDistanceToNow(new Date(dateString), { addSuffix: true });
//         } catch (e) {
//             console.warn(`Could not parse date for time ago: ${dateString}`);
//             return "a while ago";
//         }
//     };

//     if (notifications.length === 0) {
//         console.log('No stuck point notifications to display.');
//         return null; // Don't show the component if there are no notifications
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         // Use a composite key since 'id' is not available
//                         <li key={`${n.student_id}-${n.lesson_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold">
//                                     <span className="text-blue-600">{n.student_username}</span> is stuck on <span className="text-blue-600">{n.lesson_title}</span>
//                                 </p>
//                                 <p className="text-sm text-gray-500">
//                                     {/* CORRECTED: Use failure_count to display the correct data */}
//                                     {`Detected ${n.failure_count} times, last seen ${formatTimeAgo(n.last_occurred_at)}.`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${n.lesson_id}`)}>
//                                     <Eye className="mr-2 h-4 w-4" /> View Lesson
//                                 </Button>
//                                 {/* Dismiss button removed to prevent errors with unimplemented feature */}
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return; // No user role, do nothing.
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         // If parsing the error response fails, throw a generic error.
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             {/* --- Stuck Point Notifications --- */}
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V5.8 - Robust Date Handling)
//  * =================================================================
//  * DESCRIPTION: This version fixes a crash caused by invalid date
//  * formats from the backend. It adds robust date parsing and corrects
//  * data types to prevent the "Invalid time value" error.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { formatDistanceToNow } from 'date-fns';


// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, X } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- UPDATED: Type definition for Stuck Point Notifications ---
// interface StuckPointNotification {
//     // id removed as it's not in the backend response.
//     lesson_id: string; // Changed to string for UUIDs
//     lesson_title: string;
//     student_id: string; // Changed to string for UUIDs
//     student_username: string;
//     stuck_count: number;
//     last_occurred_at: string; // ISO date string
// }

// // --- NEW: Stuck Point Notifications Component for Teachers ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json' // Explicitly request JSON
//                     }
//                 });
                
//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 console.log('Stuck point notifications received from backend:', data);
//                 setNotifications(data);

//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Loading Alerts...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }
    
//     // Helper function to safely format dates and prevent crashes
//     const formatTimeAgo = (dateString: string) => {
//         try {
//             // Check if the date string is valid before creating a Date object
//             if (!dateString || isNaN(new Date(dateString).getTime())) {
//                 throw new Error("Invalid date string");
//             }
//             return formatDistanceToNow(new Date(dateString), { addSuffix: true });
//         } catch (e) {
//             console.warn(`Could not parse date for time ago: ${dateString}`);
//             return "a while ago";
//         }
//     };

//     if (notifications.length === 0) {
//         console.log('No stuck point notifications to display.');
//         return null; // Don't show the component if there are no notifications
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         // Use a composite key since 'id' is not available
//                         <li key={`${n.student_id}-${n.lesson_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold">
//                                     <span className="text-blue-600">{n.student_username}</span> is stuck on <span className="text-blue-600">{n.lesson_title}</span>
//                                 </p>
//                                 <p className="text-sm text-gray-500">
//                                     {/* Use the safe helper function to prevent crashes */}
//                                     {`Detected ${n.stuck_count} times, last seen ${formatTimeAgo(n.last_occurred_at)}.`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${n.lesson_id}`)}>
//                                     <Eye className="mr-2 h-4 w-4" /> View Lesson
//                                 </Button>
//                                 {/* Dismiss button removed to prevent errors with unimplemented feature */}
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return; // No user role, do nothing.
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         // If parsing the error response fails, throw a generic error.
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             {/* --- Stuck Point Notifications --- */}
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V5.7 - Added Notification Logging)
//  * =================================================================
//  * DESCRIPTION: This version adds console logging to the notifications
//  * component to help debug why alerts may not be appearing on the UI.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { formatDistanceToNow } from 'date-fns';


// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, X } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- NEW: Type definition for Stuck Point Notifications ---
// interface StuckPointNotification {
//     id: number; // Assuming a unique ID for each notification
//     lesson_id: number;
//     lesson_title: string;
//     student_id: number;
//     student_username: string;
//     stuck_count: number;
//     last_occurred_at: string; // ISO date string
// }

// // --- NEW: Stuck Point Notifications Component for Teachers ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json' // Explicitly request JSON
//                     }
//                 });
                
//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 // ADDED: Logging to see what the backend returns
//                 console.log('Stuck point notifications received from backend:', data);
//                 setNotifications(data);

//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);

//     const handleDismiss = (notificationId: number) => {
//         setNotifications(notifications.filter(n => n.id !== notificationId));
//         const token = localStorage.getItem('authToken');
//         fetch(`http://localhost:5000/api/stuck-points/${notificationId}/dismiss`, {
//             method: 'POST',
//             headers: { 'Authorization': `Bearer ${token}` }
//         }).catch(err => {
//             console.error("Failed to dismiss notification on server", err)
//         });
//     };
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Loading Alerts...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }
    
//     if (notifications.length === 0) {
//         // ADDED: Log when no notifications are being rendered.
//         console.log('No stuck point notifications to display.');
//         return null; // Don't show the component if there are no notifications
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={n.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold">
//                                     <span className="text-blue-600">{n.student_username}</span> is stuck on <span className="text-blue-600">{n.lesson_title}</span>
//                                 </p>
//                                 <p className="text-sm text-gray-500">
//                                     {`Detected ${n.stuck_count} times, last seen ${formatDistanceToNow(new Date(n.last_occurred_at), { addSuffix: true })}.`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${n.lesson_id}`)}>
//                                     <Eye className="mr-2 h-4 w-4" /> View Lesson
//                                 </Button>
//                                 <Button variant="ghost" size="icon" onClick={() => handleDismiss(n.id)}>
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return; // No user role, do nothing.
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         // If parsing the error response fails, throw a generic error.
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             {/* --- Stuck Point Notifications --- */}
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V5.6 - Corrected API Endpoint)
//  * =================================================================
//  * DESCRIPTION: This version corrects the API endpoint URL for fetching
//  * stuck point notifications to match the backend route definition,
//  * resolving the JSON parsing error.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";
// import { formatDistanceToNow } from 'date-fns';


// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle, AlertTriangle, Eye, X } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// // --- NEW: Type definition for Stuck Point Notifications ---
// interface StuckPointNotification {
//     id: number; // Assuming a unique ID for each notification
//     lesson_id: number;
//     lesson_title: string;
//     student_id: number;
//     student_username: string;
//     stuck_count: number;
//     last_occurred_at: string; // ISO date string
// }

// // --- NEW: Stuck Point Notifications Component for Teachers ---
// const StuckPointNotifications = () => {
//     const [notifications, setNotifications] = useState<StuckPointNotification[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchNotifications = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 // CORRECTED: Changed URL to match the backend route definition
//                 const response = await fetch('http://localhost:5000/api/stuck-points', {
//                     headers: { 
//                         'Authorization': `Bearer ${token}`,
//                         'Accept': 'application/json' // Explicitly request JSON
//                     }
//                 });
                
//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 const contentType = response.headers.get("content-type");
//                 if (!response.ok || !contentType || !contentType.includes("application/json")) {
//                     // This handles HTTP errors and cases where the response is not JSON (e.g., HTML error page)
//                     throw new Error(`Server returned an unexpected response. Expected JSON but received ${contentType || 'an unknown format'}.`);
//                 }
                
//                 const data: StuckPointNotification[] = await response.json();
//                 setNotifications(data);
//             } catch (err) {
//                 console.error("Failed to fetch notifications:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     // Specific authentication error, redirect to login.
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     // Handle all other types of errors by displaying them.
//                     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchNotifications();
//     }, [navigate]);

//     const handleDismiss = (notificationId: number) => {
//         // Optimistically remove the notification from the UI
//         setNotifications(notifications.filter(n => n.id !== notificationId));

//         // Send a request to the backend to mark this notification as dismissed
//         const token = localStorage.getItem('authToken');
//         // NOTE: The dismiss endpoint may also need to be corrected depending on your backend routes.
//         fetch(`http://localhost:5000/api/stuck-points/${notificationId}/dismiss`, {
//             method: 'POST',
//             headers: { 'Authorization': `Bearer ${token}` }
//         }).catch(err => {
//             console.error("Failed to dismiss notification on server", err)
//             // Optionally, add the notification back to the list and show an error message
//         });
//     };
    
//     if (isLoading) {
//         return <Card><CardHeader><CardTitle>Loading Alerts...</CardTitle></CardHeader></Card>;
//     }

//     if (error) {
//         return (
//             <Alert variant="destructive">
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Could Not Load Alerts</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         );
//     }
    
//     if (notifications.length === 0) {
//         return null; // Don't show the component if there are no notifications
//     }

//     return (
//         <Card className="bg-amber-50 border-amber-200">
//             <CardHeader>
//                 <div className="flex items-center gap-4">
//                     <AlertTriangle className="h-8 w-8 text-amber-500" />
//                     <div>
//                         <CardTitle className="text-xl">Student Stuck Point Alerts</CardTitle>
//                         <CardDescription>The following students may be struggling and need help.</CardDescription>
//                     </div>
//                 </div>
//             </CardHeader>
//             <CardContent>
//                 <ul className="space-y-3">
//                     {notifications.map(n => (
//                         <li key={n.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
//                             <div>
//                                 <p className="font-semibold">
//                                     <span className="text-blue-600">{n.student_username}</span> is stuck on <span className="text-blue-600">{n.lesson_title}</span>
//                                 </p>
//                                 <p className="text-sm text-gray-500">
//                                     {`Detected ${n.stuck_count} times, last seen ${formatDistanceToNow(new Date(n.last_occurred_at), { addSuffix: true })}.`}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                                <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${n.lesson_id}`)}>
//                                     <Eye className="mr-2 h-4 w-4" /> View Lesson
//                                 </Button>
//                                 <Button variant="ghost" size="icon" onClick={() => handleDismiss(n.id)}>
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </CardContent>
//         </Card>
//     );
// };


// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null);
//             try {
//                 let response;
//                 if (user?.role === 'teacher') {
//                     response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else if (user?.role === 'student') {
//                     response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                 } else {
//                     return; // No user role, do nothing.
//                 }

//                 if (response.status === 401) {
//                     throw new Error('AuthError');
//                 }

//                 if (!response.ok) {
//                     const errorData = await response.json().catch(() => {
//                         // If parsing the error response fails, throw a generic error.
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     });
//                     throw new Error(errorData.error || 'Failed to fetch data');
//                 }
//                 const data = await response.json();

//                 if (user?.role === 'teacher') {
//                     setTeacherCourses(data);
//                 } else {
//                     setStudentCourses(data);
//                 }

//             } catch (err) {
//                 console.error("Failed to fetch dashboard data:", err);
//                 if (err instanceof Error && err.message === 'AuthError') {
//                     navigate('/login', { state: { error: 'Your session has expired. Please log in again.' } });
//                 } else {
//                     if (err instanceof Error) {
//                         setError(err.message);
//                     } else {
//                         setError('An unknown error occurred.');
//                     }
//                 }
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             {/* --- Stuck Point Notifications --- */}
//             <StuckPointNotifications />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V5.1 - Enhanced Error Handling)
//  * =================================================================
//  * DESCRIPTION: This version improves error handling by capturing and
//  * displaying specific error messages from the backend API, making
//  * the component more robust and easier to debug.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { PlusCircle, Users, BookOpen, Settings, Search, XCircle } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null); // NEW: State for handling fetch errors
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             setError(null); // Reset error on each fetch
//             try {
//                 if (user?.role === 'teacher') {
//                     const response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (!response.ok) {
//                         const errorData = await response.json();
//                         throw new Error(errorData.error || 'Failed to fetch courses');
//                     }
//                     const data = await response.json();
//                     setTeacherCourses(data);
//                 } else if (user?.role === 'student') {
//                     const response = await fetch('http://localhost:5000/api/students/my-courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (!response.ok) {
//                         const errorData = await response.json();
//                         throw new Error(errorData.error || 'Failed to fetch enrolled courses');
//                     }
//                     const data = await response.json();
//                     setStudentCourses(data);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) {
//                     setError(err.message);
//                 } else {
//                     setError('An unknown error occurred.');
//                 }
//                 console.error(err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     const renderErrorState = () => (
//         <div className="lg:col-span-2">
//             <Alert variant="destructive">
//                 <XCircle className="h-4 w-4" />
//                 <AlertTitle>Error Loading Dashboard</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//             </Alert>
//         </div>
//     );

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderDashboardContent = () => {
//         if (error) {
//             return renderErrorState();
//         }
//         if (user?.role === 'teacher') {
//             return renderTeacherDashboard();
//         }
//         if (user?.role === 'student') {
//             return renderStudentDashboard();
//         }
//         return null; // Should not happen if user is logged in
//     };

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {renderDashboardContent()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   Dashboard.tsx (V4 - Live Data)
//  * =================================================================
//  * DESCRIPTION: This version is now fully connected to the backend.
//  * It fetches the real list of courses for a teacher and enrolled
//  * courses for a student, replacing all mock data.
//  */
// import React, { useState, useEffect } from 'react';
// import type { DashboardProps, Course } from '../types';
// import DevTools from '../components/DevTools';
// import { useNavigate } from 'react-router-dom';
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { PlusCircle, Users, BookOpen, Settings, Search } from 'lucide-react';

// // Self-contained Progress Component
// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-primary transition-all"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;

// // Define a type for a student's enrolled course, including progress
// interface EnrolledCourse extends Course {
//     lessons_completed: number;
// }

// const Dashboard: React.FC<DashboardProps> = ({ setUser, user }) => {
//     const [joinSessionId, setJoinSessionId] = useState('');
//     const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
//     const [studentCourses, setStudentCourses] = useState<EnrolledCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//         // UPDATED: This now makes live API calls for both teachers and students.
//         const fetchData = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             setIsLoading(true);
//             try {
//                 if (user?.role === 'teacher') {
//                     const response = await fetch('http://localhost:5000/api/courses', {
//                         headers: { 'Authorization': `Bearer ${token}` }
//                     });
//                     if (!response.ok) throw new Error('Failed to fetch courses');
//                     const data = await response.json();
//                     setTeacherCourses(data);
//                 } else if (user?.role === 'student') {
//                     // TODO: Replace with a real endpoint for student enrollments
//                     const mockEnrolledCourses: EnrolledCourse[] = [
//                         { id: '1', title: 'Introduction to JavaScript', description: 'Master the fundamentals of JavaScript...', student_count: 34, lesson_count: 12, lessons_completed: 5 },
//                         { id: '2', title: 'Advanced CSS with Flexbox & Grid', description: 'Build complex, responsive layouts...', student_count: 21, lesson_count: 8, lessons_completed: 8 },
//                     ];
//                     setStudentCourses(mockEnrolledCourses);
//                 }
//             } catch (error) {
//                 console.error(error);
//                 // Optionally set an error state to display to the user
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         if (user) {
//             fetchData();
//         }
//     }, [navigate, user]);
    
//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };
    
//     const handleCreateSession = () => {
//         const newSessionId = crypto.randomUUID();
//         navigate(`/session/${newSessionId}`);
//     };

//     const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (joinSessionId.trim()) {
//             navigate(`/session/${joinSessionId.trim()}`);
//         }
//     };

//     // --- RENDER FUNCTIONS FOR DIFFERENT ROLES ---

//     const renderTeacherDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
//                 <Button onClick={() => navigate('/courses/new')}>
//                     <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {teacherCourses.length > 0 ? teacherCourses.map(course => (
//                         <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                             <CardHeader>
//                                 <CardTitle>{course.title}</CardTitle>
//                                 <CardDescription className="h-10">{course.description}</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Separator />
//                                 <div className="flex justify-between text-sm text-gray-500">
//                                     <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{course.student_count} Students</span></div>
//                                     <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.lesson_count} Lessons</span></div>
//                                 </div>
//                                 <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/manage`)}>
//                                     <Settings className="mr-2 h-4 w-4" /> Manage Course
//                                 </Button>
//                             </CardContent>
//                         </Card>
//                     )) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
//                             <p className="text-gray-500 mb-4">Create your first course to get started.</p>
//                             <Button onClick={() => navigate('/courses/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Course</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     const renderStudentDashboard = () => (
//         <div className="lg:col-span-2 space-y-6">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-semibold text-gray-800">My Learning</h2>
//                 <Button variant="outline" onClick={() => navigate('/courses/discover')}>
//                     <Search className="mr-2 h-4 w-4" /> Discover New Courses
//                 </Button>
//             </div>
            
//             {isLoading ? <p>Loading courses...</p> : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {studentCourses.length > 0 ? studentCourses.map(course => {
//                         const progress = course.lesson_count > 0 ? (course.lessons_completed / course.lesson_count) * 100 : 0;
//                         return (
//                             <Card key={course.id} className="hover:shadow-lg transition-shadow">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription className="h-10">{course.description}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                             <span>Progress</span>
//                                             <span>{course.lessons_completed} / {course.lesson_count}</span>
//                                         </div>
//                                         <Progress value={progress} />
//                                     </div>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/learn`)}>
//                                         {progress === 100 ? 'Review Course' : 'Continue Learning'}
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )
//                     }) : (
//                         <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
//                             <h3 className="text-lg font-medium text-gray-700">Your learning journey awaits!</h3>
//                             <p className="text-gray-500 mb-4">Enroll in a course to get started.</p>
//                             <Button onClick={() => navigate('/courses/discover')}><Search className="mr-2 h-4 w-4" /> Discover Courses</Button>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );

//     return (
//         <div className="w-full bg-slate-50 min-h-screen">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <div className="flex justify-between items-center mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//                         <p className="text-gray-600">Welcome back, {user?.username}!</p>
//                     </div>
//                     <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
//                     {/* CONDITIONAL RENDER: Show correct dashboard based on user role */}
//                     {user?.role === 'teacher' ? renderTeacherDashboard() : renderStudentDashboard()}

//                     {/* Right Column: Ad-hoc Tools (Common to both roles) */}
//                     <div className="lg:col-span-1 space-y-6">
//                          <h2 className="text-2xl font-semibold text-gray-800">Tools</h2>
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Live Session</CardTitle>
//                                 <CardDescription>Start a quick session or join one with an ID.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {user?.role === 'teacher' && (
//                                     <Button onClick={handleCreateSession} className="w-full" variant="outline">Create New Session</Button>
//                                 )}
//                                 <form onSubmit={handleJoinSession} className="flex gap-2">
//                                     <Input type="text" value={joinSessionId} onChange={(e) => setJoinSessionId(e.target.value)} placeholder="Enter Session ID" required />
//                                     <Button type="submit">Join</Button>
//                                 </form>
//                             </CardContent>
//                         </Card>
//                         <DevTools />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };
