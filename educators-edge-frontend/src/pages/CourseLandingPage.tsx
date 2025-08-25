/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   CourseLandingPage.tsx (V3.1 - CoreZenith Design)
 * =================================================================
 * DESCRIPTION: This version implements the CoreZenith "Course
 * Prospectus" design, creating a compelling and inspiring landing
 * page while preserving 100% of the original V3.1 functionality.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Course, Lesson } from '../types/index.ts';
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import apiClient from '../services/apiClient';

// Import shadcn components and icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, CheckCircle, XCircle, Target, BookOpen } from 'lucide-react';

// --- CoreZenith Styled Components ---

const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
        {...props} 
    />
);

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-600", className)} {...props} />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-slate-400", className)} {...props} />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;


// --- Type Definitions (100% Original) ---
interface PublicCourse extends Course {
    teacher_name: string;
    lessons: Pick<Lesson, 'id' | 'title'>[];
}

const CourseLandingPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    // --- State Management (100% Original) ---
    const [course, setCourse] = useState<PublicCourse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollmentStatus, setEnrollmentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // --- Data Fetching Logic (100% Original) ---
    useEffect(() => {
        const fetchCourse = async () => {
            const token = localStorage.getItem('authToken');
            if (!token || !courseId) {
                navigate('/login');
                return;
            }
            try {
                const response = await apiClient.get(`/api/courses/public/${courseId}`);
                setCourse(response.data);
            } catch (err) {
                if (err instanceof Error) setError(err.message);
                else setError('An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourse();
    }, [courseId, navigate]);

    // --- Enrollment Logic (100% Original) ---
    const handleEnroll = async () => {
        setIsEnrolling(true);
        setEnrollmentStatus(null);

        try {
            await apiClient.post(`/api/courses/${courseId}/enroll`);

            setEnrollmentStatus({ type: 'success', message: 'Successfully enrolled! Redirecting to your dashboard...' });
            
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setEnrollmentStatus({ type: 'error', message: errorMessage });
        } finally {
            setIsEnrolling(false);
        }
    };

    if (isLoading) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Loading Course Prospectus...</p></div>;
    if (error) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-red-400"><p className="relative z-10">{error}</p></div>;
    if (!course) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Course not found.</p></div>;

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                <Button variant="ghost" onClick={() => navigate('/courses/discover')} className="mb-8 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Marketplace
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <header className="mb-8">
                            <p className="text-cyan-400 font-semibold tracking-wide flex items-center gap-2"><BookOpen size={16}/> COURSE PROSPECTUS</p>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-slate-100 mt-2">{course.title}</h1>
                            <p className="text-xl text-slate-300 mt-4">{course.description}</p>
                        </header>
                        
                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-3 text-slate-100">
                                    <Target className="text-cyan-400/80"/>
                                    Course Blueprint
                                </CardTitle>
                                <CardDescription className="text-slate-400">An overview of the lessons you will master.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {course.lessons.map(lesson => (
                                        <li key={lesson.id} className="flex items-center text-lg">
                                            <CheckCircle className="h-5 w-5 text-cyan-400 mr-4 flex-shrink-0" />
                                            <span className="text-slate-200">{lesson.title}</span>
                                        </li>
                                    ))}
                                </ul>
                                {course.lessons.length === 0 && (
                                     <p className="text-slate-500 text-center py-4">Lesson plan coming soon.</p>
                                )}
                            </CardContent>
                        </GlassCard>
                    </div>

                    <div className="md:col-span-1">
                        <GlassCard className="sticky top-8">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} alt={course.teacher_name}/>
                                        <AvatarFallback>{course.teacher_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-lg text-slate-100">{course.teacher_name}</p>
                                        <p className="text-sm text-slate-400">Instructor</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {enrollmentStatus && (
                                    <Alert variant={enrollmentStatus.type === 'error' ? 'destructive' : 'default'} 
                                           className={cn(enrollmentStatus.type === 'error' ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-green-950/40 border-green-500/30 text-green-300')}>
                                        {enrollmentStatus.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        <AlertTitle className="font-semibold">{enrollmentStatus.type === 'error' ? 'Enrollment Failed' : 'Enrollment Successful'}</AlertTitle>
                                        <AlertDescription>{enrollmentStatus.message}</AlertDescription>
                                    </Alert>
                                )}
                                <Button className="w-full p-6 text-lg font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-900" size="lg" onClick={handleEnroll} disabled={isEnrolling || enrollmentStatus?.type === 'success'}>
                                    {isEnrolling ? 'Enrolling...' : (enrollmentStatus?.type === 'success' ? 'Enrolled!' : 'Begin Your Ascent')}
                                </Button>
                                <p className="text-xs text-center text-slate-500">
                                    You'll gain full access to all lessons, materials, and future updates.
                                </p>
                            </CardContent>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseLandingPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseLandingPage.tsx (V3.1 - Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes the import error for the Avatar
//  * component by including its source code directly in this file.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as AvatarPrimitive from "@radix-ui/react-avatar";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

// // --- Self-contained Shadcn UI Components ---

// const Avatar = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Root
//     ref={ref}
//     className={cn(
//       "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
//       className
//     )}
//     {...props}
//   />
// ));
// Avatar.displayName = AvatarPrimitive.Root.displayName;

// const AvatarImage = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Image>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Image
//     ref={ref}
//     className={cn("aspect-square h-full w-full", className)}
//     {...props}
//   />
// ));
// AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// const AvatarFallback = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Fallback>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Fallback
//     ref={ref}
//     className={cn(
//       "flex h-full w-full items-center justify-center rounded-full bg-muted",
//       className
//     )}
//     {...props}
//   />
// ));
// AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;


// // Define a type for the public course data, including teacher and lesson list
// interface PublicCourse extends Course {
//     teacher_name: string;
//     lessons: Pick<Lesson, 'id' | 'title'>[];
// }

// const CourseLandingPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<PublicCourse | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isEnrolling, setIsEnrolling] = useState(false);
//     const [enrollmentStatus, setEnrollmentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

//     useEffect(() => {
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/public/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch course details.');
//                 }
//                 const data = await response.json();
//                 setCourse(data);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//     }, [courseId, navigate]);

//     const handleEnroll = async () => {
//         setIsEnrolling(true);
//         setEnrollmentStatus(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/courses/${courseId}/enroll`, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${token}`
//                 }
//             });

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.error || 'Failed to enroll in the course.');
//             }

//             setEnrollmentStatus({ type: 'success', message: 'Successfully enrolled! Redirecting to your dashboard...' });
            
//             setTimeout(() => {
//                 navigate('/dashboard');
//             }, 2000);

//         } catch (err) {
//             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setEnrollmentStatus({ type: 'error', message: errorMessage });
//         } finally {
//             setIsEnrolling(false);
//         }
//     };

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/courses/discover')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Discover
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <Badge variant="secondary" className="mb-2">Course</Badge>
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-xl text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>What you'll learn</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-3">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id} className="flex items-center">
//                                             <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
//                                             <span className="text-gray-700">{lesson.title}</span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Enrollment Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                 <div className="flex items-center gap-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 {enrollmentStatus && (
//                                     <Alert variant={enrollmentStatus.type === 'error' ? 'destructive' : 'default'}>
//                                         {enrollmentStatus.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
//                                         <AlertTitle>{enrollmentStatus.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
//                                         <AlertDescription>{enrollmentStatus.message}</AlertDescription>
//                                     </Alert>
//                                 )}
//                                 <Button className="w-full" size="lg" onClick={handleEnroll} disabled={isEnrolling}>
//                                     {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
//                                 </Button>
//                                 <p className="text-xs text-center text-muted-foreground">
//                                     You'll get full access to all lessons and materials.
//                                 </p>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CourseLandingPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseLandingPage.tsx (V2.1 - Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes the import error for the Avatar
//  * component by including its source code directly in this file.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as AvatarPrimitive from "@radix-ui/react-avatar";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { ChevronLeft, CheckCircle } from 'lucide-react';

// // --- Self-contained Shadcn UI Components ---

// const Avatar = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Root
//     ref={ref}
//     className={cn(
//       "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
//       className
//     )}
//     {...props}
//   />
// ));
// Avatar.displayName = AvatarPrimitive.Root.displayName;

// const AvatarImage = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Image>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Image
//     ref={ref}
//     className={cn("aspect-square h-full w-full", className)}
//     {...props}
//   />
// ));
// AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// const AvatarFallback = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Fallback>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Fallback
//     ref={ref}
//     className={cn(
//       "flex h-full w-full items-center justify-center rounded-full bg-muted",
//       className
//     )}
//     {...props}
//   />
// ));
// AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;


// // Define a type for the public course data, including teacher and lesson list
// interface PublicCourse extends Course {
//     teacher_name: string;
//     lessons: Pick<Lesson, 'id' | 'title'>[];
// }

// const CourseLandingPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<PublicCourse | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isEnrolling, setIsEnrolling] = useState(false);

//     useEffect(() => {
//         // UPDATED: This now makes a live API call to the backend.
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/public/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch course details.');
//                 }
//                 const data = await response.json();
//                 setCourse(data);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//     }, [courseId, navigate]);

//     const handleEnroll = async () => {
//         setIsEnrolling(true);
//         // This is where the fake payment and enrollment logic will go.
//         // For now, we'll just simulate a successful enrollment.
//         setTimeout(() => {
//             alert("You have successfully enrolled in this course!");
//             navigate('/dashboard');
//         }, 1000);
//     };

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/courses/discover')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Discover
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <Badge variant="secondary" className="mb-2">Course</Badge>
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-xl text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>What you'll learn</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-3">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id} className="flex items-center">
//                                             <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
//                                             <span className="text-gray-700">{lesson.title}</span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Enrollment Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                 <div className="flex items-center gap-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Button className="w-full" size="lg" onClick={handleEnroll} disabled={isEnrolling}>
//                                     {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
//                                 </Button>
//                                 <p className="text-xs text-center text-muted-foreground">
//                                     You'll get full access to all lessons and materials.
//                                 </p>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CourseLandingPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseLandingPage.tsx (V2 - Live Data)
//  * =================================================================
//  * DESCRIPTION: This version is now connected to the live backend.
//  * It fetches the public details for a single course from the API
//  * instead of using mock data.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { ChevronLeft, CheckCircle } from 'lucide-react';

// // Define a type for the public course data, including teacher and lesson list
// interface PublicCourse extends Course {
//     teacher_name: string;
//     lessons: Pick<Lesson, 'id' | 'title'>[];
// }

// const CourseLandingPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<PublicCourse | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isEnrolling, setIsEnrolling] = useState(false);

//     useEffect(() => {
//         // UPDATED: This now makes a live API call to the backend.
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/public/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch course details.');
//                 }
//                 const data = await response.json();
//                 setCourse(data);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//     }, [courseId, navigate]);

//     const handleEnroll = async () => {
//         setIsEnrolling(true);
//         // This is where the fake payment and enrollment logic will go.
//         // For now, we'll just simulate a successful enrollment.
//         setTimeout(() => {
//             alert("You have successfully enrolled in this course!");
//             navigate('/dashboard');
//         }, 1000);
//     };

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/courses/discover')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Discover
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <Badge variant="secondary" className="mb-2">Course</Badge>
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-xl text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>What you'll learn</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-3">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id} className="flex items-center">
//                                             <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
//                                             <span className="text-gray-700">{lesson.title}</span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Enrollment Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                 <div className="flex items-center gap-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Button className="w-full" size="lg" onClick={handleEnroll} disabled={isEnrolling}>
//                                     {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
//                                 </Button>
//                                 <p className="text-xs text-center text-muted-foreground">
//                                     You'll get full access to all lessons and materials.
//                                 </p>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CourseLandingPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CourseLandingPage.tsx
//  * =================================================================
//  * DESCRIPTION: This new page serves as the public-facing "syllabus"
//  * or landing page for a course, allowing students to view details
//  * before enrolling.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { ChevronLeft, CheckCircle } from 'lucide-react';

// // Define a type for the public course data, including teacher and lesson list
// interface PublicCourse extends Course {
//     teacher_name: string;
//     lessons: Pick<Lesson, 'id' | 'title'>[];
// }

// const CourseLandingPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<PublicCourse | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isEnrolling, setIsEnrolling] = useState(false);

//     useEffect(() => {
//         // MOCK DATA: Using mock data until the backend is ready.
//         const fetchPublicCourse = () => {
//             const mockCourse: PublicCourse = {
//                 id: courseId || '1',
//                 title: 'Introduction to JavaScript',
//                 description: 'Master the fundamentals of JavaScript, from variables and functions to asynchronous programming and the DOM. This course is perfect for beginners with no prior programming experience.',
//                 teacher_name: 'Alice Johnson',
//                 student_count: 34,
//                 lesson_count: 3,
//                 lessons: [
//                     { id: '101', title: 'Variables and Data Types' },
//                     { id: '102', title: 'Functions and Scope' },
//                     { id: '103', title: 'Asynchronous JavaScript with Promises' },
//                 ]
//             };
//             setCourse(mockCourse);
//             setIsLoading(false);
//         };
//         fetchPublicCourse();
        
//         /*
//         // TODO: Replace mock data with API call
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/courses/public/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch course details.');
//                 const data = await response.json();
//                 setCourse(data);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//         */
//     }, [courseId]);

//     const handleEnroll = async () => {
//         setIsEnrolling(true);
//         // This is where the fake payment and enrollment logic will go.
//         // For now, we'll just simulate a successful enrollment.
//         setTimeout(() => {
//             alert("You have successfully enrolled in this course!");
//             navigate('/dashboard');
//         }, 1000);
//     };

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/courses/discover')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Discover
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <Badge variant="secondary" className="mb-2">Course</Badge>
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-xl text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>What you'll learn</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-3">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id} className="flex items-center">
//                                             <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
//                                             <span className="text-gray-700">{lesson.title}</span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Enrollment Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                 <div className="flex items-center gap-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <Button className="w-full" size="lg" onClick={handleEnroll} disabled={isEnrolling}>
//                                     {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
//                                 </Button>
//                                 <p className="text-xs text-center text-muted-foreground">
//                                     You'll get full access to all lessons and materials.
//                                 </p>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CourseLandingPage;
