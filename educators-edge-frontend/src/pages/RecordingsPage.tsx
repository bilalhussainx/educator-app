// pages/RecordingsPage.tsx
// Main page for teachers to manage their recordings

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video } from 'lucide-react';
import { RecordingsManager } from '../components/recordings/RecordingsManager';
import { toast } from 'sonner';
import { apiClient } from '../config/api';

interface Course {
    id: string;
    title: string;
}

export const RecordingsPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (courseId) {
            fetchCourse();
        }
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/${courseId}`);
            setCourse(response.data);
        } catch (error) {
            console.error('Error fetching course:', error);
            toast.error('Failed to load course information');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <span className="ml-2 text-slate-400">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!course || !courseId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <Video className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                            <p className="text-slate-400 mb-4">Course not found</p>
                            <Button onClick={() => navigate('/dashboard')} variant="outline">
                                Return to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/dashboard')}
                            className="text-slate-300 hover:text-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div className="flex items-center gap-3">
                            <Video className="h-6 w-6 text-cyan-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100">Recordings</h1>
                                <p className="text-slate-400">{course.title}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-4">
                <div className="mt-6">
                    <RecordingsManager courseId={courseId} />
                </div>
            </div>
        </div>
    );
};