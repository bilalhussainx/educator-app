/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   StudentCoursePage.tsx (Final Version - Phase 6)
 * =================================================================
 * DESCRIPTION: This version is fully integrated with the adaptive
 * action modal and global state management, completing the APE user
 * experience loop. It handles both visual and "silent" interventions.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Course, Lesson } from '../types/index.ts';
import apiClient from '../services/apiClient';
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

// --- APE: Import the new master modal and the state store ---
import { AdaptiveActionModal } from '../components/AdaptiveActionModal';
import { useApeStore } from '../stores/apeStore';

// CoreZenith UI Components & Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, CheckCircle, Circle, Target } from 'lucide-react';

// --- APE: Export the Action type so our modal can use it ---
// This is the full definition of an action object from the backend
export interface AdaptiveAction {
    id: number;
    user_id: string;
    action_type: 'INJECT_FRAGMENT' | 'GENERATE_PROBLEM' | 'ADAPT_TUTOR_STYLE';
    related_id: number;
    is_completed: boolean;
    created_at: string;
    metadata?: { newStyle?: 'socratic' | 'hint_based' | 'direct' };
    details?: any; // This will hold the fragment or problem data
}

// --- CoreZenith UI Primitives (Styled for the theme) ---
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
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-600", className)}
    {...props}
  />
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
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-slate-400", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-cyan-400 transition-all duration-500 ease-out"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;


// --- Type Definitions (from original file) ---
interface CurriculumLesson extends Lesson { is_completed: boolean; }
interface StudentCourseView extends Course {
    teacher_name: string;
    lessons: CurriculumLesson[];
}

