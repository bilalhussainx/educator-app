// src/components/modals/LiveSessionModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioTower, PlusCircle, BookOpen, Loader } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';

interface Course {
    id: string;
    title: string;
}

interface LiveSessionModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ user, isOpen, onClose }) => {
    const [joinSessionId, setJoinSessionId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const navigate = useNavigate();

    // Fetch teacher's courses when modal opens for teachers
    useEffect(() => {
        if (isOpen && user?.role === 'teacher') {
            fetchCourses();
        }
    }, [isOpen, user]);

    const fetchCourses = async () => {
        try {
            setLoadingCourses(true);
            const response = await apiClient.get('/api/courses');
            setCourses(response.data.courses || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleCreateSession = () => {
        if (user?.role === 'teacher' && !selectedCourseId) {
            toast.error('Please select a course for this live session');
            return;
        }

        const sessionId = crypto.randomUUID();
        onClose(); // Close the modal before navigating
        
        // Navigate with course ID as query parameter if teacher selected one
        if (selectedCourseId) {
            navigate(`/session/${sessionId}?courseId=${selectedCourseId}`);
        } else {
            navigate(`/session/${sessionId}`);
        }
    };
    
    const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (joinSessionId.trim()) {
            onClose(); // Close the modal before navigating
            navigate(`/session/${joinSessionId.trim()}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-cyan-300 text-2xl">
                        <RadioTower /> Live Session
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Instantly start or join a real-time instruction session.
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                    {/* Teacher-specific action */}
                    {user?.role === 'teacher' && (
                        <>
                            {/* Course Selection */}
                            <div className="mb-6 space-y-3">
                                <Label htmlFor="course-select" className="text-sm font-medium text-slate-300">
                                    Select Course for Live Session
                                </Label>
                                {loadingCourses ? (
                                    <div className="flex items-center justify-center p-4 bg-slate-800 rounded-md">
                                        <Loader className="h-5 w-5 animate-spin text-cyan-400 mr-2" />
                                        <span className="text-slate-400">Loading courses...</span>
                                    </div>
                                ) : (
                                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                        <SelectTrigger className="w-full bg-slate-800 border-slate-600 focus:border-cyan-400 h-12 text-base">
                                            <SelectValue placeholder="Choose a course for this session" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            {courses.map((course) => (
                                                <SelectItem 
                                                    key={course.id} 
                                                    value={course.id}
                                                    className="text-slate-200 focus:bg-slate-700 focus:text-cyan-300"
                                                >
                                                    <div className="flex items-center">
                                                        <BookOpen className="h-4 w-4 mr-2 text-cyan-400" />
                                                        {course.title}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {courses.length === 0 && !loadingCourses && (
                                    <div className="text-sm text-slate-500 bg-slate-800 p-3 rounded-md">
                                        No courses found. Create a course first to link live sessions.
                                    </div>
                                )}
                            </div>
                            
                            <Button 
                                onClick={handleCreateSession} 
                                disabled={!selectedCourseId || loadingCourses}
                                className="w-full text-lg py-6 mb-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusCircle className="mr-2 h-5 w-5" /> Create New Session
                            </Button>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-slate-500">Or Join a Session</span>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Join session form for everyone */}
                    <form onSubmit={handleJoinSession} className="flex gap-2">
                        <Input 
                            type="text" 
                            value={joinSessionId} 
                            onChange={(e) => setJoinSessionId(e.target.value)} 
                            placeholder="Enter Session ID..." 
                            required 
                            className="bg-slate-800 border-slate-600 focus:border-cyan-400 h-12 text-base" 
                        />
                        <Button type="submit" className="h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold">
                            Join
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};