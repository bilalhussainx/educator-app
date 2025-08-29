
// MVP
// FILE: src/pages/CourseEditorPage.tsx (Definitive, No-DND, Fully Functional)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useDebounce } from '../hooks/useDebounce'; // You will need to create this simple custom hook

// --- UI IMPORTS ---
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import { Search, Plus, Sparkles, Trash2, Eye, ChevronLeft, Loader2, BookCopy } from 'lucide-react';
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface IngestedLesson {
    id: string;
    title: string;
    description: string;
    lesson_type: 'algorithmic' | 'frontend-project';
    chapter: string | null;
    sub_chapter: string | null;
}
interface CourseLesson {
    id: string; // The unique ID from the `lessons` table
    title: string;
    order_index: number;
}

// --- REUSABLE & STYLED COMPONENTS ---
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white flex flex-col", className)} {...props} />
);

// --- MAIN PAGE COMPONENT ---
const CourseEditorPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    
    const [libraryLessons, setLibraryLessons] = useState<IngestedLesson[]>([]);
    const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSorting, setIsSorting] = useState(false);
    const [isAddingMap, setIsAddingMap] = useState<Record<string, boolean>>({});
    const [courseTitle, setCourseTitle] = useState('');
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // --- DATA FETCHING ---
    const fetchCourseData = useCallback(async () => {
        if (!courseId) return;
        try {
            const courseRes = await apiClient.get(`/api/courses/${courseId}`);
            setCourseTitle(courseRes.data.title);
            setCourseLessons(courseRes.data.lessons.sort((a: CourseLesson, b: CourseLesson) => a.order_index - b.order_index));
        } catch (error) {
            toast.error("Failed to load course data.");
            navigate('/dashboard');
        }
    }, [courseId, navigate]);

    useEffect(() => {
        const fetchLibraryData = async () => {
            try {
                const libraryRes = await apiClient.get(`/api/library/search?language=javascript&searchTerm=${debouncedSearchTerm}`);
                setLibraryLessons(libraryRes.data);
            } catch (error) {
                toast.error("Failed to load lesson library.");
            }
        };
        fetchLibraryData();
    }, [debouncedSearchTerm]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            await fetchCourseData();
            setIsLoading(false);
        };
        fetchInitialData();
    }, [courseId, fetchCourseData]);

    // --- HANDLERS ---
    const handleAddLesson = async (lessonToAdd: IngestedLesson) => {
        setIsAddingMap(prev => ({ ...prev, [lessonToAdd.id]: true }));
        try {
            await apiClient.post(`/api/lessons/add-to-course/${courseId}`, { ingestedLessonId: lessonToAdd.id });
            await fetchCourseData(); // Re-sync with the database
            toast.success(`"${lessonToAdd.title}" added to course.`);
        } catch (error) {
            toast.error("Failed to add lesson.");
        } finally {
            setIsAddingMap(prev => ({ ...prev, [lessonToAdd.id]: false }));
        }
    };

    const handleRemoveLesson = async (lessonIdToRemove: string) => {
        const originalLessons = [...courseLessons];
        setCourseLessons(prev => prev.filter(l => l.id !== lessonIdToRemove));
        try {
            await apiClient.delete(`/api/lessons/${lessonIdToRemove}`);
            await fetchCourseData();
            toast.success("Lesson removed.");
        } catch (error) {
            toast.error("Failed to remove lesson.");
            setCourseLessons(originalLessons);
        }
    };
    
    const handleSortWithAI = async () => {
        if (!courseId) return;
        setIsSorting(true);
        toast.promise(
            apiClient.post(`/api/courses/${courseId}/sort-with-ai`),
            {
                loading: 'AI is organizing your curriculum...',
                success: async (res) => { await fetchCourseData(); return res.data.message; },
                error: (err) => err.response?.data?.error || 'AI sorting failed.',
                finally: () => setIsSorting(false),
            }
        );
    };

    const handlePreviewLesson = (lessonId: string) => {
        // This function now correctly opens the lesson viewer in a new tab.
        // It works for lessons both in the library (using ingested_id) and in the course.
        window.open(`/lesson/${lessonId}`, '_blank');
    };

    const handleCreateNewLesson = () => {
        // This navigates the teacher to your powerful "Lesson Foundry".
        navigate(`/lessons/new?courseId=${courseId}`);
    };

    const courseLessonTitles = useMemo(() => new Set(courseLessons.map(l => l.title)), [courseLessons]);

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0a091a] text-white">Loading Curriculum Studio...</div>;
    }

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
            <Toaster theme="dark" richColors position="top-right" />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-slate-400 hover:bg-slate-800"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
                    <h1 className="text-4xl font-bold tracking-tighter text-white">{courseTitle}</h1>
                    <p className="text-lg text-slate-400 mt-2">Curriculum Design Studio</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookCopy /> Lesson Library</CardTitle>
                            <CardDescription>Search the library and add pre-built lessons to your course.</CardDescription>
                            <div className="relative pt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input placeholder="Search by title, keyword, or chapter..." className="pl-10 bg-slate-950/60 border-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
                            <ul className="space-y-3">
                                {libraryLessons.filter(l => !courseLessonTitles.has(l.title)).map(lesson => (
                                    <li key={lesson.id} className="p-3 border border-slate-700/60 bg-slate-800/30 rounded-lg flex justify-between items-center gap-3">
                                        <div className="flex-grow min-w-0">
                                            <h4 className="font-medium text-slate-200 truncate">{lesson.title}</h4>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {lesson.chapter && <Badge variant="secondary">{lesson.chapter}</Badge>}
                                                {lesson.sub_chapter && <Badge variant="outline">{lesson.sub_chapter}</Badge>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 flex-shrink-0">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview Lesson" onClick={() => handlePreviewLesson(lesson.id)}><Eye className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="outline" className="h-7 w-7 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200" title="Add Lesson to Course" onClick={() => handleAddLesson(lesson)} disabled={isAddingMap[lesson.id]}>
                                                {isAddingMap[lesson.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </GlassCard>

                    <GlassCard>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Course Blueprint ({courseLessons.length} lessons)</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button onClick={handleCreateNewLesson} variant="outline" size="sm" className="h-8"><Plus className="mr-2 h-4 w-4" />Create New</Button>
                                    <Button onClick={handleSortWithAI} disabled={isSorting || courseLessons.length < 2} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold h-8">
                                        {isSorting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                        Organize with AI
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>Review the lessons in your course.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
                            <ul className="space-y-2">
                                {courseLessons.map(lesson => (
                                    <li key={lesson.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm text-slate-500">{String(lesson.order_index + 1).padStart(2, '0')}</span>
                                            <span className="font-medium text-slate-200">{lesson.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview Lesson" onClick={() => handlePreviewLesson(lesson.id)}><Eye className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-red-500/10 hover:text-red-400" title="Remove Lesson" onClick={() => handleRemoveLesson(lesson.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {courseLessons.length === 0 && <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl"><p className="text-slate-400">Your course is empty.</p><p className="text-sm text-slate-500 mt-1">Add lessons from the library to begin.</p></div>}
                        </CardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
export default CourseEditorPage;
// MVP
// // FILE: src/pages/CourseEditorPage.tsx (Definitive, Corrected Version)
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import apiClient from '../services/apiClient';
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

// // --- UI IMPORTS ---
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Toaster, toast } from 'sonner';
// import { Search, Plus, Sparkles, Trash2, GripVertical, Eye, ChevronLeft, Loader2 } from 'lucide-react';
// import { cn } from "@/lib/utils";

// // --- TYPE DEFINITIONS ---
// interface IngestedLesson {
//     id: string;
//     title: string;
//     description: string;
//     lesson_type: 'algorithmic' | 'frontend-project';
// }
// interface CourseLesson {
//     id: string;
//     title: string;
//     order_index: number;
//     lesson_type: 'algorithmic' | 'frontend-project';
// }

// // --- REUSABLE & STYLED COMPONENTS ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white flex flex-col", className)} {...props} />
// );


// // --- DRAGGABLE LESSON ITEM COMPONENT ---
// const SortableLessonItem = ({ lesson, onRemove, onPreview }: { lesson: CourseLesson, onRemove: (id: string) => void, onPreview: (id: string) => void }) => {
//     const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
//     const style = { transform: CSS.Transform.toString(transform), transition };
    
//     return (
//         <div ref={setNodeRef} style={style} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between gap-2">
//             <div className="flex items-center gap-3">
//                 <GripVertical {...attributes} {...listeners} className="h-5 w-5 text-slate-500 cursor-grab" />
//                 <span className="font-mono text-sm text-slate-500">{String(lesson.order_index + 1).padStart(2, '0')}</span>
//                 <span className="font-medium text-slate-200">{lesson.title}</span>
//             </div>
//             <div className="flex items-center gap-1">
//                 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPreview(lesson.id)}><Eye className="h-4 w-4" /></Button>
//                 <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-red-500/10 hover:text-red-400" onClick={() => onRemove(lesson.id)}><Trash2 className="h-4 w-4" /></Button>
//             </div>
//         </div>
//     );
// };


// // --- MAIN PAGE COMPONENT ---
// const CourseEditorPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();
    
//     const [libraryLessons, setLibraryLessons] = useState<IngestedLesson[]>([]);
//     const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSorting, setIsSorting] = useState(false);
//     const [courseTitle, setCourseTitle] = useState('');
    
//     const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

//     const fetchCourseData = useCallback(async () => {
//         if (!courseId) return;
//         try {
//             const courseRes = await apiClient.get(`/api/courses/${courseId}`);
//             setCourseTitle(courseRes.data.title);
//             setCourseLessons(courseRes.data.lessons.sort((a: CourseLesson, b: CourseLesson) => a.order_index - b.order_index));
//         } catch (error) {
//             toast.error("Failed to load course data.");
//             navigate('/dashboard');
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             setIsLoading(true);
//             await fetchCourseData();
//             try {
//                 const libraryRes = await apiClient.get('/api/lessons/library/search?language=javascript');
//                 setLibraryLessons(libraryRes.data);
//             } catch (error) {
//                 toast.error("Failed to load lesson library.");
//             }
//             setIsLoading(false);
//         };
//         fetchInitialData();
//     }, [courseId, fetchCourseData]);

//     const handleAddLesson = async (lessonToAdd: IngestedLesson) => {
//         try {
//             const tempLesson: CourseLesson = { ...lessonToAdd, order_index: courseLessons.length };
//             setCourseLessons(prev => [...prev, tempLesson]);
//             await apiClient.post(`/api/lessons/add-to-course/${courseId}`, { ingestedLessonId: lessonToAdd.id });
//             await fetchCourseData();
//             toast.success(`"${lessonToAdd.title}" added to course.`);
//         } catch (error) {
//             toast.error("Failed to add lesson.");
//             setCourseLessons(prev => prev.filter(l => l.id !== lessonToAdd.id));
//         }
//     };

//     const handleRemoveLesson = async (lessonIdToRemove: string) => {
//         const originalLessons = [...courseLessons];
//         setCourseLessons(prev => prev.filter(l => l.id !== lessonIdToRemove));
//         try {
//             await apiClient.delete(`/api/lessons/${lessonIdToRemove}`);
//             toast.success("Lesson removed.");
//         } catch (error) {
//             toast.error("Failed to remove lesson.");
//             setCourseLessons(originalLessons);
//         }
//     };
    
//     const handleSortWithAI = async () => {
//         if (!courseId) return;
//         setIsSorting(true);
//         toast.promise(
//             apiClient.post(`/api/courses/${courseId}/sort-with-ai`),
//             {
//                 loading: 'AI is organizing your curriculum...',
//                 success: async (res) => {
//                     await fetchCourseData();
//                     return res.data.message;
//                 },
//                 error: (err) => err.response?.data?.error || 'AI sorting failed. Please try again.',
//                 finally: () => setIsSorting(false),
//             }
//         );
//     };

//     const handleDragEnd = (event: DragEndEvent) => {
//         const { active, over } = event;
//         if (over && active.id !== over.id) {
//             setCourseLessons((items) => {
//                 const oldIndex = items.findIndex(item => item.id === active.id);
//                 const newIndex = items.findIndex(item => item.id === over.id);
//                 const newOrder = arrayMove(items, oldIndex, newIndex);
//                 return newOrder.map((item: CourseLesson, index: number) => ({ ...item, order_index: index }));
//             });
//         }
//     };

//     const handlePreviewLesson = (lessonId: string) => {
//         window.open(`/lesson/${lessonId}`, '_blank');
//     };

//     const filteredLibrary = useMemo(() => libraryLessons.filter(lesson =>
//         (lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//          lesson.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
//         !courseLessons.some(cl => cl.title === lesson.title)
//     ), [libraryLessons, courseLessons, searchTerm]);

//     if (isLoading) {
//         return <div className="h-screen w-full flex items-center justify-center bg-[#0a091a] text-white">Loading Curriculum Studio...</div>;
//     }

//     return (
//         <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="container mx-auto p-4 sm:p-6 lg:p-8">
//                 <header className="mb-8">
//                     <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-slate-400 hover:bg-slate-800">
//                         <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
//                     </Button>
//                     <h1 className="text-4xl font-bold tracking-tighter text-white">{courseTitle}</h1>
//                     <p className="text-lg text-slate-400 mt-2">Curriculum Design Studio</p>
//                 </header>

//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
//                     <GlassCard>
//                         <CardHeader>
//                             <CardTitle className="flex items-center gap-2"><Search /> Lesson Library</CardTitle>
//                             <CardDescription>Search and add pre-built JavaScript lessons to your course.</CardDescription>
//                             {/* <div className="relative pt-2">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//                                 <Input placeholder="Search by title or keyword (e.g., 'array', 'DOM')..." className="pl-10 bg-slate-950/60 border-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//                             </div> */}
//                             <form onSubmit={(e) => {
//                                     e.preventDefault(); // Prevents the page from reloading
//                                     // We can add a function here to manually trigger the search if needed,
//                                     // but the live filtering is already happening. This just makes "Enter" work.
//                                     console.log("Search submitted for:", searchTerm);
//                                 }}>
//                                     <div className="relative pt-2">
//                                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//                                         <Input 
//                                             placeholder="Search by title or keyword (e.g., 'array', 'DOM')..." 
//                                             className="pl-10 bg-slate-950/60 border-slate-700"
//                                             value={searchTerm}
//                                             onChange={e => setSearchTerm(e.target.value)}
//                                         />
//                                     </div>
//                                 </form>
//                         </CardHeader>
//                         <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
//                             <ul className="space-y-2">
//                                 {filteredLibrary.map(lesson => (
//                                     <li key={lesson.id} className="p-3 border border-slate-700/60 bg-slate-800/30 rounded-lg flex justify-between items-start gap-3">
//                                         <div className="flex-grow">
//                                             <h4 className="font-medium text-slate-200">{lesson.title}</h4>
//                                             <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lesson.description}</p>
//                                         </div>
//                                         <Button size="sm" variant="outline" className="flex-shrink-0 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200" onClick={() => handleAddLesson(lesson)}>
//                                             <Plus className="h-4 w-4" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </GlassCard>

//                     <GlassCard>
//                         <CardHeader>
//                             <div className="flex justify-between items-center">
//                                 <CardTitle className="flex items-center gap-2">Course Blueprint</CardTitle>
//                                 <Button onClick={handleSortWithAI} disabled={isSorting || courseLessons.length < 2} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold">
//                                     {isSorting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
//                                     Organize with AI
//                                 </Button>
//                             </div>
//                             <CardDescription>Drag and drop to manually reorder, or let AI create the optimal learning path.</CardDescription>
//                         </CardHeader>
//                         <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
//                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                                 <SortableContext items={courseLessons} strategy={verticalListSortingStrategy}>
//                                     <ul className="space-y-2">
//                                         {courseLessons.map(lesson => (
//                                             <SortableLessonItem key={lesson.id} lesson={lesson} onRemove={handleRemoveLesson} onPreview={handlePreviewLesson} />
//                                         ))}
//                                     </ul>
//                                 </SortableContext>
//                             </DndContext>
//                             {courseLessons.length === 0 && (
//                                 <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
//                                     <p className="text-slate-400">Your course is empty.</p>
//                                     <p className="text-sm text-slate-500 mt-1">Add lessons from the library to begin.</p>
//                                 </div>
//                             )}
                            
//                         </CardContent>
//                     </GlassCard>
//                 </div>
                 
//             </div>
//         </div>

//     );
// };

// export default CourseEditorPage;
// // FILE: src/pages/CourseEditorPage.tsx (Definitive, UX-Focused Version)
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import apiClient from '../services/apiClient';
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

// // --- UI IMPORTS ---
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Toaster, toast } from 'sonner';
// import { Search, Plus, Sparkles, Trash2, GripVertical, Eye, ChevronLeft, Loader2 } from 'lucide-react';
// import { cn } from "@/lib/utils";

// // --- TYPE DEFINITIONS ---
// interface IngestedLesson {
//     id: string;
//     title: string;
//     description: string;
//     lesson_type: 'algorithmic' | 'frontend-project';
// }
// interface CourseLesson {
//     id: string;
//     title: string;
//     order_index: number;
//     lesson_type: 'algorithmic' | 'frontend-project';
// }

// // --- REUSABLE & STYLED COMPONENTS ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white flex flex-col", className)} {...props} />
// );

// // --- DRAGGABLE LESSON ITEM COMPONENT ---
// const SortableLessonItem = ({ lesson, onRemove, onPreview }: { lesson: CourseLesson, onRemove: (id: string) => void, onPreview: (id: string) => void }) => {
//     const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
//     const style = { transform: CSS.Transform.toString(transform), transition };
    
//     return (
//         <div ref={setNodeRef} style={style} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between gap-2">
//             <div className="flex items-center gap-3">
//                 <GripVertical {...attributes} {...listeners} className="h-5 w-5 text-slate-500 cursor-grab" />
//                 <span className="font-mono text-sm text-slate-500">{String(lesson.order_index + 1).padStart(2, '0')}</span>
//                 <span className="font-medium text-slate-200">{lesson.title}</span>
//             </div>
//             <div className="flex items-center gap-1">
//                 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPreview(lesson.id)}><Eye className="h-4 w-4" /></Button>
//                 <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-red-500/10 hover:text-red-400" onClick={() => onRemove(lesson.id)}><Trash2 className="h-4 w-4" /></Button>
//             </div>
//         </div>
//     );
// };


// // --- MAIN PAGE COMPONENT ---
// const CourseEditorPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
//     const navigate = useNavigate();
    
//     const [libraryLessons, setLibraryLessons] = useState<IngestedLesson[]>([]);
//     const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSorting, setIsSorting] = useState(false);
//     const [courseTitle, setCourseTitle] = useState('');
    
//     const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

//     const fetchCourseData = useCallback(async () => {
//         if (!courseId) return;
//         try {
//             const courseRes = await apiClient.get(`/api/courses/${courseId}`);
//             setCourseTitle(courseRes.data.title);
//             setCourseLessons(courseRes.data.lessons.sort((a: CourseLesson, b: CourseLesson) => a.order_index - b.order_index));
//         } catch (error) {
//             toast.error("Failed to load course data.");
//             navigate('/dashboard');
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             setIsLoading(true);
//             await fetchCourseData();
//             try {
//                 const libraryRes = await apiClient.get('/api/lessons/library/search?language=javascript');
//                 setLibraryLessons(libraryRes.data);
//             } catch (error) {
//                 toast.error("Failed to load lesson library.");
//             }
//             setIsLoading(false);
//         };
//         fetchInitialData();
//     }, [courseId, fetchCourseData]);

//     const handleAddLesson = async (lessonToAdd: IngestedLesson) => {
//         try {
//             // Optimistic UI update
//             const tempLesson: CourseLesson = { ...lessonToAdd, order_index: courseLessons.length };
//             setCourseLessons(prev => [...prev, tempLesson]);

//             await apiClient.post(`/api/lessons/add-to-course/${courseId}`, { ingestedLessonId: lessonToAdd.id });
//             await fetchCourseData(); // Re-sync with the database
//             toast.success(`"${lessonToAdd.title}" added to course.`);
//         } catch (error) {
//             toast.error("Failed to add lesson.");
//             setCourseLessons(prev => prev.filter(l => l.id !== lessonToAdd.id)); // Rollback optimistic update
//         }
//     };

//     const handleRemoveLesson = async (lessonIdToRemove: string) => {
//         const originalLessons = [...courseLessons];
//         setCourseLessons(prev => prev.filter(l => l.id !== lessonIdToRemove));
//         try {
//             await apiClient.delete(`/api/lessons/${lessonIdToRemove}`); // Assumes this endpoint exists
//             toast.success("Lesson removed.");
//         } catch (error) {
//             toast.error("Failed to remove lesson.");
//             setCourseLessons(originalLessons); // Rollback
//         }
//     };
    
//     const handleSortWithAI = async () => {
//         if (!courseId) return;
//         setIsSorting(true);
//         toast.promise(
//             apiClient.post(`/api/courses/${courseId}/sort-with-ai`),
//             {
//                 loading: 'AI is organizing your curriculum...',
//                 success: async (res) => {
//                     await fetchCourseData();
//                     return res.data.message;
//                 },
//                 error: (err) => err.response?.data?.error || 'AI sorting failed. Please try again.',
//                 finally: () => setIsSorting(false),
//             }
//         );
//     };

//     const handleDragEnd = (event: DragEndEvent) => {
//         const { active, over } = event;
//         if (over && active.id !== over.id) {
//             setCourseLessons((items) => {
//                 const oldIndex = items.findIndex(item => item.id === active.id);
//                 const newIndex = items.findIndex(item => item.id === over.id);
//                 const newOrder = arrayMove(items, oldIndex, newIndex);
//                 // Update order_index for the UI before saving
//                 return  newOrder.map((item: CourseLesson, index: number) => ({ ...item, order_index: index }));
//             });
//             // Here you would call a backend endpoint to save the new manual order
//             // toast.info("Manual order saved.");
//         }
//     };



//     const filteredLibrary = useMemo(() => libraryLessons.filter(lesson =>
//         (lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//          lesson.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
//         !courseLessons.some(cl => cl.title === lesson.title)
//     ), [libraryLessons, courseLessons, searchTerm]);

//     if (isLoading) {
//         return <div className="h-screen w-full flex items-center justify-center bg-[#0a091a] text-white">Loading Curriculum Studio...</div>;
//     }

//     return (
//         <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
//             <Toaster theme="dark" richColors position="top-right" />
//             <div className="container mx-auto p-4 sm:p-6 lg:p-8">
//                 <header className="mb-8">
//                     <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-slate-400 hover:bg-slate-800">
//                         <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
//                     </Button>
//                     <h1 className="text-4xl font-bold tracking-tighter text-white">{courseTitle}</h1>
//                     <p className="text-lg text-slate-400 mt-2">Curriculum Design Studio</p>
//                 </header>

//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
//                     <GlassCard>
//                         <CardHeader>
//                             <CardTitle className="flex items-center gap-2"><Search /> Lesson Library</CardTitle>
//                             <CardDescription>Search and add pre-built JavaScript lessons to your course.</CardDescription>
//                             <div className="relative pt-2">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//                                 <Input placeholder="Search by title or keyword (e.g., 'array', 'DOM')..." className="pl-10 bg-slate-950/60 border-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//                             </div>
//                         </CardHeader>
//                         <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
//                             <ul className="space-y-2">
//                                 {filteredLibrary.map(lesson => (
//                                     <li key={lesson.id} className="p-3 border border-slate-700/60 bg-slate-800/30 rounded-lg flex justify-between items-start gap-3">
//                                         <div className="flex-grow">
//                                             <h4 className="font-medium text-slate-200">{lesson.title}</h4>
//                                             <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lesson.description}</p>
//                                         </div>
//                                         <Button size="sm" variant="outline" className="flex-shrink-0 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200" onClick={() => handleAddLesson(lesson)}>
//                                             <Plus className="h-4 w-4" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </GlassCard>

//                     <GlassCard>
//                         <CardHeader>
//                             <div className="flex justify-between items-center">
//                                 <CardTitle className="flex items-center gap-2">Course Blueprint</CardTitle>
//                                 <Button onClick={handleSortWithAI} disabled={isSorting || courseLessons.length < 2} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold">
//                                     {isSorting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
//                                     Organize with AI
//                                 </Button>
//                             </div>
//                             <CardDescription>Drag and drop to manually reorder, or let AI create the optimal learning path.</CardDescription>
//                         </CardHeader>
//                         <CardContent className="flex-grow max-h-[60vh] overflow-y-auto pr-3">
//                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                                 <SortableContext items={courseLessons} strategy={verticalListSortingStrategy}>
//                                     <ul className="space-y-2">
//                                         {courseLessons.map(lesson => (
//                                             <SortableLessonItem key={lesson.id} lesson={lesson} onRemove={handleRemoveLesson} onPreview={handlePreviewLesson} />
//                                         ))}
//                                     </ul>
//                                 </SortableContext>
//                             </DndContext>
//                             {courseLessons.length === 0 && (
//                                 <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
//                                     <p className="text-slate-400">Your course is empty.</p>
//                                     <p className="text-sm text-slate-500 mt-1">Add lessons from the library to begin.</p>
//                                 </div>
//                             )}
//                         </CardContent>
//                     </GlassCard>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CourseEditorPage;
// // FILE: src/pages/CourseEditorPage.tsx
// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import apiClient from '../services/apiClient';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { toast } from 'sonner';
// import { Search, Plus, Sparkles } from 'lucide-react';

// // Define types for this page
// interface IngestedLesson {
//     id: string;
//     title: string;
//     description: string;
// }

// interface CourseLesson {
//     id: string;
//     title: string;
//     order_index: number;
// }

// const CourseEditorPage: React.FC = () => {
//     const { courseId } = useParams<{ courseId: string }>();
    
//     const [libraryLessons, setLibraryLessons] = useState<IngestedLesson[]>([]);
//     const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [isSorting, setIsSorting] = useState(false);
//     const [courseTitle, setCourseTitle] = useState('');

//     // Fetch both the library of available lessons and the lessons already in the course
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!courseId) return;
//             try {
//                 // Fetch course details to get the title
//                 const courseRes = await apiClient.get(`/api/courses/${courseId}`);
//                 setCourseTitle(courseRes.data.title);
//                 setCourseLessons(courseRes.data.lessons.sort((a, b) => a.order_index - b.order_index));

//                 // Fetch the entire library of ingestible JavaScript lessons
//                 const libraryRes = await apiClient.get('/api/courses/ingested-lessons/search?language=javascript');
//                 setLibraryLessons(libraryRes.data);
//             } catch (error) {
//                 toast.error("Failed to load course editor data.");
//             }
//         };
//         fetchData();
//     }, [courseId]);

//     const handleAddLesson = async (lessonId: string) => {
//         try {
//             const response = await apiClient.post(`/api/courses/${courseId}/lessons`, { lessonId });
//             // Add the new lesson to the UI and keep it sorted
//             setCourseLessons(prev => [...prev, response.data].sort((a, b) => a.order_index - b.order_index));
//             toast.success("Lesson added to course.");
//         } catch (error) {
//             toast.error("Failed to add lesson.");
//         }
//     };

//     const handleSortWithAI = async () => {
//         if (!courseId) return;
//         setIsSorting(true);
//         toast.promise(
//             apiClient.post(`/api/courses/${courseId}/sort-with-ai`),
//             {
//                 loading: 'AI is organizing your curriculum...',
//                 success: (res) => {
//                     // Refetch the course lessons to get the new order
//                     apiClient.get(`/api/courses/${courseId}`).then(courseRes => {
//                         setCourseLessons(courseRes.data.lessons.sort((a, b) => a.order_index - b.order_index));
//                     });
//                     return res.data.message;
//                 },
//                 error: 'AI sorting failed. Please try again.',
//                 finally: () => setIsSorting(false),
//             }
//         );
//     };

//     const filteredLibrary = libraryLessons.filter(lesson =>
//         lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
//         !courseLessons.some(cl => cl.title === lesson.title) // Hide lessons already in the course
//     );

//     return (
//         <div className="container mx-auto p-8">
//             <h1 className="text-3xl font-bold mb-2">Course Editor: {courseTitle}</h1>
//             <p className="text-slate-400 mb-8">Add lessons from the library, then let our AI organize them for you.</p>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 {/* Left Panel: Lesson Library */}
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Lesson Library</CardTitle>
//                         <div className="relative mt-2">
//                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//                             <Input 
//                                 placeholder="Search for lessons..." 
//                                 className="pl-10"
//                                 value={searchTerm}
//                                 onChange={e => setSearchTerm(e.target.value)}
//                             />
//                         </div>
//                     </CardHeader>
//                     <CardContent className="max-h-[60vh] overflow-y-auto">
//                         <ul className="space-y-2">
//                             {filteredLibrary.map(lesson => (
//                                 <li key={lesson.id} className="p-2 border rounded flex justify-between items-center">
//                                     <span>{lesson.title}</span>
//                                     <Button size="sm" variant="outline" onClick={() => handleAddLesson(lesson.id)}>
//                                         <Plus className="h-4 w-4 mr-2" /> Add
//                                     </Button>
//                                 </li>
//                             ))}
//                         </ul>
//                     </CardContent>
//                 </Card>

//                 {/* Right Panel: Current Course */}
//                 <Card>
//                     <CardHeader>
//                         <div className="flex justify-between items-center">
//                             <CardTitle>Your Course Blueprint</CardTitle>
//                             <Button onClick={handleSortWithAI} disabled={isSorting || courseLessons.length < 2}>
//                                 <Sparkles className="h-4 w-4 mr-2" /> {isSorting ? 'Organizing...' : 'Organize with AI'}
//                             </Button>
//                         </div>
//                     </CardHeader>
//                     <CardContent className="max-h-[60vh] overflow-y-auto">
//                         <ul className="space-y-2">
//                             {courseLessons.map(lesson => (
//                                 <li key={lesson.id} className="p-2 border rounded bg-slate-800">
//                                     <span>{lesson.order_index + 1}. {lesson.title}</span>
//                                 </li>
//                             ))}
//                         </ul>
//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     );
// };

// export default CourseEditorPage;