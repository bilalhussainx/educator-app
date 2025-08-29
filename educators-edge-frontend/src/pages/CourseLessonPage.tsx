// FILE: src/pages/CourseLearnPage.tsx (New, Essential Student-Facing Component)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import { ChevronLeft, BookText, FileCode, Play } from 'lucide-react';
import { cn } from "@/lib/utils";

// This type must match the data structure for lessons inside a course
interface CourseItem {
    id: string;
    title: string;
    order_index: number;
    lesson_type: 'algorithmic' | 'frontend-project' | 'chapter';
}

interface CourseData {
    title: string;
    description: string;
    lessons: CourseItem[];
}

const CourseLearnPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCourseData = useCallback(async () => {
        if (!courseId) return;
        setIsLoading(true);
        try {
            // This endpoint should return the course details and its ordered list of lessons/chapters
            const res = await apiClient.get(`/api/courses/${courseId}`);
            setCourseData(res.data);
        } catch (error) {
            toast.error("Failed to load course content.");
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [courseId, navigate]);

    useEffect(() => {
        fetchCourseData();
    }, [fetchCourseData]);

    const handleStartLesson = (lessonId: string) => {
        // This is the crucial navigation that connects this page to your LessonLoaderPage
        navigate(`/lesson/${lessonId}`);
    };

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0a091a] text-white">Loading Course Path...</div>;
    }

    if (!courseData) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0a091a] text-white">Course not found.</div>;
    }

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
            <Toaster theme="dark" richColors position="top-right" />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-slate-400 hover:bg-slate-800">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    <h1 className="text-4xl font-bold tracking-tighter text-white">{courseData.title}</h1>
                    <p className="text-lg text-slate-400 mt-2">{courseData.description}</p>
                </header>
                
                <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white")}>
                    <CardHeader>
                        <CardTitle>Your Ascent Path</CardTitle>
                        <CardDescription>Complete each item in order to master the concepts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {courseData.lessons.map(item => (
                                <li key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-xl text-slate-500">{String(item.order_index + 1).padStart(2, '0')}</span>
                                        {item.lesson_type === 'chapter' 
                                            ? <span title="Chapter"><BookText className="h-6 w-6 text-cyan-400 flex-shrink-0" /></span>
                                            : <span title="Lesson"><FileCode className="h-6 w-6 text-slate-400 flex-shrink-0" /></span>
                                        }
                                        <h3 className="font-medium text-lg text-slate-200">{item.title}</h3>
                                    </div>
                                    <Button onClick={() => handleStartLesson(item.id)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                        <Play className="mr-2 h-4 w-4" /> Start
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CourseLearnPage;