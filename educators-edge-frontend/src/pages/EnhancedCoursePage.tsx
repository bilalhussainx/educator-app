

/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   EnhancedCoursePage.tsx
 * =================================================================
 * DESCRIPTION: Student view for AI-enhanced courses with AI supervision
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EnhancedCourse, AISupervisionSession } from '../types/index.ts';
import apiClient from '../services/apiClient';
import { cn } from "@/lib/utils";

// Import components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Badge component (create if doesn't exist)
const Badge: React.FC<{ 
    children: React.ReactNode; 
    className?: string; 
    variant?: 'default' | 'secondary' | 'outline';
}> = ({ children, className = '', variant = 'default' }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variantClasses = {
        default: 'bg-blue-100 text-blue-800',
        secondary: 'bg-slate-100 text-slate-800',
        outline: 'border border-slate-200 text-slate-700'
    };
    
    return (
        <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
};

import { 
    ChevronLeft, 
    Play, 
    BookOpen, 
    Target, 
    Clock, 
    Brain,
    Zap,
    Users,
    CheckCircle
} from 'lucide-react';

// AI Supervision Hook
const useAISupervision = (courseId: string, enabled: boolean) => {
    const [session, setSession] = useState<AISupervisionSession | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [isActive, setIsActive] = useState(false);

    const startSupervision = async (studentProfile: any) => {
        if (!enabled) return;
        
        try {
            const response = await apiClient.post(`/api/ai-courses/start-supervision/${courseId}`, {
                studentProfile
            });
            setSession(response.data.session);
            setIsActive(true);
        } catch (error) {
            console.error('Failed to start AI supervision:', error);
        }
    };

    const analyzeCode = async (codeChange: any) => {
        if (!session || !isActive) return;
        
        try {
            const response = await apiClient.post(`/api/ai-courses/analyze-code/${session.id}`, {
                codeChange
            });
            setAnalysis(response.data.analysis);
            
            // Show hints if AI suggests intervention
            if (response.data.analysis.shouldIntervene) {
                // This would trigger UI hints
                console.log('AI Intervention:', response.data.analysis.intervention);
            }
        } catch (error) {
            console.error('Failed to analyze code:', error);
        }
    };

    const endSupervision = () => {
        setSession(null);
        setAnalysis(null);
        setIsActive(false);
    };

    return { session, analysis, isActive, startSupervision, analyzeCode, endSupervision };
};

const EnhancedCoursePage: React.FC = () => {
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    
    const [course, setCourse] = useState<EnhancedCourse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrollmentLoading, setEnrollmentLoading] = useState(false);
    
    // AI supervision
    const { session, analysis, isActive, startSupervision, analyzeCode, endSupervision } = useAISupervision(courseId || '', true);

    useEffect(() => {
        if (!courseId) return;
        
        const fetchCourseAndEnrollment = async () => {
            try {
                // Fetch course data first
                const courseResponse = await apiClient.get(`/api/enhanced-courses/public/${courseId}`);
                setCourse(courseResponse.data);
                
                // Then check enrollment status separately
                try {
                    const enrollmentResponse = await apiClient.get(`/api/enhanced-courses/${courseId}/enrollment-status`);
                    console.log('Enrollment status response:', enrollmentResponse.data);
                    setIsEnrolled(enrollmentResponse.data.isEnrolled || false);
                } catch (enrollmentErr: any) {
                    console.log('Enrollment status check failed:', enrollmentErr.response?.data);
                    // If the error suggests already enrolled, set enrolled to true
                    const errMessage = enrollmentErr.response?.data?.error || '';
                    if (errMessage.includes('Already enrolled')) {
                        console.log('Detected already enrolled from error message');
                        setIsEnrolled(true);
                    } else {
                        // Otherwise assume not enrolled
                        setIsEnrolled(false);
                    }
                }
                
            } catch (err: any) {
                console.error('Error loading course:', err.response?.data);
                setError(err.response?.data?.error || 'Failed to load course');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourseAndEnrollment();
    }, [courseId]);

    const handleEnroll = async () => {
        if (!courseId) return;
        
        console.log('handleEnroll called - isEnrolled:', isEnrolled, 'courseId:', courseId);
        
        setEnrollmentLoading(true);
        try {
            console.log('Attempting to enroll in course:', courseId);
            await apiClient.post(`/api/enhanced-courses/${courseId}/enroll`);
            console.log('Enrollment successful');
            setIsEnrolled(true);
            
            // Start AI supervision after enrollment (optional)
            try {
                if (course) {
                    await startSupervision({
                        course_id: courseId,
                        difficulty_preference: course.difficulty_level,
                        learning_goals: course.learning_outcomes
                    });
                }
            } catch (supervisionErr) {
                console.log('AI supervision failed, but continuing...', supervisionErr);
            }
            
            // Navigate to lessons after successful enrollment
            console.log('Navigating to lessons page');
            navigate(`/enhanced-courses/${courseId}/lessons`);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Failed to enroll';
            const statusCode = err.response?.status;
            console.error('Enrollment error:', statusCode, errorMessage);
            
            // If already enrolled (400 error), just navigate to lessons
            if (statusCode === 400 && errorMessage.includes('Already enrolled')) {
                console.log('Already enrolled error, updating state and navigating');
                setIsEnrolled(true);
                setError(null); // Clear any previous error
                navigate(`/enhanced-courses/${courseId}/lessons`);
                return;
            }
            
            setError(`Enrollment failed: ${errorMessage}`);
        } finally {
            setEnrollmentLoading(false);
        }
    };

    const handleStartLearning = () => {
        // Navigate to lesson interface with AI supervision
        navigate(`/enhanced-courses/${courseId}/lessons`, {
            state: { aiSupervisionEnabled: true }
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <div className="text-center">
                    <Brain className="h-12 w-12 text-cyan-400 animate-pulse mx-auto mb-4" />
                    <p className="text-slate-400">Loading AI-enhanced course...</p>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-red-400 mb-4">{error || 'Course not found'}</p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => navigate('/courses/discover')} variant="outline">
                            Back to Courses
                        </Button>
                        {/* If error contains "already enrolled", show lessons button */}
                        {error && error.includes('Already enrolled') && courseId && (
                            <Button 
                                onClick={() => navigate(`/enhanced-courses/${courseId}/lessons`)}
                                className="bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-300 hover:to-blue-300 text-black font-bold"
                            >
                                Go to Lessons
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-[#0a091a]"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/courses/discover')} 
                    className="mb-6 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Marketplace
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Course Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 rounded-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-bold text-slate-100">{course.title}</h1>
                                        <Badge className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold">
                                            AI ENHANCED
                                        </Badge>
                                    </div>
                                    <p className="text-slate-400 mb-2">By {course.teacher_name}</p>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="capitalize">{course.difficulty_level}</span>
                                        <span>•</span>
                                        <span>{course.estimated_duration}</span>
                                        <span>•</span>
                                        <span>{course.enrolled_count} enrolled</span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-slate-300 text-lg leading-relaxed mb-6">
                                {course.description}
                            </p>

                            {/* AI Tutor Info */}
                            {course.ai_tutor && (
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Brain className="h-5 w-5 text-cyan-400" />
                                        <span className="font-semibold text-cyan-400">AI Tutor: {course.ai_tutor.name}</span>
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-2">{course.ai_tutor.teaching_style}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {course.ai_tutor.specialization.map((spec, index) => (
                                            <Badge key={index} variant="secondary" className="bg-slate-700 text-slate-300">
                                                {spec}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {!isEnrolled ? (
                                    <Button 
                                        onClick={handleEnroll}
                                        disabled={enrollmentLoading}
                                        className="bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 text-black font-bold px-8 py-3 text-lg"
                                    >
                                        {enrollmentLoading ? 'Enrolling...' : 'Enroll & Start'}
                                        <Zap className="ml-2 h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={handleStartLearning}
                                        className="bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-300 hover:to-blue-300 text-black font-bold px-8 py-3 text-lg"
                                    >
                                        Continue Learning
                                        <Play className="ml-2 h-5 w-5" />
                                    </Button>
                                )}
                                {/* Always show lessons button as backup */}
                                <Button 
                                    onClick={() => navigate(`/enhanced-courses/${courseId}/lessons`)}
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-800 px-6 py-3"
                                >
                                    Browse Lessons
                                </Button>
                            </div>
                        </div>

                        {/* Learning Outcomes */}
                        {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-slate-100">
                                        <Target className="h-5 w-5 text-cyan-400" />
                                        Learning Outcomes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {course.learning_outcomes.map((outcome, index) => (
                                            <li key={index} className="flex items-start gap-2 text-slate-300">
                                                <CheckCircle className="h-4 w-4 text-green-400 mt-1 flex-shrink-0" />
                                                <span>{outcome}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites && course.prerequisites.length > 0 && (
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-slate-100">
                                        <BookOpen className="h-5 w-5 text-orange-400" />
                                        Prerequisites
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {course.prerequisites.map((prereq, index) => (
                                            <li key={index} className="flex items-start gap-2 text-slate-300">
                                                <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                                                <span>{prereq}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* AI Supervision Status */}
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-100">
                                    <Brain className="h-5 w-5 text-cyan-400" />
                                    AI Supervision
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Status:</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></div>
                                            <span className={`text-sm ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {session && (
                                        <div className="text-sm text-slate-400">
                                            <p>Hints used: {session.hints_used}</p>
                                            <p>Session started: {new Date(session.start_time).toLocaleTimeString()}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Course Stats */}
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="text-slate-100">Course Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Language:</span>
                                    <Badge variant="outline" className="capitalize border-slate-600 text-slate-300">
                                        {course.language}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Course Type:</span>
                                    <Badge variant="outline" className="capitalize border-slate-600 text-slate-300">
                                        {course.course_type}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Target Audience:</span>
                                    <span className="text-slate-300 text-sm">{course.target_audience}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedCoursePage;