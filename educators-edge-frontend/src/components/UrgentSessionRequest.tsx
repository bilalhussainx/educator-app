import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import apiClient from '../services/apiClient';
import {
    Clock, Bot, Zap, CheckCircle, AlertCircle, MessageCircle, 
    Code, FileEdit, UserCheck, Calendar, ArrowRight, Upload, File, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UrgentSessionRequestProps {
    lessonId?: string;
    courseId?: string;
    initialTopic?: string;
    initialDescription?: string;
    onSessionCreated?: (sessionData: any) => void;
    onClose?: () => void;
}

interface SessionData {
    requestId: string;
    bot: {
        id: string;
        name: string;
        specialization: string;
        personality: string;
    };
    sessionTime: string;
    chatSessionId: string;
    status: string;
}

const UrgentSessionRequest: React.FC<UrgentSessionRequestProps> = ({
    lessonId,
    courseId,
    initialTopic = '',
    initialDescription = '',
    onSessionCreated,
    onClose
}) => {
    const [formData, setFormData] = useState({
        topic: initialTopic,
        description: initialDescription,
        subject: 'Computer Science',
        sessionType: 'mentoring',
        difficulty: 'intermediate'
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [sessionCreated, setSessionCreated] = useState<SessionData | null>(null);
    const [countdown, setCountdown] = useState<number>(0);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [documentId, setDocumentId] = useState<string | null>(null);

    const sessionTypes = [
        {
            id: 'mentoring',
            name: 'Programming Mentoring',
            description: 'Get help with coding, algorithms, and debugging',
            icon: Code,
            color: 'bg-blue-500'
        },
        {
            id: 'essay_editing',
            name: 'Essay Editing',
            description: 'Improve your writing and essay structure',
            icon: FileEdit,
            color: 'bg-green-500'
        },
        {
            id: 'counseling',
            name: 'Academic Counseling',
            description: 'College prep and career guidance',
            icon: UserCheck,
            color: 'bg-purple-500'
        }
    ];

    const difficultyLevels = [
        { value: 'beginner', label: 'Beginner', color: 'bg-green-500' },
        { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-500' },
        { value: 'advanced', label: 'Advanced', color: 'bg-red-500' }
    ];

    const subjects = [
        'Computer Science',
        'Mathematics', 
        'Physics',
        'Chemistry',
        'Biology',
        'English Writing',
        'College Prep',
        'Other'
    ];

    // Start countdown and poll for live session when session is created
    React.useEffect(() => {
        if (sessionCreated) {
            const sessionTime = new Date(sessionCreated.sessionTime);
            
            const updateCountdown = () => {
                const now = new Date();
                const timeDiff = sessionTime.getTime() - now.getTime();
                const minutes = Math.floor(timeDiff / 60000);
                const seconds = Math.floor((timeDiff % 60000) / 1000);
                
                if (timeDiff > 0) {
                    setCountdown(minutes * 60 + seconds);
                } else {
                    setCountdown(0);
                    toast.success('Your live session is starting now! 🚀');
                }
            };

            // Poll for live session status
            const checkLiveSession = async () => {
                try {
                    const response = await apiClient.get(`/api/ai-bots/urgent-sessions/${sessionCreated.requestId}`);
                    if (response.data.success && response.data.session.isLiveSessionReady) {
                        const liveSessionUrl = response.data.session.liveSessionUrl;
                        console.log('Live session is ready! Redirecting to:', liveSessionUrl);
                        toast.success('🎉 Your essay editing session is ready! Opening now...');
                        
                        // Redirect to the live session
                        setTimeout(() => {
                            window.location.href = liveSessionUrl;
                        }, 1000);
                        
                        return true; // Stop polling
                    }
                } catch (error) {
                    console.error('Error checking live session status:', error);
                }
                return false; // Continue polling
            };

            updateCountdown();
            const countdownInterval = setInterval(updateCountdown, 1000);
            
            // Start polling for live session after 2 minutes (since session starts in 3 minutes)
            const pollTimeout = setTimeout(() => {
                const pollInterval = setInterval(async () => {
                    const shouldStop = await checkLiveSession();
                    if (shouldStop) {
                        clearInterval(pollInterval);
                    }
                }, 5000); // Poll every 5 seconds

                // Stop polling after 10 minutes if no live session found
                setTimeout(() => {
                    clearInterval(pollInterval);
                }, 10 * 60 * 1000);
            }, 2 * 60 * 1000); // Start polling after 2 minutes
            
            return () => {
                clearInterval(countdownInterval);
                clearTimeout(pollTimeout);
            };
        }
    }, [sessionCreated]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.topic.trim() || !formData.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await apiClient.post('/api/ai-bots/urgent-request', {
                ...formData,
                lessonId,
                courseId,
                documentId // Include uploaded document
            });

            if (response.data.success) {
                const sessionData = response.data.data;
                setSessionCreated(sessionData);
                
                // Check if live session URL is available for immediate redirect
                if (sessionData.liveSessionUrl && sessionData.status === 'live') {
                    toast.success('Urgent session started! Opening collaborative editor...');
                    
                    // Redirect immediately to the collaborative editor
                    window.location.href = sessionData.liveSessionUrl;
                    return;
                } else {
                    toast.success('Urgent session request created! AI mentor will start your session shortly.');
                }
                
                if (onSessionCreated) {
                    onSessionCreated(sessionData);
                }
            }
        } catch (error: any) {
            console.error('Error creating urgent session:', error);
            
            if (error.response?.data?.activeSessions) {
                toast.error('You already have an active session. Please complete it first.');
            } else {
                toast.error(error.response?.data?.error || 'Failed to create urgent session');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file type
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'text/plain', // .txt
            'application/pdf' // .pdf
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a Word document (.doc, .docx), PDF, or text file');
            return;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('type', 'essay_draft');

            const response = await apiClient.post('/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setUploadedFile(file);
                setDocumentId(response.data.documentId);
                toast.success('Document uploaded successfully!');
                
                // Auto-set session type to essay editing if uploading a document
                if (formData.get('type') === 'essay_draft') {
                    setFormData(prev => ({ ...prev, sessionType: 'essay_editing' }));
                }
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.error || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const removeUploadedFile = () => {
        setUploadedFile(null);
        setDocumentId(null);
        toast.success('Document removed');
    };

    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (sessionCreated) {
        return (
            <Card className="w-full max-w-2xl mx-auto bg-slate-900/95 backdrop-blur border border-slate-700 text-white">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <CardTitle className="text-2xl text-green-400">Urgent Session Scheduled!</CardTitle>
                    <CardDescription className="text-slate-300 text-base">
                        Your AI mentor has accepted your request and will start a live session in:
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {/* Countdown */}
                    <div className="text-center">
                        <div className="text-4xl font-bold text-cyan-400 mb-2">
                            {formatCountdown(countdown)}
                        </div>
                        <p className="text-slate-400">
                            {countdown > 0 ? 'Time until live session starts' : 'Session is starting now!'}
                        </p>
                    </div>

                    {/* Session Details */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12 border border-slate-600">
                                <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                    <Bot className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white mb-1">
                                    {sessionCreated.bot.name}
                                </h3>
                                <p className="text-sm text-slate-300 mb-2">
                                    {sessionCreated.bot.specialization}
                                </p>
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                                        {sessionCreated.bot.personality}
                                    </Badge>
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                        Available Now
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-400">
                                    <strong>Topic:</strong> {formData.topic}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <Alert className="border-blue-500/50 bg-blue-500/10">
                        <Zap className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-200">
                            <strong>What happens next:</strong>
                            <ul className="mt-2 space-y-1 text-sm">
                                <li>• You can start chatting with your mentor right now</li>
                                <li>• Live session will begin automatically in {Math.ceil(countdown / 60)} minutes</li>
                                <li>• You'll get a notification when the session starts</li>
                                <li>• The session will include screen sharing and real-time code assistance</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button 
                            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                            onClick={() => {
                                // Navigate to chat with AI mentor
                                window.location.href = `/ai-chat?session=${sessionCreated.chatSessionId}`;
                            }}
                        >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat with Mentor Now
                        </Button>
                        <Button 
                            variant="outline" 
                            className="border-slate-600 hover:bg-slate-700"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>

                    {/* Session Info */}
                    <div className="text-center text-sm text-slate-400">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Session scheduled for {new Date(sessionCreated.sessionTime).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto bg-slate-900/95 backdrop-blur border border-slate-700 text-white">
            <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                        <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-white">Request Urgent AI Mentor Session</CardTitle>
                        <CardDescription className="text-slate-300">
                            Get connected with an AI mentor within 3 minutes
                        </CardDescription>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <Clock className="h-4 w-4" />
                    <span><strong>Fast Response:</strong> AI mentor will accept and start your session within 3 minutes</span>
                </div>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Session Type */}
                    <div>
                        <Label className="text-white text-base font-medium mb-3 block">
                            Session Type *
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {sessionTypes.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected = formData.sessionType === type.id;
                                
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({...prev, sessionType: type.id}))}
                                        className={cn(
                                            "p-4 rounded-lg border text-left transition-all",
                                            isSelected 
                                                ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' 
                                                : 'border-slate-600 bg-slate-800/30 hover:bg-slate-800/50 hover:border-slate-500'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", type.color)}>
                                                <IconComponent className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="font-medium text-white">{type.name}</span>
                                        </div>
                                        <p className="text-sm text-slate-400">{type.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Topic */}
                    <div>
                        <Label htmlFor="topic" className="text-white text-base font-medium mb-2 block">
                            What do you need help with? *
                        </Label>
                        <Input
                            id="topic"
                            value={formData.topic}
                            onChange={e => setFormData(prev => ({...prev, topic: e.target.value}))}
                            placeholder="e.g., JavaScript debugging, Python loops, Essay structure..."
                            className="bg-slate-800/50 border-slate-600 text-white h-12 text-base placeholder:text-slate-400"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description" className="text-white text-base font-medium mb-2 block">
                            Describe your problem in detail *
                        </Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                            placeholder="Please provide details about what you're struggling with, what you've tried, and what specific help you need..."
                            className="bg-slate-800/50 border-slate-600 text-white text-base placeholder:text-slate-400 min-h-[100px] resize-none"
                            required
                        />
                        <p className="text-sm text-slate-400 mt-1">
                            {formData.description.length}/500 characters
                        </p>
                    </div>

                    {/* Document Upload */}
                    <div>
                        <Label className="text-white text-base font-medium mb-2 block">
                            Upload Document (Optional)
                        </Label>
                        <p className="text-sm text-slate-400 mb-3">
                            Upload a Word document, PDF, or text file that you need help with
                        </p>
                        
                        {!uploadedFile ? (
                            <div className="relative">
                                <input
                                    type="file"
                                    id="document-upload"
                                    accept=".doc,.docx,.pdf,.txt"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                />
                                <div className={cn(
                                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                    isUploading 
                                        ? "border-slate-600 bg-slate-800/30" 
                                        : "border-slate-600 bg-slate-800/20 hover:border-slate-500 hover:bg-slate-800/40 cursor-pointer"
                                )}>
                                    {isUploading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
                                            <span className="text-slate-300">Uploading document...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center">
                                                <Upload className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-slate-200 font-medium">Click to upload document</p>
                                                <p className="text-sm text-slate-400">Supports .doc, .docx, .pdf, .txt (max 10MB)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <File className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{uploadedFile.name}</p>
                                    <p className="text-sm text-slate-400">
                                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={removeUploadedFile}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Subject and Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-white text-base font-medium mb-2 block">
                                Subject
                            </Label>
                            <select
                                value={formData.subject}
                                onChange={e => setFormData(prev => ({...prev, subject: e.target.value}))}
                                className="w-full h-12 px-4 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-base focus:ring-2 focus:ring-cyan-500"
                            >
                                {subjects.map(subject => (
                                    <option key={subject} value={subject} className="bg-slate-800">
                                        {subject}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-white text-base font-medium mb-2 block">
                                Difficulty Level
                            </Label>
                            <div className="flex gap-2">
                                {difficultyLevels.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({...prev, difficulty: level.value}))}
                                        className={cn(
                                            "flex-1 py-3 px-3 rounded-lg border text-sm font-medium transition-all",
                                            formData.difficulty === level.value
                                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                                : 'border-slate-600 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50'
                                        )}
                                    >
                                        <div className={cn("w-3 h-3 rounded-full mx-auto mb-1", level.color)} />
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.topic.trim() || !formData.description.trim()}
                            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-12 text-base font-medium"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Finding AI Mentor...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Request Urgent Session
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                        
                        <p className="text-center text-sm text-slate-400 mt-3">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Your AI mentor will respond within 3 minutes and start a live session with you
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default UrgentSessionRequest;