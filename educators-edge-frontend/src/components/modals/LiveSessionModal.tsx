// src/components/modals/LiveSessionModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioTower, PlusCircle, BookOpen, Loader, FileEdit, Code, Upload, FileText, X } from 'lucide-react';
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
    existingSessionId?: string | number; // For starting existing sessions from SessionsPage
}

type SessionType = 'tutorial' | 'essay_editing';

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ user, isOpen, onClose, existingSessionId }) => {
    const [joinSessionId, setJoinSessionId] = useState('');
    const [joinSessionType, setJoinSessionType] = useState<SessionType>('tutorial');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [sessionType, setSessionType] = useState<SessionType>('tutorial');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
    const [documentInstructions, setDocumentInstructions] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate();

    // Debug logging
    useEffect(() => {
        if (isOpen) {
            console.log('[LiveSessionModal] Modal opened');
            console.log('[LiveSessionModal] User:', user);
            console.log('[LiveSessionModal] User role:', user?.role);
            console.log('[LiveSessionModal] Session type:', sessionType);
        }
    }, [isOpen, user, sessionType]);

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
            const fetchedCourses = response.data || [];
            console.log('Fetched courses:', fetchedCourses);
            setCourses(fetchedCourses);
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type and size
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Please upload a PDF, Word document, or text file');
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast.error('File size must be less than 10MB');
                return;
            }
            setUploadedDocument(file);
        }
    };

    const removeUploadedDocument = () => {
        setUploadedDocument(null);
        setDocumentInstructions('');
    };

    const handleCreateSession = async () => {
        if (user?.role === 'teacher' && !selectedCourseId && !existingSessionId) {
            toast.error('Please select a course for this live session');
            return;
        }

        console.log('[DEBUG] Creating session with selectedCourseId:', selectedCourseId, 'sessionType:', sessionType);
        console.log('[DEBUG] existingSessionId:', existingSessionId);
        console.log('[DEBUG] Selected course from courses array:', courses.find(c => c.id === selectedCourseId));

        // Use existing session ID if provided, otherwise generate new UUID
        const sessionId = existingSessionId || crypto.randomUUID();

        // Handle document upload for essay editing sessions
        let uploadedDocumentId = null;
        if (sessionType === 'essay_editing' && uploadedDocument) {
            try {
                setIsUploading(true);

                // Create FormData to upload the document
                const formData = new FormData();
                formData.append('document', uploadedDocument);
                formData.append('sessionId', sessionId);
                formData.append('courseId', selectedCourseId);
                formData.append('instructions', documentInstructions);
                formData.append('teacherId', user.id.toString());

                // Upload document first
                const uploadResponse = await apiClient.post('/api/sessions/upload-document', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (uploadResponse.data.success) {
                    uploadedDocumentId = uploadResponse.data.documentId;
                    toast.success('Document uploaded successfully');
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                console.error('Error uploading document:', error);
                toast.error('Failed to upload document');
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        // If using existing session, call /start endpoint to update session_mode in database
        if (existingSessionId) {
            try {
                console.log('[LiveSessionModal] Starting existing session:', existingSessionId, 'with mode:', sessionType === 'essay_editing' ? 'essay' : 'code');
                const response = await apiClient.post(`/api/sessions/${existingSessionId}/start`, {
                    mode: sessionType === 'essay_editing' ? 'essay' : 'code'
                });

                if (response.data.success) {
                    console.log('[LiveSessionModal] ✅ Session started successfully via API');
                    toast.success(`${sessionType === 'essay_editing' ? 'Essay' : 'Code'} session started!`);
                } else {
                    throw new Error(response.data.error || 'Failed to start session');
                }
            } catch (error: any) {
                console.error('[LiveSessionModal] ❌ Error starting session:', error);
                const errorMessage = error.response?.data?.error || error.message || 'Failed to start session';
                toast.error(errorMessage);
                setIsUploading(false);
                return;
            }
        }

        onClose(); // Close the modal before navigating

        // Navigate based on session type
        let navigationUrl = '';
        if (sessionType === 'essay_editing') {
            // Navigate to ScribeSessionPage for LIVE essay editing with teacher-led session features
            const documentParam = uploadedDocumentId ? uploadedDocumentId : (uploadedDocument ? 'true' : 'false');
            navigationUrl = `/urgent-session/${sessionId}/essay?session=${sessionId}&mentor=teacher&type=live&document=${documentParam}&courseId=${selectedCourseId}`;
        } else {
            // Navigate to LiveTutorialPage for coding tutorials (existing behavior)
            navigationUrl = selectedCourseId
                ? `/session/${sessionId}?courseId=${selectedCourseId}&mode=coding`
                : `/session/${sessionId}?mode=coding`;
        }

        console.log('[DEBUG] Navigating to:', navigationUrl);
        navigate(navigationUrl);
    };
    
    const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (joinSessionId.trim()) {
            onClose(); // Close the modal before navigating

            // Route based on selected session type
            if (joinSessionType === 'essay_editing') {
                // Route to essay editing environment for students
                navigate(`/urgent-session/${joinSessionId.trim()}/essay?session=${joinSessionId.trim()}&mentor=teacher&type=live&role=student`);
            } else {
                // Route to coding environment (default)
                navigate(`/session/${joinSessionId.trim()}`);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-cyan-300 text-2xl">
                        <RadioTower /> {existingSessionId ? 'Start Session' : 'Live Session'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {existingSessionId
                            ? 'Choose the session mode and start teaching'
                            : 'Instantly start or join a real-time instruction session'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4 space-y-6 pb-4">
                    {/* Teacher-specific action */}
                    {user?.role === 'teacher' && (
                        <>
                            {/* Session Type Selection */}
                            <div className="mb-6 space-y-3">
                                <Label className="text-sm font-medium text-slate-300">
                                    Session Type
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSessionType('tutorial')}
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                                            sessionType === 'tutorial'
                                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                                : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                                        }`}
                                    >
                                        <Code className="h-6 w-6 mb-2" />
                                        <span className="text-sm font-medium">Coding Tutorial</span>
                                        <span className="text-xs text-slate-400 text-center mt-1">Live coding session with IDE</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSessionType('essay_editing')}
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                                            sessionType === 'essay_editing'
                                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                                : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                                        }`}
                                    >
                                        <FileEdit className="h-6 w-6 mb-2" />
                                        <span className="text-sm font-medium">Essay Editing</span>
                                        <span className="text-xs text-slate-400 text-center mt-1">Collaborative writing session</span>
                                    </button>
                                </div>
                            </div>

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
                                ) : courses.length > 0 ? (
                                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                        <SelectTrigger className="w-full bg-slate-800 border-slate-600 focus:border-cyan-400 h-12 text-base">
                                            <SelectValue placeholder="Choose a course for this session" />
                                        </SelectTrigger>
                                        <SelectContent 
                                            className="bg-slate-800 border-slate-600 text-slate-200 max-h-[200px] overflow-y-auto"
                                            position="popper"
                                            sideOffset={8}
                                            avoidCollisions={true}
                                        >
                                            {courses.map((course) => (
                                                <SelectItem 
                                                    key={course.id} 
                                                    value={course.id}
                                                    className="text-slate-200 focus:bg-slate-700 focus:text-cyan-300 cursor-pointer"
                                                >
                                                    <div className="flex items-center w-full">
                                                        <BookOpen className="h-4 w-4 mr-2 text-cyan-400 flex-shrink-0" />
                                                        <span className="truncate">{course.title}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-slate-500 bg-slate-800 p-3 rounded-md border border-slate-600">
                                        No courses found. Create a course first to link live sessions.
                                    </div>
                                )}
                            </div>

                            {/* Document Upload Section for Essay Editing */}
                            {sessionType === 'essay_editing' && (
                                <div className="mb-6 space-y-4">
                                    <Label className="text-sm font-medium text-slate-300">
                                        Reference Document (Optional)
                                    </Label>

                                    {!uploadedDocument ? (
                                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                            <input
                                                type="file"
                                                id="document-upload"
                                                onChange={handleDocumentUpload}
                                                accept=".pdf,.doc,.docx,.txt"
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="document-upload"
                                                className="flex flex-col items-center cursor-pointer"
                                            >
                                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                                <span className="text-sm text-slate-300 text-center">
                                                    Upload assignment prompt or reference document
                                                </span>
                                                <span className="text-xs text-slate-500 text-center mt-1">
                                                    PDF, Word, or Text files up to 10MB
                                                </span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-cyan-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-200">
                                                            {uploadedDocument.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {(uploadedDocument.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={removeUploadedDocument}
                                                    className="text-slate-400 hover:text-red-400"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {uploadedDocument && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-slate-300">
                                                Instructions for Students
                                            </Label>
                                            <Textarea
                                                value={documentInstructions}
                                                onChange={(e) => setDocumentInstructions(e.target.value)}
                                                placeholder="Provide context about the document and what students should focus on..."
                                                className="bg-slate-800 border-slate-600 focus:border-cyan-400 min-h-[80px] resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={handleCreateSession}
                                disabled={(!selectedCourseId && !existingSessionId) || loadingCourses || isUploading}
                                className="w-full text-lg py-6 mb-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader className="mr-2 h-5 w-5 animate-spin" />
                                        Uploading Document...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="mr-2 h-5 w-5" />
                                        {existingSessionId
                                            ? `Start ${sessionType === 'essay_editing' ? 'Essay' : 'Code'} Session`
                                            : `Create ${sessionType === 'essay_editing' ? 'Essay Editing' : 'Tutorial'} Session`
                                        }
                                    </>
                                )}
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
                    <form onSubmit={handleJoinSession} className="space-y-4">
                        {/* Session Type Selection for Joining */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-slate-300">
                                What type of session are you joining?
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setJoinSessionType('tutorial')}
                                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                        joinSessionType === 'tutorial'
                                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    <Code className="h-5 w-5 mb-1" />
                                    <span className="text-sm font-medium">Coding</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setJoinSessionType('essay_editing')}
                                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                        joinSessionType === 'essay_editing'
                                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    <FileEdit className="h-5 w-5 mb-1" />
                                    <span className="text-sm font-medium">Essay</span>
                                </button>
                            </div>
                        </div>

                        {/* Session ID Input */}
                        <div className="flex gap-2">
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
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};