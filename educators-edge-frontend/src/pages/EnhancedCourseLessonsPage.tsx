/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   EnhancedCourseLessonsPage.tsx
 * =================================================================
 * DESCRIPTION: Simple navigation page for enhanced course lessons
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { EnhancedCourse } from '../types/index';
import apiClient from '../services/apiClient';
import { cn } from "@/lib/utils";

// Import components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
    ChevronLeft,
    Play,
    BookOpen,
    Code2,
    CheckCircle,
    Circle
} from 'lucide-react';

interface Module {
    title: string;
    description: string;
    core_patterns: string[];
    lessons: {
        lessons: Array<{
            title: string;
            description: string;
            difficulty: string;
            estimated_time: string;
            completed?: boolean;
        }>;
    };
}

interface EnhancedCourseData {
    course: EnhancedCourse;
    modules: Module[];
}

// Interface for completed lessons tracking
interface CompletedLesson {
    course_id: string;
    module_index: number;
    lesson_index: number;
    lesson_title: string;
    completed: boolean;
}

const EnhancedCourseLessonsPage: React.FC = () => {
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();

    const [courseData, setCourseData] = useState<EnhancedCourseData | null>(null);
    const [completedLessons, setCompletedLessons] = useState<CompletedLesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');

    useEffect(() => {
        if (!courseId) return;
        
        const fetchCourseData = async () => {
            try {
                // Fetch course details
                const courseResponse = await apiClient.get(`/api/enhanced-courses/public/${courseId}`);
                const course = courseResponse.data;

                // Parse modules from course metadata
                const modules = course.metadata?.modules || [];

                // Fetch user's solved problems to determine completion status
                try {
                    const solvedResponse = await apiClient.get('/api/submissions/solved');
                    if (solvedResponse.data.success) {
                        const solvedProblems = solvedResponse.data.solvedProblems;

                        // Filter for this specific course and create completion map
                        const courseCompletions: CompletedLesson[] = [];

                        // Process each module and lesson to check completion
                        modules.forEach((module, moduleIndex) => {
                            module.lessons?.lessons?.forEach((lesson, lessonIndex) => {
                                // Check if this lesson has been solved
                                const isCompleted = solvedProblems.some((solved: any) =>
                                    solved.course_id === courseId &&
                                    solved.module_index === moduleIndex &&
                                    solved.lesson_index === lessonIndex &&
                                    solved.is_solved === true
                                );

                                courseCompletions.push({
                                    course_id: courseId,
                                    module_index: moduleIndex,
                                    lesson_index: lessonIndex,
                                    lesson_title: lesson.title,
                                    completed: isCompleted
                                });
                            });
                        });

                        setCompletedLessons(courseCompletions);
                    }
                } catch (submissionError) {
                    console.warn('Could not fetch submission data:', submissionError);
                    // Continue without completion data
                }

                setCourseData({ course, modules });
            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to load course data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId]);

    // Helper function to check if a lesson is completed
    const isLessonCompleted = (moduleIndex: number, lessonIndex: number): boolean => {
        return completedLessons.some(completed =>
            completed.module_index === moduleIndex &&
            completed.lesson_index === lessonIndex &&
            completed.completed
        );
    };

    const handleStartLesson = (moduleIndex: number, lessonIndex: number) => {
        if (!courseId) return;
        
        // Navigate to AscentIDE with lesson parameters
        navigate(`/enhanced-courses/${courseId}/ide?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${selectedLanguage}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading course lessons...</p>
                </div>
            </div>
        );
    }

    if (error || !courseData) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Failed to load course'}</p>
                    <Button onClick={() => navigate(`/enhanced-courses/${courseId}`)} variant="outline">
                        Back to Course
                    </Button>
                </div>
            </div>
        );
    }

    const { course, modules } = courseData;

    return (
        <div className="min-h-screen bg-[#0a091a] text-white">
            <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                }}></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => navigate(`/enhanced-courses/${courseId}`)} 
                            className="text-slate-300 hover:bg-slate-800"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Course
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-100">{course.title}</h1>
                            <p className="text-slate-400">Choose a lesson to continue your journey</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Language Selector */}
                        <div className="flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-slate-400" />
                            <select 
                                value={selectedLanguage} 
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="bg-slate-900/60 border border-slate-700 rounded px-3 py-1 text-white"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Modules and Lessons */}
                <div className="space-y-8">
                    {modules.map((module, moduleIndex) => (
                        <Card key={moduleIndex} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold text-slate-100 mb-2">
                                            Module {moduleIndex + 1}: {module.title}
                                        </CardTitle>
                                        <p className="text-slate-400 mb-3">{module.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {module.core_patterns?.map((pattern, index) => (
                                                <span 
                                                    key={index} 
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                                                >
                                                    {pattern}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <BookOpen className="h-6 w-6 text-cyan-400 mt-1" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {module.lessons?.lessons?.map((lesson, lessonIndex) => {
                                        const isCompleted = isLessonCompleted(moduleIndex, lessonIndex);

                                        return (
                                            <Card
                                                key={lessonIndex}
                                                className={cn(
                                                    "bg-slate-800/30 border border-slate-600/50 hover:border-slate-500/80 transition-all cursor-pointer group relative",
                                                    isCompleted && "border-green-500/30 bg-green-900/10"
                                                )}
                                                onClick={() => handleStartLesson(moduleIndex, lessonIndex)}
                                            >
                                                {/* Completion Status Icon */}
                                                <div className="absolute top-2 right-2 z-10">
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-5 w-5 text-green-400 bg-slate-800 rounded-full" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-slate-600 bg-slate-800 rounded-full opacity-50" />
                                                    )}
                                                </div>

                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1 pr-6"> {/* Added right padding for the icon */}
                                                            <h4 className={cn(
                                                                "font-medium mb-1 group-hover:text-cyan-300 transition-colors",
                                                                isCompleted ? "text-green-100" : "text-slate-100"
                                                            )}>
                                                                {lesson.title}
                                                                {isCompleted && (
                                                                    <span className="ml-2 text-xs text-green-400 font-normal">
                                                                        ✓ Completed
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 mb-2">
                                                                {lesson.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                                                                isCompleted
                                                                    ? "bg-green-400/10 text-green-400 border-green-400/20"
                                                                    : "bg-blue-400/10 text-blue-400 border-blue-400/20"
                                                            )}>
                                                                {lesson.difficulty || 'Medium'}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {lesson.estimated_time || '15min'}
                                                            </span>
                                                        </div>
                                                        <Play className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Start */}
                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 mt-8">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-1">Quick Start</h3>
                                <p className="text-slate-400 text-sm">Jump right into the first lesson</p>
                            </div>
                            <div className="flex gap-3">
                                <Button 
                                    onClick={() => handleStartLesson(0, 0)}
                                    className="bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 text-black font-bold"
                                >
                                    Start First Lesson
                                    <Play className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EnhancedCourseLessonsPage;