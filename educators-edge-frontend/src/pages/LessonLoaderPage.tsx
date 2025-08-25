// src/pages/LessonLoaderPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

// Import BOTH of your powerful IDE components
import AscentIDE from './AscentIDE.tsx';
import AscentWebIDE from '../components/AscentWebIDE.tsx';

// A simple loading component
const LoadingScreen = () => <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Loading Lesson...</div>;

const LessonLoaderPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const [lessonType, setLessonType] = useState<'algorithmic' | 'frontend-project' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLessonType = async () => {
            if (!lessonId) return;
            
            setIsLoading(true);
            try {
                // This is a much faster API call. We ONLY ask for the 'lesson_type'.
                const response = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
                
                // We only need the 'lesson' object from the response to get the type
                const data = response.data;
                if (data.lesson && data.lesson.lesson_type) {
                    setLessonType(data.lesson.lesson_type);
                } else {
                    // Default to algorithmic if type is missing for some reason
                    setLessonType('algorithmic'); 
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLessonType();
    }, [lessonId]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error) {
        // You could redirect to an error page or show a message
        return <Navigate to="/dashboard" replace />;
    }

    // --- THIS IS THE "SMART" ROUTING LOGIC ---
    if (lessonType === 'frontend-project') {
        // If it's a web project, render the AscentWebIDE.
        // It will re-fetch its own data, which is fine and keeps components independent.
        return <AscentWebIDE />;
    }
    
    // By default, or if the type is 'algorithmic', render your original, feature-rich AscentIDE.
    return <AscentIDE />;
};

export default LessonLoaderPage;