// src/pages/ViewChapterPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import type { AscentIdeData } from '../types/index.ts';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from "@/lib/utils";

const ViewChapterPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const [lessonData, setLessonData] = useState<AscentIdeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLessonData = async () => {
            if (!lessonId) return;
            setIsLoading(true);
            try {
                // We reuse the AscentIDE endpoint as it provides all the necessary navigation and lesson data.
                const response = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
                setLessonData(response.data);
            } catch (error) {
                console.error("Failed to load chapter data:", error);
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };
        fetchLessonData();
    }, [lessonId, navigate]);

    const handleNavigation = (targetLessonId: string | null) => {
        if (targetLessonId) navigate(`/lesson/${targetLessonId}`);
    };
    
    if (isLoading || !lessonData) {
        return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Loading Chapter...</div>;
    }

    const { lesson, previousLessonId, nextLessonId, courseId } = lessonData;

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans p-4 sm:p-6 lg:p-8">
            <header className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
                 <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId}/learn`)} className="hover:bg-slate-800 text-slate-300">
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Course
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => handleNavigation(previousLessonId)} disabled={!previousLessonId} className="border-slate-700 hover:bg-slate-800 h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => handleNavigation(nextLessonId)} disabled={!nextLessonId} className={cn("border-slate-700 hover:bg-slate-800 h-8 w-8", nextLessonId && "border-cyan-500 text-cyan-400 hover:bg-cyan-900/80")}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </header>
            <main className="max-w-4xl mx-auto">
                <Card className="bg-slate-900/30 backdrop-blur-lg border border-slate-700/80 text-white">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-3"><BookOpen className="text-cyan-400"/> {lesson.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-slate prose-invert max-w-none text-slate-300">
                        <ReactMarkdown>{lesson.description}</ReactMarkdown>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default ViewChapterPage;