// --- Main Component ---
const StudentCoursePage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    // --- APE: Get the state setter from our Zustand store ---
    const setTutorStyle = useApeStore((state) => state.setTutorStyle);

    const [course, setCourse] = useState<StudentCourseView | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<AdaptiveAction | null>(null);
    const [dismissedActionIds, setDismissedActionIds] = useState<number[]>([]);

    // --- Data Fetching Effect (Original Logic) ---
    useEffect(() => {
        const fetchCourse = async () => {
            const token = localStorage.getItem('authToken');
            if (!token || !courseId) { navigate('/login'); return; }
            setIsLoading(true);
            try {
                const response = await apiClient.get(`/api/students/my-courses/${courseId}`);
                setCourse(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourse();
    }, [courseId, navigate]);

    // --- APE: Effect with Polling to check for adaptive actions ---
    useEffect(() => {
        const checkForNextAction = async () => {
            if (activeAction) return;

            try {
                const response = await apiClient.get('/api/users/next-action');

                const actionData = response.data;
                if (actionData && !dismissedActionIds.includes(actionData.id)) {
                    console.log("APE Action received:", actionData);

                    // --- APE: Handle different action types ---
                    if (actionData.action_type === 'ADAPT_TUTOR_STYLE' && actionData.metadata?.newStyle) {
                        // This is a "silent" action. Update state and complete it.
                        console.log(`APE: Silently adapting tutor style to ${actionData.metadata.newStyle}`);
                        setTutorStyle(actionData.metadata.newStyle);
                        handleActionComplete(actionData.id, true); // Mark as silent
                    } else {
                        // This is a visual action. Show the modal.
                        setActiveAction(actionData);
                    }
                }
            } catch (err) {
                console.error("Failed to check for next action:", err);
            }
        };

        checkForNextAction();
        const pollInterval = setInterval(checkForNextAction, 5000);
        return () => clearInterval(pollInterval);
    }, [activeAction, dismissedActionIds, setTutorStyle]);


    // --- APE: Handler to complete an action ---
    const handleActionComplete = (actionId: number, isSilent: boolean = false) => {
        setDismissedActionIds(prevIds => [...prevIds, actionId]);

        const token = localStorage.getItem('authToken');
        apiClient.post(`/api/users/actions/${actionId}/complete`).catch(err => console.error("Failed to mark action as complete:", err));

        // Only clear the active action if it wasn't a silent one (which never sets it)
        if (!isSilent) {
            setActiveAction(null);
        }
    };


    const renderLoadingState = () => (
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">Loading Learning Path...</p>
        </div>
    );
    
    const renderErrorState = () => (
        <div className="flex items-center justify-center h-full">
            <p className="text-red-400">{error}</p>
        </div>
    );

    if (!course && (isLoading || error)) {
        return (
            <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
                 <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
                 <main className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)]">
                    {isLoading ? renderLoadingState() : renderErrorState()}
                 </main>
            </div>
        )
    }
    
    if (!course) return null;

    const completedLessons = course.lessons.filter(l => l.is_completed).length;
    const totalLessons = course.lessons.length;
    const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
            {/* --- APE: Render the REAL modal component for visual actions --- */}
            {activeAction && (
                <AdaptiveActionModal 
                    action={activeAction} 
                    onClose={() => handleActionComplete(activeAction.id)} 
                />
            )}

            {/* Background decorative grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            {/* Main Content Area */}
            <main className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-8 text-gray-400 hover:bg-slate-800 hover:text-white">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Left Column: Curriculum */}
                        <div className="lg:col-span-2">
                            <header className="mb-8">
                                <p className="text-cyan-400 font-semibold tracking-wide">COURSE</p>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mt-2">{course.title}</h1>
                                <p className="text-lg text-gray-400 mt-4 max-w-3xl">{course.description}</p>
                            </header>
                            
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="text-2xl flex items-center gap-3">
                                        <Target className="text-cyan-400/80"/>
                                        Learning Path
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <ul className="space-y-1">
                                        {course.lessons.map((lesson, index) => (
                                            <li key={lesson.id} className="relative pl-8">
                                                {/* Connecting Line */}
                                                {index !== course.lessons.length - 1 && (
                                                    <div className="absolute left-[15px] top-5 h-full w-px bg-slate-700"></div>
                                                )}
                                                
                                                {/* Status Icon */}
                                                <div className="absolute left-0 top-3">
                                                    {lesson.is_completed ? (
                                                        <CheckCircle className="h-5 w-5 text-cyan-400" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-slate-600" />
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => navigate(`/lesson/${lesson.id}`)}
                                                    className="w-full text-left p-3 rounded-md hover:bg-slate-800/60 transition-colors duration-200"
                                                >
                                                    <span className="text-lg font-medium text-gray-200 hover:text-white">{lesson.title}</span>
                                                    <p className="text-gray-400 text-sm">{lesson.description}</p>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </GlassCard>
                        </div>

                        {/* Right Column: Progress Card */}
                        <div className="lg:col-span-1">
                            <GlassCard className="sticky top-24">
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} alt={course.teacher_name} />
                                            <AvatarFallback>{course.teacher_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-lg text-white">{course.teacher_name}</p>
                                            <p className="text-sm text-gray-400">Instructor</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <CardTitle className="text-xl">Your Ascent</CardTitle>
                                    <div>
                                        <div className="flex justify-between text-sm text-gray-300 font-mono mb-2">
                                            <span>{completedLessons} / {totalLessons} Lessons</span>
                                            <span className="font-bold">{Math.round(courseProgress)}%</span>
                                        </div>
                                        <Progress value={courseProgress} />
                                    </div>
                                    <p className="text-xs text-slate-500 text-center pt-2">
                                        Keep pushing forward. Every lesson completed is another step towards your zenith.
                                    </p>
                                </CardContent>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentCoursePage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   StudentCoursePage.tsx (Final Version - Phase 5)
//  * =================================================================
//  * DESCRIPTION: This is the focused learning view for a student's
//  * course. It is fully instrumented with a robust polling mechanism
//  * to check for and display adaptive interventions from the APE,
//  * and includes a fix for potential race conditions on dismissal.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types/index.ts';
// import * as AvatarPrimitive from "@radix-ui/react-avatar";
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // CoreZenith UI Components & Icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ChevronLeft, CheckCircle, Circle, Target } from 'lucide-react';

// // --- APE: Define the type for an incoming action ---
// interface AdaptiveAction {
//     id: number;
//     user_id: string;
//     action_type: 'INJECT_FRAGMENT' | 'GENERATE_PROBLEM' | 'ADAPT_TUTOR_STYLE';
//     related_id: number;
//     is_completed: boolean;
//     created_at: string;
//     // The 'details' object will be populated by the getNextAction endpoint
//     details?: {
//         id: number;
//         title: string;
//         content: string;
//         // ... other potential fields from content_fragments or generated_problems
//     };
// }

// // --- CoreZenith UI Primitives (Styled for the theme) ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card
//         className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
//         {...props}
//     />
// );

// const Avatar = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Root
//     ref={ref}
//     className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-600", className)}
//     {...props}
//   />
// ));
// Avatar.displayName = AvatarPrimitive.Root.displayName;

// const AvatarImage = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Image>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
// ));
// AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// const AvatarFallback = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Fallback>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Fallback
//     ref={ref}
//     className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-slate-400", className)}
//     {...props}
//   />
// ));
// AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-cyan-400 transition-all duration-500 ease-out"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;


// // --- Type Definitions (from original file) ---
// interface CurriculumLesson extends Lesson { is_completed: boolean; }
// interface StudentCourseView extends Course {
//     teacher_name: string;
//     lessons: CurriculumLesson[];
// }

// // --- Main Component ---
// const StudentCoursePage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<StudentCourseView | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     // --- APE State ---
//     const [activeAction, setActiveAction] = useState<AdaptiveAction | null>(null);
//     const [dismissedActionIds, setDismissedActionIds] = useState<number[]>([]);

//     // --- Data Fetching Effect (Original Logic) ---
//     useEffect(() => {
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) { navigate('/login'); return; }
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/students/my-courses/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     throw new Error((await response.json()).error || 'Failed to fetch course details.');
//                 }
//                 setCourse(await response.json());
//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//     }, [courseId, navigate]);

//     // --- APE: Effect with Polling to check for adaptive actions ---
//     useEffect(() => {
//         const checkForNextAction = async () => {
//             if (activeAction) return; // Don't poll if a modal is already active

//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/users/next-action', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });

//                 if (response.ok) {
//                     const actionData = await response.json();
                    
//                     // Only show the action if it exists and has not been dismissed in this session
//                     if (actionData && !dismissedActionIds.includes(actionData.id)) {
//                         console.log("APE Action received:", actionData);
//                         setActiveAction(actionData);
//                     }
//                 }
//             } catch (err) {
//                 console.error("Failed to check for next action:", err);
//             }
//         };

//         checkForNextAction(); // Check immediately on component load
//         const pollInterval = setInterval(checkForNextAction, 5000); // Poll every 5 seconds
//         return () => clearInterval(pollInterval); // Cleanup on unmount
//     }, [activeAction, dismissedActionIds]); // Re-run effect if these change


//     // --- APE: Handler to complete an action ---
//     const handleActionComplete = (actionId: number) => {
//         // Optimistically add the ID to our dismissed list to prevent re-showing
//         setDismissedActionIds(prevIds => [...prevIds, actionId]);

//         // Fire-and-forget the request to the backend to update the database
//         const token = localStorage.getItem('authToken');
//         fetch(`http://localhost:5000/api/actions/${actionId}/complete`, {
//             method: 'POST',
//             headers: { 'Authorization': `Bearer ${token}` }
//         }).catch(err => console.error("Failed to mark action as complete:", err));

//         // Close the modal immediately for a responsive UI
//         setActiveAction(null);
//     };


//     const renderLoadingState = () => (
//         <div className="flex items-center justify-center h-full">
//             <p className="text-gray-400 text-lg">Loading Learning Path...</p>
//         </div>
//     );
    
//     const renderErrorState = () => (
//         <div className="flex items-center justify-center h-full">
//             <p className="text-red-400">{error}</p>
//         </div>
//     );

//     if (!course && (isLoading || error)) {
//         return (
//             <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//                  <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
//                  <main className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)]">
//                     {isLoading ? renderLoadingState() : renderErrorState()}
//                  </main>
//             </div>
//         )
//     }
    
//     if (!course) return null; // Should be handled by loading/error states

//     const completedLessons = course.lessons.filter(l => l.is_completed).length;
//     const totalLessons = course.lessons.length;
//     const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

//     return (
//         <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//             {/* APE: Render the intervention modal conditionally */}
//             {activeAction && (
//                 <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in-0">
//                     <div className="bg-slate-900 p-8 rounded-2xl border border-fuchsia-500/50 text-white shadow-2xl max-w-2xl w-full animate-in fade-in-0 zoom-in-95">
//                         <h2 className="text-2xl font-bold text-fuchsia-300 mb-4">A Tip from Your AI Tutor</h2>
//                         <h3 className="text-xl font-semibold mb-3 text-slate-100">{activeAction.details?.title || 'Recommendation'}</h3>
//                         <div className="bg-slate-950/50 p-4 rounded-md border border-slate-700 max-h-[50vh] overflow-y-auto">
//                              <pre className="whitespace-pre-wrap font-sans text-slate-300 text-base leading-relaxed">{activeAction.details?.content || 'The AI has a suggestion for you.'}</pre>
//                         </div>
//                         <Button 
//                             onClick={() => handleActionComplete(activeAction.id)} 
//                             className="w-full mt-6 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-bold text-lg py-6"
//                         >
//                             Got It, Thanks!
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Background decorative grid */}
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             {/* Main Content Area */}
//             <main className="relative z-10 p-4 sm:p-6 lg:p-8">
//                 <div className="max-w-6xl mx-auto">
//                     <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-8 text-gray-400 hover:bg-slate-800 hover:text-white">
//                         <ChevronLeft className="mr-2 h-4 w-4" />
//                         Back to Dashboard
//                     </Button>

//                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
//                         {/* Left Column: Curriculum */}
//                         <div className="lg:col-span-2">
//                             <header className="mb-8">
//                                 <p className="text-cyan-400 font-semibold tracking-wide">COURSE</p>
//                                 <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mt-2">{course.title}</h1>
//                                 <p className="text-lg text-gray-400 mt-4 max-w-3xl">{course.description}</p>
//                             </header>
                            
//                             <GlassCard>
//                                 <CardHeader>
//                                     <CardTitle className="text-2xl flex items-center gap-3">
//                                         <Target className="text-cyan-400/80"/>
//                                         Learning Path
//                                     </CardTitle>
//                                 </CardHeader>
//                                 <CardContent className="pt-2">
//                                     <ul className="space-y-1">
//                                         {course.lessons.map((lesson, index) => (
//                                             <li key={lesson.id} className="relative pl-8">
//                                                 {/* Connecting Line */}
//                                                 {index !== course.lessons.length - 1 && (
//                                                     <div className="absolute left-[15px] top-5 h-full w-px bg-slate-700"></div>
//                                                 )}
                                                
//                                                 {/* Status Icon */}
//                                                 <div className="absolute left-0 top-3">
//                                                     {lesson.is_completed ? (
//                                                         <CheckCircle className="h-5 w-5 text-cyan-400" />
//                                                     ) : (
//                                                         <Circle className="h-5 w-5 text-slate-600" />
//                                                     )}
//                                                 </div>

//                                                 <button 
//                                                     onClick={() => navigate(`/lesson/${lesson.id}`)}
//                                                     className="w-full text-left p-3 rounded-md hover:bg-slate-800/60 transition-colors duration-200"
//                                                 >
//                                                     <span className="text-lg font-medium text-gray-200 hover:text-white">{lesson.title}</span>
//                                                     <p className="text-gray-400 text-sm">{lesson.description}</p>
//                                                 </button>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </CardContent>
//                             </GlassCard>
//                         </div>

//                         {/* Right Column: Progress Card */}
//                         <div className="lg:col-span-1">
//                             <GlassCard className="sticky top-24">
//                                 <CardHeader>
//                                     <div className="flex items-center gap-4">
//                                         <Avatar>
//                                             <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} alt={course.teacher_name} />
//                                             <AvatarFallback>{course.teacher_name.slice(0, 2).toUpperCase()}</AvatarFallback>
//                                         </Avatar>
//                                         <div>
//                                             <p className="font-bold text-lg text-white">{course.teacher_name}</p>
//                                             <p className="text-sm text-gray-400">Instructor</p>
//                                         </div>
//                                     </div>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <CardTitle className="text-xl">Your Ascent</CardTitle>
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-300 font-mono mb-2">
//                                             <span>{completedLessons} / {totalLessons} Lessons</span>
//                                             <span className="font-bold">{Math.round(courseProgress)}%</span>
//                                         </div>
//                                         <Progress value={courseProgress} />
//                                     </div>
//                                     <p className="text-xs text-slate-500 text-center pt-2">
//                                         Keep pushing forward. Every lesson completed is another step towards your zenith.
//                                     </p>
//                                 </CardContent>
//                             </GlassCard>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default StudentCoursePage;
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   StudentCoursePage.tsx (UPDATED for CoreZenith)
//  * =================================================================
//  * DESCRIPTION: This is the focused learning view for a student's
//  * course. It extends the CoreZenith theme to create an immersive
//  * and motivational learning path, visualizing the curriculum as a
//  * tangible journey.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as AvatarPrimitive from "@radix-ui/react-avatar";
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // CoreZenith UI Components & Icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ChevronLeft, CheckCircle, Circle, Target } from 'lucide-react';

// // --- CoreZenith UI Primitives (Styled for the theme) ---

// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card 
//         className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
//         {...props} 
//     />
// );

// const Avatar = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Root
//     ref={ref}
//     className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-600", className)}
//     {...props}
//   />
// ));
// Avatar.displayName = AvatarPrimitive.Root.displayName;

// const AvatarImage = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Image>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
// ));
// AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// const AvatarFallback = React.forwardRef<
//   React.ElementRef<typeof AvatarPrimitive.Fallback>,
//   React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
// >(({ className, ...props }, ref) => (
//   <AvatarPrimitive.Fallback
//     ref={ref}
//     className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-slate-400", className)}
//     {...props}
//   />
// ));
// AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// const Progress = React.forwardRef<
//   React.ElementRef<typeof ProgressPrimitive.Root>,
//   React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
// >(({ className, value, ...props }, ref) => (
//   <ProgressPrimitive.Root
//     ref={ref}
//     className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800", className)}
//     {...props}
//   >
//     <ProgressPrimitive.Indicator
//       className="h-full w-full flex-1 bg-cyan-400 transition-all duration-500 ease-out"
//       style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
//     />
//   </ProgressPrimitive.Root>
// ));
// Progress.displayName = ProgressPrimitive.Root.displayName;


// // --- Type Definitions (from original file) ---
// interface CurriculumLesson extends Lesson { is_completed: boolean; }
// interface StudentCourseView extends Course {
//     teacher_name: string;
//     lessons: CurriculumLesson[];
// }

// // --- Main Component ---
// const StudentCoursePage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<StudentCourseView | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     // NOTE: All data fetching and state logic is preserved
//     useEffect(() => {
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) { navigate('/login'); return; }
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/students/my-courses/${courseId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     throw new Error((await response.json()).error || 'Failed to fetch course details.');
//                 }
//                 setCourse(await response.json());
//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourse();
//     }, [courseId, navigate]);

//     const renderLoadingState = () => (
//         <div className="flex items-center justify-center h-full">
//             <p className="text-gray-400 text-lg">Loading Learning Path...</p>
//         </div>
//     );
    
//     const renderErrorState = () => (
//         <div className="flex items-center justify-center h-full">
//             <p className="text-red-400">{error}</p>
//         </div>
//     );

//     if (!course && (isLoading || error)) {
//         return (
//             <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//                  <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
//                  <main className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)]">
//                     {isLoading ? renderLoadingState() : renderErrorState()}
//                  </main>
//             </div>
//         )
//     }
    
//     if (!course) return null; // Should be handled by loading/error states

//     const completedLessons = course.lessons.filter(l => l.is_completed).length;
//     const totalLessons = course.lessons.length;
//     const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

//     return (
//         <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans">
//             {/* Background decorative grid */}
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             {/* Main Content Area */}
//             <main className="relative z-10 p-4 sm:p-6 lg:p-8">
//                 <div className="max-w-6xl mx-auto">
//                     <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-8 text-gray-400 hover:bg-slate-800 hover:text-white">
//                         <ChevronLeft className="mr-2 h-4 w-4" />
//                         Back to Dashboard
//                     </Button>

//                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
//                         {/* Left Column: Curriculum */}
//                         <div className="lg:col-span-2">
//                             <header className="mb-8">
//                                 <p className="text-cyan-400 font-semibold tracking-wide">COURSE</p>
//                                 <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mt-2">{course.title}</h1>
//                                 <p className="text-lg text-gray-400 mt-4 max-w-3xl">{course.description}</p>
//                             </header>
                            
//                             <GlassCard>
//                                 <CardHeader>
//                                     <CardTitle className="text-2xl flex items-center gap-3">
//                                         <Target className="text-cyan-400/80"/>
//                                         Learning Path
//                                     </CardTitle>
//                                 </CardHeader>
//                                 <CardContent className="pt-2">
//                                     <ul className="space-y-1">
//                                         {course.lessons.map((lesson, index) => (
//                                             <li key={lesson.id} className="relative pl-8">
//                                                 {/* Connecting Line */}
//                                                 {index !== course.lessons.length - 1 && (
//                                                     <div className="absolute left-[15px] top-5 h-full w-px bg-slate-700"></div>
//                                                 )}
                                                
//                                                 {/* Status Icon */}
//                                                 <div className="absolute left-0 top-3">
//                                                     {lesson.is_completed ? (
//                                                         <CheckCircle className="h-5 w-5 text-cyan-400" />
//                                                     ) : (
//                                                         <Circle className="h-5 w-5 text-slate-600" />
//                                                     )}
//                                                 </div>

//                                                 <button 
//                                                     onClick={() => navigate(`/lesson/${lesson.id}`)}
//                                                     className="w-full text-left p-3 rounded-md hover:bg-slate-800/60 transition-colors duration-200"
//                                                 >
//                                                     <span className="text-lg font-medium text-gray-200 hover:text-white">{lesson.title}</span>
//                                                     <p className="text-gray-400 text-sm">{lesson.description}</p>
//                                                 </button>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </CardContent>
//                             </GlassCard>
//                         </div>

//                         {/* Right Column: Progress Card */}
//                         <div className="lg:col-span-1">
//                             <GlassCard className="sticky top-24">
//                                 <CardHeader>
//                                     <div className="flex items-center gap-4">
//                                         <Avatar>
//                                             <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} alt={course.teacher_name} />
//                                             <AvatarFallback>{course.teacher_name.slice(0, 2).toUpperCase()}</AvatarFallback>
//                                         </Avatar>
//                                         <div>
//                                             <p className="font-bold text-lg text-white">{course.teacher_name}</p>
//                                             <p className="text-sm text-gray-400">Instructor</p>
//                                         </div>
//                                     </div>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <CardTitle className="text-xl">Your Ascent</CardTitle>
//                                     <div>
//                                         <div className="flex justify-between text-sm text-gray-300 font-mono mb-2">
//                                             <span>{completedLessons} / {totalLessons} Lessons</span>
//                                             <span className="font-bold">{Math.round(courseProgress)}%</span>
//                                         </div>
//                                         <Progress value={courseProgress} />
//                                     </div>
//                                     <p className="text-xs text-slate-500 text-center pt-2">
//                                         Keep pushing forward. Every lesson completed is another step towards your zenith.
//                                     </p>
//                                 </CardContent>
//                             </GlassCard>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default StudentCoursePage;

// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   StudentCoursePage.tsx (V2.2 - Component Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version corrects the import errors for Avatar
//  * and Progress components by including their source code directly.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';
// import * as AvatarPrimitive from "@radix-ui/react-avatar";
// import * as ProgressPrimitive from "@radix-ui/react-progress";
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { ChevronLeft, CheckCircle, Circle } from 'lucide-react';

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


// // Define a type for a lesson with a completion status
// interface CurriculumLesson extends Lesson {
//     is_completed: boolean;
// }

// // Define a type for the detailed course view for a student
// interface StudentCourseView extends Course {
//     teacher_name: string;
//     lessons: CurriculumLesson[];
// }

// const StudentCoursePage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<StudentCourseView | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         // This now makes a live API call to the backend.
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token || !courseId) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch(`http://localhost:5000/api/students/my-courses/${courseId}`, {
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

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     const completedLessons = course.lessons.filter(l => l.is_completed).length;
//     const totalLessons = course.lessons.length;
//     const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Course Curriculum</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-1">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id}>
//                                             <button 
//                                                 onClick={() => navigate(`/lesson/${lesson.id}`)}
//                                                 className="w-full flex items-center p-3 rounded-md hover:bg-accent transition-colors text-left"
//                                             >
//                                                 {lesson.is_completed ? (
//                                                     <CheckCircle className="h-5 w-5 text-green-500 mr-4 flex-shrink-0" />
//                                                 ) : (
//                                                     <Circle className="h-5 w-5 text-gray-300 mr-4 flex-shrink-0" />
//                                                 )}
//                                                 <span className="text-gray-800 font-medium">{lesson.title}</span>
//                                             </button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Progress Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                  <div className="flex items-center gap-4 mb-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                                 <CardTitle>Your Progress</CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div>
//                                     <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                         <span>{completedLessons} / {totalLessons} Lessons</span>
//                                         <span>{Math.round(courseProgress)}%</span>
//                                     </div>
//                                     <Progress value={courseProgress} />
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default StudentCoursePage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   StudentCoursePage.tsx
//  * =================================================================
//  * DESCRIPTION: This new page is the student's main learning hub for a
//  * single course. It displays the curriculum and the student's progress.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import type { Course, Lesson } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Progress } from "@/components/ui/progress";
// import { ChevronLeft, CheckCircle, Circle } from 'lucide-react';

// // Define a type for a lesson with a completion status
// interface CurriculumLesson extends Lesson {
//     is_completed: boolean;
// }

// // Define a type for the detailed course view for a student
// interface StudentCourseView extends Course {
//     teacher_name: string;
//     lessons: CurriculumLesson[];
// }

// const StudentCoursePage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();

//     const [course, setCourse] = useState<StudentCourseView | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         // MOCK DATA: Using mock data until the backend is ready.
//         const fetchStudentCourseView = () => {
//             const mockCourse: StudentCourseView = {
//                 id: courseId || '1',
//                 title: 'Introduction to JavaScript',
//                 description: 'Master the fundamentals of JavaScript, from variables to asynchronous programming.',
//                 teacher_name: 'Alice Johnson',
//                 student_count: 34,
//                 lesson_count: 3,
//                 lessons: [
//                     { id: '101', title: 'Variables and Data Types', description: 'Learn about let, const, and var.', is_completed: true, course_id: '1', teacher_id: '', created_at:'', files:[] },
//                     { id: '102', title: 'Functions and Scope', description: 'Understand how functions work in JavaScript.', is_completed: true, course_id: '1', teacher_id: '', created_at:'', files:[] },
//                     { id: '103', title: 'Asynchronous JavaScript with Promises', description: 'Handle async operations with ease.', is_completed: false, course_id: '1', teacher_id: '', created_at:'', files:[] },
//                 ]
//             };
//             setCourse(mockCourse);
//             setIsLoading(false);
//         };
//         fetchStudentCourseView();
        
//         /*
//         // TODO: Replace mock data with API call
//         const fetchCourse = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/students/my-courses/${courseId}`, {
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

//     if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
//     if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
//     if (!course) return <div className="p-8 text-center">Course not found.</div>;

//     const completedLessons = course.lessons.filter(l => l.is_completed).length;
//     const totalLessons = course.lessons.length;
//     const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {/* Left Column: Curriculum */}
//                     <div className="md:col-span-2">
//                         <header className="mb-6">
//                             <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
//                             <p className="text-lg text-gray-600 mt-2">{course.description}</p>
//                         </header>
                        
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Course Curriculum</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <ul className="space-y-1">
//                                     {course.lessons.map(lesson => (
//                                         <li key={lesson.id}>
//                                             <button 
//                                                 onClick={() => navigate(`/lesson/${lesson.id}`)}
//                                                 className="w-full flex items-center p-3 rounded-md hover:bg-accent transition-colors text-left"
//                                             >
//                                                 {lesson.is_completed ? (
//                                                     <CheckCircle className="h-5 w-5 text-green-500 mr-4 flex-shrink-0" />
//                                                 ) : (
//                                                     <Circle className="h-5 w-5 text-gray-300 mr-4 flex-shrink-0" />
//                                                 )}
//                                                 <span className="text-gray-800 font-medium">{lesson.title}</span>
//                                             </button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: Progress Card */}
//                     <div className="md:col-span-1">
//                         <Card className="sticky top-8">
//                             <CardHeader>
//                                  <div className="flex items-center gap-4 mb-4">
//                                     <Avatar>
//                                         <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${course.teacher_name}`} />
//                                         <AvatarFallback>{course.teacher_name.charAt(0)}</AvatarFallback>
//                                     </Avatar>
//                                     <div>
//                                         <p className="font-semibold">{course.teacher_name}</p>
//                                         <p className="text-xs text-muted-foreground">Instructor</p>
//                                     </div>
//                                 </div>
//                                 <CardTitle>Your Progress</CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div>
//                                     <div className="flex justify-between text-sm text-gray-500 mb-1">
//                                         <span>{completedLessons} / {totalLessons} Lessons</span>
//                                         <span>{Math.round(courseProgress)}%</span>
//                                     </div>
//                                     <Progress value={courseProgress} />
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default StudentCoursePage;