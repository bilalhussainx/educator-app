/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   CourseManagementPage.tsx (UPDATED for CoreZenith)
 * =================================================================
 * DESCRIPTION: The teacher's control panel for managing a course.
 * This design transforms the page into a sophisticated, action-oriented
 * command center, consistent with the immersive CoreZenith brand.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Course, Lesson } from '../types/index.ts';
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import apiClient from '../services/apiClient';

// CoreZenith UI Components & Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, PlusCircle, BookOpen, AlertCircle, ChevronRight, Settings, Users, RadioTower } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- CoreZenith UI Primitives (Styled for the theme) ---

const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
        {...props} 
    />
);

const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("inline-flex items-center justify-center rounded-lg bg-slate-900/60 border border-slate-700 p-1", className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-base font-medium text-slate-300 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:shadow-sm", className)} {...props} />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-6 ring-offset-background focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn( "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-700", className )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={cn( "pointer-events-none block h-5 w-5 rounded-full bg-slate-950 shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" )}/>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;


// --- Main Component ---
const CourseManagementPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<(Course & { is_published?: boolean }) | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // NOTE: All data fetching and state logic is preserved
    const fetchCourseDetails = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token || !courseId) { navigate('/login'); return; }
        setIsLoading(true);
        try {
            const response = await apiClient.get(`/api/courses/${courseId}`);
            setCourse(response.data);
            setLessons(response.data.lessons || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [courseId, navigate]);

    useEffect(() => {
        fetchCourseDetails();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') fetchCourseDetails();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchCourseDetails]);

    const handlePublishToggle = async (isPublished: boolean) => {
        if (!course) return;
        const token = localStorage.getItem('authToken');
        const originalState = course.is_published;
        setCourse({ ...course, is_published: isPublished });

        try {
            await apiClient.patch(`/api/courses/${course.id}/publish`, { is_published: isPublished });
        } catch (err) {
            console.error(err);
            setError('Failed to update status. Reverting change.');
            setCourse({ ...course, is_published: originalState });
        }
    };
    
    // Fallback for loading/error states to maintain theme
    if (isLoading || error || !course) {
         return (
            <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans flex items-center justify-center">
                 <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
                 <div className="relative">
                    {isLoading && <p>Loading Course Command Center...</p>}
                    {error && <p className="text-red-400">Error: {error}</p>}
                    {!course && !isLoading && !error && <p>Course not found.</p>}
                 </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
            {/* Background decorative grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            {/* Main Content Area */}
            <main className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-8 text-gray-400 hover:bg-slate-800 hover:text-white">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Return to Dashboard
                    </Button>

                    <header className="mb-10">
                        <p className="text-cyan-400 font-semibold tracking-wide">COURSE MANAGEMENT</p>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mt-2">{course.title}</h1>
                        <p className="text-lg text-gray-400 mt-4 max-w-4xl">{course.description}</p>
                    </header>

                    <Tabs defaultValue="curriculum">
                        <TabsList>
                            <TabsTrigger value="curriculum"><BookOpen className="h-5 w-5 mr-2"/>Curriculum</TabsTrigger>
                            <TabsTrigger value="students" disabled><Users className="h-5 w-5 mr-2"/>Students</TabsTrigger>
                            <TabsTrigger value="sessions" disabled><RadioTower className="h-5 w-5 mr-2"/>Sessions</TabsTrigger>
                            <TabsTrigger value="settings"><Settings className="h-5 w-5 mr-2"/>Settings</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="curriculum">
                            <GlassCard>
                                <CardHeader>
                                    <div className="flex flex-wrap gap-4 justify-between items-center">
                                        <div>
                                            <CardTitle className="text-2xl text-white">Course Blueprint</CardTitle>
                                            <CardDescription className="text-gray-400">Design the lessons and assignments for this course.</CardDescription>
                                        </div>
                                        <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {lessons.length > 0 ? lessons.map(lesson => (
                                            <div key={lesson.id} className="w-full text-left p-4 bg-slate-950/40 border border-slate-700 rounded-lg flex flex-wrap justify-between items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <BookOpen className="h-6 w-6 text-cyan-400/70" />
                                                    <div>
                                                        <h3 className="font-semibold text-lg text-gray-200">{lesson.title}</h3>
                                                        <p className="text-sm text-gray-500">{lesson.description}</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/submissions/${lesson.id}`)} className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
                                                    View Submissions <ChevronRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
                                                <h3 className="text-lg font-medium text-gray-300">This Course Blueprint is Empty.</h3>
                                                <p className="text-gray-500 mb-4">Add a lesson to begin constructing your curriculum.</p>
                                                <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Create First Lesson
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="settings">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="text-2xl text-white">Course Configuration</CardTitle>
                                    <CardDescription className="text-gray-400">Manage global settings for this course.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4 bg-slate-950/40">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="publish-switch" className="text-base font-semibold text-gray-200">Publish Course</Label>
                                            <p className="text-sm text-gray-500">
                                                Make this course visible to students in the "Discover" marketplace.
                                            </p>
                                        </div>
                                        <Switch
                                            id="publish-switch"
                                            checked={course.is_published}
                                            onCheckedChange={handlePublishToggle}
                                        />
                                    </div>
                                    {course.is_published && (
                                         <Alert className="bg-cyan-950/40 border-cyan-500/30 text-cyan-300">
                                            <AlertCircle className="h-4 w-4 text-cyan-400" />
                                            <AlertTitle className="font-bold text-cyan-200">This Course Is Live</AlertTitle>
                                            <AlertDescription>
                                                Students can now find and enroll in this course from the Discover page.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </GlassCard>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default CourseManagementPage;
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseManagementPage.tsx (V4.2 - Navigation Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes the broken navigation for teachers.
//  * The "Edit" button on a lesson now correctly links to the
//  * "Submissions" page for that lesson.
//  */
// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as TabsPrimitive from "@radix-ui/react-tabs";
// import * as SwitchPrimitives from "@radix-ui/react-switch";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { ChevronLeft, PlusCircle, BookOpen, AlertCircle, ChevronRight } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// // --- Self-contained Shadcn UI Components ---

// const Tabs = TabsPrimitive.Root;
// const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
// ));
// TabsList.displayName = TabsPrimitive.List.displayName;
// const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
// ));
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
// const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
// ));
// TabsContent.displayName = TabsPrimitive.Content.displayName;

// const Switch = React.forwardRef<
//   React.ElementRef<typeof SwitchPrimitives.Root>,
//   React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
// >(({ className, ...props }, ref) => (
//   <SwitchPrimitives.Root
//     className={cn(
//       "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
//       className
//     )}
//     {...props}
//     ref={ref}
//   >
//     <SwitchPrimitives.Thumb
//       className={cn(
//         "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
//       )}
//     />
//   </SwitchPrimitives.Root>
// ));
// Switch.displayName = SwitchPrimitives.Root.displayName;


// const CourseManagementPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<Course | null>(null);
//     const [lessons, setLessons] = useState<Lesson[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     const fetchCourseDetails = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !courseId) {
//             navigate('/login');
//             return;
//         }
//         setIsLoading(true);
//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Failed to fetch course details.');
//             }
//             const data = await response.json();
//             setCourse(data);
//             setLessons(data.lessons || []);
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred.');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         fetchCourseDetails();

//         const handleVisibilityChange = () => {
//             if (document.visibilityState === 'visible') {
//                 fetchCourseDetails();
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);
//         return () => {
//             document.removeEventListener('visibilitychange', handleVisibilityChange);
//         };
//     }, [fetchCourseDetails]);

//     const handlePublishToggle = async (isPublished: boolean) => {
//         if (!course) return;
//         const token = localStorage.getItem('authToken');
        
//         const originalPublishedState = course.is_published;
//         setCourse({ ...course, is_published: isPublished });

//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${course.id}/publish`, {
//                 method: 'PATCH',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ is_published: isPublished })
//             });
//             if (!response.ok) throw new Error('Failed to update course status.');
//         } catch (err) {
//             console.error(err);
//             setError('Failed to update course status. Please try again.');
//             setCourse({ ...course, is_published: originalPublishedState });
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading course details...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!course) return <div className="p-8">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8">
//                     <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                     <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                 </header>

//                 <Tabs defaultValue="curriculum">
//                     <TabsList>
//                         <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
//                         <TabsTrigger value="students" disabled>Student Roster</TabsTrigger>
//                         <TabsTrigger value="sessions" disabled>Live Sessions</TabsTrigger>
//                         <TabsTrigger value="settings">Settings</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="curriculum" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <div className="flex justify-between items-center">
//                                     <div>
//                                         <CardTitle>Course Curriculum</CardTitle>
//                                         <CardDescription>Manage the lessons and assignments for this course.</CardDescription>
//                                     </div>
//                                     <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                         <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {lessons.length > 0 ? lessons.map(lesson => (
//                                         <div key={lesson.id} className="w-full text-left p-4 border rounded-md flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <BookOpen className="h-5 w-5 text-gray-400" />
//                                                 <div>
//                                                     <h3 className="font-semibold text-lg">{lesson.title}</h3>
//                                                     <p className="text-sm text-muted-foreground">{lesson.description}</p>
//                                                 </div>
//                                             </div>
//                                             {/* UPDATED: Button now correctly navigates to the submissions page */}
//                                             <Button variant="outline" size="sm" onClick={() => navigate(`/submissions/${lesson.id}`)}>
//                                                 View Submissions <ChevronRight className="ml-2 h-4 w-4" />
//                                             </Button>
//                                         </div>
//                                     )) : (
//                                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
//                                             <h3 className="text-lg font-medium text-gray-700">This course has no lessons yet.</h3>
//                                             <p className="text-gray-500 mb-4">Add a lesson to build your curriculum.</p>
//                                             <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                                 <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                             </Button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </TabsContent>

//                     <TabsContent value="settings" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Course Settings</CardTitle>
//                                 <CardDescription>Manage the visibility and other settings for your course.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-6">
//                                 <div className="flex items-center justify-between rounded-lg border p-4">
//                                     <div className="space-y-0.5">
//                                         <Label htmlFor="publish-switch" className="text-base">Publish Course</Label>
//                                         <p className="text-sm text-muted-foreground">
//                                             Make this course visible to students in the "Discover" marketplace.
//                                         </p>
//                                     </div>
//                                     <Switch
//                                         id="publish-switch"
//                                         checked={course.is_published}
//                                         onCheckedChange={handlePublishToggle}
//                                     />
//                                 </div>
//                                 {course.is_published && (
//                                      <Alert>
//                                         <AlertCircle className="h-4 w-4" />
//                                         <AlertTitle>This course is live!</AlertTitle>
//                                         <AlertDescription>
//                                             Students can now find and enroll in this course from the Discover page.
//                                         </AlertDescription>
//                                     </Alert>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default CourseManagementPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseManagementPage.tsx (V4.1 - Robust Refetching)
//  * =================================================================
//  * DESCRIPTION: This version fixes the stale data issue by replacing
//  * the 'focus' event listener with the more reliable 'visibilitychange'
//  * event, ensuring the UI always reflects the latest data.
//  */
// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as TabsPrimitive from "@radix-ui/react-tabs";
// import * as SwitchPrimitives from "@radix-ui/react-switch";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { ChevronLeft, PlusCircle, BookOpen, AlertCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// // --- Self-contained Shadcn UI Components ---

// const Tabs = TabsPrimitive.Root;
// const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
// ));
// TabsList.displayName = TabsPrimitive.List.displayName;
// const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
// ));
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
// const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
// ));
// TabsContent.displayName = TabsPrimitive.Content.displayName;

// const Switch = React.forwardRef<
//   React.ElementRef<typeof SwitchPrimitives.Root>,
//   React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
// >(({ className, ...props }, ref) => (
//   <SwitchPrimitives.Root
//     className={cn(
//       "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
//       className
//     )}
//     {...props}
//     ref={ref}
//   >
//     <SwitchPrimitives.Thumb
//       className={cn(
//         "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
//       )}
//     />
//   </SwitchPrimitives.Root>
// ));
// Switch.displayName = SwitchPrimitives.Root.displayName;


// const CourseManagementPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<Course | null>(null);
//     const [lessons, setLessons] = useState<Lesson[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     const fetchCourseDetails = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !courseId) {
//             navigate('/login');
//             return;
//         }
//         setIsLoading(true);
//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Failed to fetch course details.');
//             }
//             const data = await response.json();
//             setCourse(data);
//             setLessons(data.lessons || []);
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred.');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         fetchCourseDetails(); // Fetch data on initial mount

//         // The 'visibilitychange' event is a more reliable way to detect
//         // when a user returns to the tab, solving the stale data issue.
//         const handleVisibilityChange = () => {
//             if (document.visibilityState === 'visible') {
//                 fetchCourseDetails();
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);

//         // Cleanup function to remove the event listener
//         return () => {
//             document.removeEventListener('visibilitychange', handleVisibilityChange);
//         };
//     }, [fetchCourseDetails]);

//     const handlePublishToggle = async (isPublished: boolean) => {
//         if (!course) return;
//         const token = localStorage.getItem('authToken');
        
//         const originalPublishedState = course.is_published;
//         setCourse({ ...course, is_published: isPublished });

//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${course.id}/publish`, {
//                 method: 'PATCH',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ is_published: isPublished })
//             });
//             if (!response.ok) throw new Error('Failed to update course status.');
//         } catch (err) {
//             console.error(err);
//             setError('Failed to update course status. Please try again.');
//             setCourse({ ...course, is_published: originalPublishedState });
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading course details...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!course) return <div className="p-8">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8">
//                     <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                     <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                 </header>

//                 <Tabs defaultValue="curriculum">
//                     <TabsList>
//                         <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
//                         <TabsTrigger value="students" disabled>Student Roster</TabsTrigger>
//                         <TabsTrigger value="sessions" disabled>Live Sessions</TabsTrigger>
//                         <TabsTrigger value="settings">Settings</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="curriculum" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <div className="flex justify-between items-center">
//                                     <div>
//                                         <CardTitle>Course Curriculum</CardTitle>
//                                         <CardDescription>Manage the lessons and assignments for this course.</CardDescription>
//                                     </div>
//                                     <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                         <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {lessons.length > 0 ? lessons.map(lesson => (
//                                         <div key={lesson.id} className="w-full text-left p-4 border rounded-md flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <BookOpen className="h-5 w-5 text-gray-400" />
//                                                 <div>
//                                                     <h3 className="font-semibold text-lg">{lesson.title}</h3>
//                                                     <p className="text-sm text-muted-foreground">{lesson.description}</p>
//                                                 </div>
//                                             </div>
//                                             <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lesson.id}/edit`)}>
//                                                 Edit
//                                             </Button>
//                                         </div>
//                                     )) : (
//                                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
//                                             <h3 className="text-lg font-medium text-gray-700">This course has no lessons yet.</h3>
//                                             <p className="text-gray-500 mb-4">Add a lesson to build your curriculum.</p>
//                                             <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                                 <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                             </Button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </TabsContent>

//                     <TabsContent value="settings" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Course Settings</CardTitle>
//                                 <CardDescription>Manage the visibility and other settings for your course.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-6">
//                                 <div className="flex items-center justify-between rounded-lg border p-4">
//                                     <div className="space-y-0.5">
//                                         <Label htmlFor="publish-switch" className="text-base">Publish Course</Label>
//                                         <p className="text-sm text-muted-foreground">
//                                             Make this course visible to students in the "Discover" marketplace.
//                                         </p>
//                                     </div>
//                                     <Switch
//                                         id="publish-switch"
//                                         checked={course.is_published}
//                                         onCheckedChange={handlePublishToggle}
//                                     />
//                                 </div>
//                                 {course.is_published && (
//                                      <Alert>
//                                         <AlertCircle className="h-4 w-4" />
//                                         <AlertTitle>This course is live!</AlertTitle>
//                                         <AlertDescription>
//                                             Students can now find and enroll in this course from the Discover page.
//                                         </AlertDescription>
//                                     </Alert>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default CourseManagementPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseManagementPage.tsx (V3.2 - Syntax Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes a syntax error in the React import
//  * statement.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as TabsPrimitive from "@radix-ui/react-tabs";
// import * as SwitchPrimitives from "@radix-ui/react-switch";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// // REMOVED: import { Switch } from "@/components/ui/switch";
// import { ChevronLeft, PlusCircle, BookOpen, AlertCircle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// // --- Self-contained Shadcn UI Components ---

// const Tabs = TabsPrimitive.Root;
// const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
// ));
// TabsList.displayName = TabsPrimitive.List.displayName;
// const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
// ));
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
// const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
// ));
// TabsContent.displayName = TabsPrimitive.Content.displayName;

// const Switch = React.forwardRef<
//   React.ElementRef<typeof SwitchPrimitives.Root>,
//   React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
// >(({ className, ...props }, ref) => (
//   <SwitchPrimitives.Root
//     className={cn(
//       "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
//       className
//     )}
//     {...props}
//     ref={ref}
//   >
//     <SwitchPrimitives.Thumb
//       className={cn(
//         "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
//       )}
//     />
//   </SwitchPrimitives.Root>
// ));
// Switch.displayName = SwitchPrimitives.Root.displayName;


// const CourseManagementPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<Course | null>(null);
//     const [lessons, setLessons] = useState<Lesson[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchCourseDetails = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch course details.');
//                 }
//                 const data = await response.json();
//                 setCourse(data);
//                 setLessons(data.lessons || []);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         fetchCourseDetails();
//     }, [courseId, navigate]);

//     const handlePublishToggle = async (isPublished: boolean) => {
//         if (!course) return;
//         const token = localStorage.getItem('authToken');
        
//         const originalPublishedState = course.is_published;
//         // Optimistic UI update
//         setCourse({ ...course, is_published: isPublished });

//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${course.id}/publish`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ is_published: isPublished })
//             });

//             if (!response.ok) {
//                 // Revert optimistic update on failure
//                 setCourse({ ...course, is_published: originalPublishedState });
//                 throw new Error('Failed to update course status.');
//             }
//             // Data is already updated, no need to do anything on success
//         } catch (err) {
//             console.error(err);
//             setError('Failed to update course status. Please try again.');
//             // Revert optimistic update on failure
//             setCourse({ ...course, is_published: originalPublishedState });
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading course details...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!course) return <div className="p-8">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8">
//                     <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                     <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                 </header>

//                 <Tabs defaultValue="curriculum">
//                     <TabsList>
//                         <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
//                         <TabsTrigger value="students" disabled>Student Roster</TabsTrigger>
//                         <TabsTrigger value="sessions" disabled>Live Sessions</TabsTrigger>
//                         <TabsTrigger value="settings">Settings</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="curriculum" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <div className="flex justify-between items-center">
//                                     <div>
//                                         <CardTitle>Course Curriculum</CardTitle>
//                                         <CardDescription>Manage the lessons and assignments for this course.</CardDescription>
//                                     </div>
//                                     <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                         <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {lessons.length > 0 ? lessons.map(lesson => (
//                                         <div key={lesson.id} className="w-full text-left p-4 border rounded-md flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <BookOpen className="h-5 w-5 text-gray-400" />
//                                                 <div>
//                                                     <h3 className="font-semibold text-lg">{lesson.title}</h3>
//                                                     <p className="text-sm text-muted-foreground">{lesson.description}</p>
//                                                 </div>
//                                             </div>
//                                             <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lesson.id}/edit`)}>
//                                                 Edit
//                                             </Button>
//                                         </div>
//                                     )) : (
//                                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
//                                             <h3 className="text-lg font-medium text-gray-700">This course has no lessons yet.</h3>
//                                             <p className="text-gray-500 mb-4">Add a lesson to build your curriculum.</p>
//                                             <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                                 <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                             </Button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </TabsContent>

//                     <TabsContent value="settings" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Course Settings</CardTitle>
//                                 <CardDescription>Manage the visibility and other settings for your course.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-6">
//                                 <div className="flex items-center justify-between rounded-lg border p-4">
//                                     <div className="space-y-0.5">
//                                         <Label htmlFor="publish-switch" className="text-base">Publish Course</Label>
//                                         <p className="text-sm text-muted-foreground">
//                                             Make this course visible to students in the "Discover" marketplace.
//                                         </p>
//                                     </div>
//                                     <Switch
//                                         id="publish-switch"
//                                         checked={course.is_published}
//                                         onCheckedChange={handlePublishToggle}
//                                     />
//                                 </div>
//                                 {course.is_published && (
//                                      <Alert>
//                                         <AlertCircle className="h-4 w-4" />
//                                         <AlertTitle>This course is live!</AlertTitle>
//                                         <AlertDescription>
//                                             Students can now find and enroll in this course from the Discover page.
//                                         </AlertDescription>
//                                     </Alert>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default CourseManagementPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseManagementPage.tsx (V2 - Live Data)
//  * =================================================================
//  * DESCRIPTION: This version is now connected to the live backend.
//  * It fetches real course and lesson data from the API instead of
//  * using mock data.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as TabsPrimitive from "@radix-ui/react-tabs";
// import { cn } from "@/lib/utils"; // Assuming you have a cn utility function

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { ChevronLeft, PlusCircle, BookOpen } from 'lucide-react';

// // Self-contained Tabs Components
// const Tabs = TabsPrimitive.Root;
// const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
// ));
// TabsList.displayName = TabsPrimitive.List.displayName;
// const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
// ));
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
// const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
// ));
// TabsContent.displayName = TabsPrimitive.Content.displayName;


// const CourseManagementPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<Course | null>(null);
//     const [lessons, setLessons] = useState<Lesson[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         // UPDATED: This now makes a live API call to the backend.
//         const fetchCourseDetails = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch course details.');
//                 }
//                 const data = await response.json();
//                 setCourse(data);
//                 setLessons(data.lessons || []);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
        
//         fetchCourseDetails();
//     }, [courseId, navigate]);

//     if (isLoading) {
//         return <div className="p-8">Loading course details...</div>;
//     }

//     if (error) {
//         return <div className="p-8 text-destructive">{error}</div>;
//     }

//     if (!course) {
//         return <div className="p-8">Course not found.</div>;
//     }

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8">
//                     <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                     <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                 </header>

//                 <Tabs defaultValue="curriculum">
//                     <TabsList>
//                         <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
//                         <TabsTrigger value="students" disabled>Student Roster</TabsTrigger>
//                         <TabsTrigger value="sessions" disabled>Live Sessions</TabsTrigger>
//                         <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="curriculum" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <div className="flex justify-between items-center">
//                                     <div>
//                                         <CardTitle>Course Curriculum</CardTitle>
//                                         <CardDescription>Manage the lessons and assignments for this course.</CardDescription>
//                                     </div>
//                                     <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                         <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {lessons.length > 0 ? lessons.map(lesson => (
//                                         <div key={lesson.id} className="w-full text-left p-4 border rounded-md flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <BookOpen className="h-5 w-5 text-gray-400" />
//                                                 <div>
//                                                     <h3 className="font-semibold text-lg">{lesson.title}</h3>
//                                                     <p className="text-sm text-muted-foreground">{lesson.description}</p>
//                                                 </div>
//                                             </div>
//                                             <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lesson.id}/edit`)}>
//                                                 Edit
//                                             </Button>
//                                         </div>
//                                     )) : (
//                                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
//                                             <h3 className="text-lg font-medium text-gray-700">This course has no lessons yet.</h3>
//                                             <p className="text-gray-500 mb-4">Add a lesson to build your curriculum.</p>
//                                             <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                                 <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                             </Button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </TabsContent>

//                     <TabsContent value="students">
//                         <p>Student roster management coming soon.</p>
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default CourseManagementPage;

// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as TabsPrimitive from "@radix-ui/react-tabs";
// import { cn } from "@/lib/utils"; // Assuming you have a cn utility function

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// // REMOVED: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { ChevronLeft, PlusCircle, BookOpen } from 'lucide-react';

// // --- NEW: Self-contained Tabs Components ---
// // To resolve the import error, the shadcn Tabs component code is included here.
// const Tabs = TabsPrimitive.Root;

// const TabsList = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.List>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.List
//     ref={ref}
//     className={cn(
//       "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
//       className
//     )}
//     {...props}
//   />
// ));
// TabsList.displayName = TabsPrimitive.List.displayName;

// const TabsTrigger = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.Trigger>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger
//     ref={ref}
//     className={cn(
//       "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
//       className
//     )}
//     {...props}
//   />
// ));
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// const TabsContent = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.Content>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content
//     ref={ref}
//     className={cn(
//       "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
//       className
//     )}
//     {...props}
//   />
// ));
// TabsContent.displayName = TabsPrimitive.Content.displayName;


// const CourseManagementPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<Course | null>(null);
//     const [lessons, setLessons] = useState<Lesson[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         // MOCK DATA: Using mock data until the backend is ready.
//         const fetchCourseDetails = () => {
//             const mockCourse: Course = {
//                 id: courseId || '1',
//                 title: 'Introduction to JavaScript',
//                 description: 'Master the fundamentals of JavaScript, from variables to asynchronous programming.',
//                 student_count: 34,
//                 lesson_count: 2,
//             };
//             const mockLessons: any[] = [
//                 { id: '101', title: 'Variables and Data Types', description: 'Learn about let, const, and var.', course_id: courseId || '1' },
//                 { id: '102', title: 'Functions and Scope', description: 'Understand how functions work in JavaScript.', course_id: courseId || '1' },
//             ];
//             setCourse(mockCourse);
//             setLessons(mockLessons);
//             setIsLoading(false);
//         };
//         fetchCourseDetails();
//     }, [courseId]);

//     if (isLoading) {
//         return <div className="p-8">Loading course details...</div>;
//     }

//     if (error) {
//         return <div className="p-8 text-destructive">{error}</div>;
//     }

//     if (!course) {
//         return <div className="p-8">Course not found.</div>;
//     }

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8">
//                     <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                     <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                 </header>

//                 <Tabs defaultValue="curriculum">
//                     <TabsList>
//                         <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
//                         <TabsTrigger value="students" disabled>Student Roster</TabsTrigger>
//                         <TabsTrigger value="sessions" disabled>Live Sessions</TabsTrigger>
//                         <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="curriculum" className="mt-6">
//                         <Card>
//                             <CardHeader>
//                                 <div className="flex justify-between items-center">
//                                     <div>
//                                         <CardTitle>Course Curriculum</CardTitle>
//                                         <CardDescription>Manage the lessons and assignments for this course.</CardDescription>
//                                     </div>
//                                     <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                         <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {lessons.length > 0 ? lessons.map(lesson => (
//                                         <div key={lesson.id} className="w-full text-left p-4 border rounded-md flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <BookOpen className="h-5 w-5 text-gray-400" />
//                                                 <div>
//                                                     <h3 className="font-semibold text-lg">{lesson.title}</h3>
//                                                     <p className="text-sm text-muted-foreground">{lesson.description}</p>
//                                                 </div>
//                                             </div>
//                                             <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lesson.id}/edit`)}>
//                                                 Edit
//                                             </Button>
//                                         </div>
//                                     )) : (
//                                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
//                                             <h3 className="text-lg font-medium text-gray-700">This course has no lessons yet.</h3>
//                                             <p className="text-gray-500 mb-4">Add a lesson to build your curriculum.</p>
//                                             <Button onClick={() => navigate(`/lessons/new?courseId=${course.id}`)}>
//                                                 <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
//                                             </Button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </TabsContent>

//                     <TabsContent value="students">
//                         <p>Student roster management coming soon.</p>
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default CourseManagementPage;
