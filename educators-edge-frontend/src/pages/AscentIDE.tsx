/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   AscentIDE.tsx (Original Design - AppLayout Compatible)
 * =================================================================
 * DESCRIPTION: Original PanelGroup design adapted to work within AppLayout
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { AscentIdeData, LessonFile, Submission, TestResult } from '../types/index.ts';
import Editor, { OnMount } from '@monaco-editor/react';
import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


// --- APE & Analytics ---
import analytics from '../services/analyticsService.ts';
import { useApeStore } from '../stores/apeStore';

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster, toast } from 'sonner';
import {
    ChevronLeft, BeakerIcon, CheckCircle, XCircle, File as FileIcon,
    BrainCircuit, Send, ChevronRight, History,
    FileCode, BotMessageSquare, NotebookPen, Check, FilePlus2, Trash2, Save, PanelLeft
} from 'lucide-react';
import { Award } from 'lucide-react'; // Add a new icon import
import apiClient from '../services/apiClient';




// --- Type Definitions for this component ---
type MissionControlTab = "problem" | "submissions" | "solution";
type DiagnosticsTab = "results" | "aiFeedback";

// --- Hint Modal Component ---
const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
    <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
);

const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
    <AlertDialog open={true} onOpenChange={onClose}>
        <GlassAlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-fuchsia-300"><BrainCircuit className="h-5 w-5" /> AI Oracle</AlertDialogTitle>
                <AlertDialogDescription className="pt-3 text-slate-300">
                    {isLoading ? "Consulting the Oracle..." : <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-3 rounded-md whitespace-pre-wrap text-sm">{hint}</div>}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
            </AlertDialogFooter>
        </GlassAlertDialogContent>
    </AlertDialog>
);

const FeedbackCard = ({ submission }: { submission: Submission }) => (
    <Card className="bg-green-950/40 backdrop-blur-lg border border-green-500/30">
        <CardHeader>
            <CardTitle className="text-xl text-green-300 flex justify-between items-center">
                <span className="flex items-center gap-2"><Award /> Teacher Feedback</span>
                <span className="text-lg font-bold px-3 py-1 bg-green-500/20 text-green-200 rounded-full">
                    Grade: {submission.grade}
                </span>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
            
            {(submission.time_taken || submission.code_churn || submission.copy_paste_activity) && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Performance Metrics</h4>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                        {submission.time_taken && (
                            <div>
                                <span className="text-slate-500">Time Spent</span>
                                <div className="text-slate-200 font-medium">{submission.time_taken} minutes</div>
                            </div>
                        )}
                        {submission.code_churn !== undefined && (
                            <div>
                                <span className="text-slate-500">Code Changes</span>
                                <div className="text-slate-200 font-medium">{submission.code_churn} edits</div>
                            </div>
                        )}
                        {submission.copy_paste_activity !== undefined && (
                            <div>
                                <span className="text-slate-500">Copy-Paste Activity</span>
                                <div className={cn("font-medium", submission.copy_paste_activity > 50 ? "text-yellow-400" : "text-slate-200")}>
                                    {submission.copy_paste_activity}%
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <p className="text-xs text-slate-500 mt-4">
                Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
            </p>
        </CardContent>
    </Card>
);


// --- Main Ascent IDE Component ---
const AscentIDE: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const tutorStyle = useApeStore((state) => state.tutorStyle);

    // --- State Management ---
    const [ideData, setIdeData] = useState<AscentIdeData | null>(null);
    const [files, setFiles] = useState<LessonFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [missionControlTab, setMissionControlTab] = useState<MissionControlTab>('problem');
    const [diagnosticsTab, setDiagnosticsTab] = useState<DiagnosticsTab>('results');
    const [isSolutionUnlocked, setIsSolutionUnlocked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null); // <-- ADD THIS LINE

    const [isTesting, setIsTesting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState<TestResult | null>(null);
    const [conceptualHint, setConceptualHint] = useState<string | null>(null);
    const [isHintModalOpen, setIsHintModalOpen] = useState(false);
    const [aiHint, setAiHint] = useState('');
    const [isHintLoading, setIsHintLoading] = useState(false);

    // --- APE State ---
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [codeChurn, setCodeChurn] = useState<number>(0);
    const [copyPasteActivity, setCopyPasteActivity] = useState<number>(0);
    const prevFileContentRef = useRef<string>("");
    const totalTypedCharsRef = useRef<number>(0);
    const pastedCharsRef = useRef<number>(0);
    
    // --- Refs ---
    const editorRef = useRef<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const term = useRef<Terminal | null>(null);
    // const terminalRef = useRef<HTMLDivElement>(null);
    const queryParams = new URLSearchParams(location.search);
    const teacherSessionId = queryParams.get('sessionId');
    const isLiveHomework = !!teacherSessionId;

    const activeFile = files.find(f => f.id === activeFileId);

    // --- WebSocket Connection & Invisible Terminal ---
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token || !lessonId) return;

        const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

        const terminalSessionId = crypto.randomUUID();
        
        const wsUrl = `${wsBaseUrl}?sessionId=${terminalSessionId}&token=${token}`;
            
        const currentWs = new WebSocket(wsUrl);
        ws.current = currentWs;

        currentWs.onopen = () => {
            console.log(`WebSocket connected. Mode: ${isLiveHomework ? 'Live Homework' : 'Standalone'}`);
            if (isLiveHomework) {
                currentWs.send(JSON.stringify({ type: 'HOMEWORK_JOIN' }));
            }
        };
        
        currentWs.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'TERMINAL_OUT') {
                    term.current?.write(message.payload);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        return () => {
            currentWs.close();
        };
    }, [lessonId, isLiveHomework, teacherSessionId]);

    // --- Data Fetching for the entire IDE ---
    useEffect(() => {
        const fetchIdeData = async () => {
            if (!lessonId) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
                const data: AscentIdeData = response.data;
                setIdeData(data);
                setFiles(data.files || []);
                setSubmission(data.gradedSubmission || null); // <-- ADD THIS LINE

                setActiveFileId(data.files?.[0]?.id || null);
                
                if (data.submissionHistory.some(s => s.is_correct)) {
                    setIsSolutionUnlocked(true);
                }

                analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });
                setStartTime(Date.now());
                setCodeChurn(0);
                setCopyPasteActivity(0);
                totalTypedCharsRef.current = 0;
                pastedCharsRef.current = 0;
                prevFileContentRef.current = data.files?.[0]?.content || "";

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchIdeData();
    }, [lessonId]);
    
    // --- Analytics: Paste Event Listener ---
    useEffect(() => {
        const editor = editorRef.current;
        if (editor) {
            const pasteListener = editor.onDidPaste((e: any) => {
                const pastedText = e.text || '';
                const pastedLength = pastedText.length;
                
                pastedCharsRef.current += pastedLength;
                totalTypedCharsRef.current += pastedLength;
                
                if (totalTypedCharsRef.current > 0) {
                    setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
                }
                
                analytics.track('Code Pasted', {
                    character_count: pastedLength,
                    line_count: pastedText.split('\n').length,
                    active_file: activeFile?.filename,
                    lesson_id: lessonId,
                });
            });
            return () => pasteListener.dispose();
        }
    }, [editorRef.current, activeFile, lessonId]);


    // --- Core Handlers ---
    const handleFileContentChange = (content: string | undefined) => {
        const newContent = content || '';
        const churn = Math.abs((newContent.split('\n').length) - (prevFileContentRef.current.split('\n').length));
        setCodeChurn(prev => prev + churn);
        
        const charDiff = newContent.length - prevFileContentRef.current.length;
        if (charDiff > 0) {
            totalTypedCharsRef.current += charDiff;
            if (totalTypedCharsRef.current > 0) {
                setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
            }
        }
        
        prevFileContentRef.current = newContent;
        
        const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: newContent } : file);
        setFiles(updatedFiles);

        if (isLiveHomework && ws.current?.readyState === WebSocket.OPEN) {
            const broadcastFiles = updatedFiles.map(f => ({ name: f.filename, language: 'javascript', content: f.content }));
            const broadcastActiveFile = files.find(f => f.id === activeFileId)?.filename || '';
            ws.current.send(JSON.stringify({
                type: 'HOMEWORK_CODE_UPDATE',
                payload: { files: broadcastFiles, activeFileName: broadcastActiveFile }
            }));
        }
    };

    const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

    const handleSwitchFile = (fileId: string) => {
        const newActiveFile = files.find(f => f.id === fileId);
        if (newActiveFile) {
            prevFileContentRef.current = newActiveFile.content;
            setActiveFileId(fileId);
        }
    };

    const handleAddFile = () => {
        const newFileName = prompt("Enter new file name (e.g., helpers.js):");
        if (newFileName && !files.some(f => f.filename === newFileName)) {
            const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
            setFiles([...files, newFile]);
            setActiveFileId(newFile.id);
        } else if (newFileName) {
            toast.error("A file with that name already exists.");
        }
    };

    const handleDeleteFile = (fileIdToDelete: string) => {
        if (files.length <= 1) {
            toast.warning("You must have at least one file.");
            return;
        }
        const newFiles = files.filter(f => f.id !== fileIdToDelete);
        setFiles(newFiles);
        if (activeFileId === fileIdToDelete) {
            setActiveFileId(newFiles[0].id);
        }
    };

    const handleSaveCode = async () => {
        if (!lessonId) return;
        setIsSaving(true);
        const savePromise = apiClient.post(`/api/lessons/${lessonId}/save-progress`, { files }).then(res => res.data);
        
        toast.promise(savePromise, {
            loading: 'Saving your progress...',
            success: 'Progress saved!',
            error: 'Could not save progress.',
        });
        
        savePromise.finally(() => setIsSaving(false));
    };

    const handleRunTests = async () => {
        if (!lessonId) return;
        setIsTesting(true);
        setDiagnosticsTab('results');
        setTestResults(null);
        try {
            const response = await apiClient.post(`/api/lessons/${lessonId}/run-tests`, { files });
            const data: TestResult = response.data;
            setTestResults(data);
            analytics.track('Test Run Executed', { passed_count: data.passed, failed_count: data.failed, lesson_id: lessonId });
        } catch (err) {
            const results = err instanceof Error ? err.message : 'An unknown error occurred.';
            setTestResults({ passed: 0, failed: 1, total: 1, results });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleSubmit = async () => {
        if (!lessonId) return;
        setIsSubmitting(true);
        setDiagnosticsTab('results');
        setConceptualHint(null);
        
        const submissionPayload = {
            files,
            time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
            code_churn: codeChurn,
            copy_paste_activity: copyPasteActivity,
        };
        
        analytics.track('Solution Submitted', submissionPayload);
        
        await handleRunTests();

        try {
            const response = await apiClient.post(`/api/lessons/${lessonId}/submit`, submissionPayload);
            const result = response.data;
            toast.success("Correct! All tests passed.");
            setIsSolutionUnlocked(true);
            
            // Refetch data to update submission history
            const newDataResponse = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
            setIdeData(newDataResponse.data);

            if (result.feedback_type === 'conceptual_hint' && result.message) {
                setConceptualHint(result.message);
                setDiagnosticsTab('aiFeedback');
                toast.info("The AI has some feedback on your approach.");
            }
            
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGetHint = async () => {
        if (!editorRef.current || !ideData || !activeFile) return;
        
        analytics.track('Hint Requested', { lesson_id: ideData.lesson.id, active_file: activeFile.filename, tutor_style_used: tutorStyle });

        const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        if (!selectedCode.trim()) {
            toast.info("Please select a piece of code to get a hint for.");
            return;
        }
        
        setIsHintModalOpen(true);
        setIsHintLoading(true);
        setAiHint('');
        let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
        if (tutorStyle === 'hint_based') { promptModifier = "The student seems to be struggling. Provide a more direct hint."; }
        else if (tutorStyle === 'direct') { promptModifier = "The student needs a direct explanation. Explain the concept and provide a corrected code snippet."; }

        const payload = { selectedCode: activeFile.content, lessonId: ideData.lesson.id, promptModifier };

        try {
            const response = await apiClient.post('/api/ai/get-hint', payload);
            setAiHint(response.data.hint);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'The AI assistant could not provide a hint.';
            setAiHint(`Error: ${errorMessage}`);
        } finally {
            setIsHintLoading(false);
        }
    };

    const handleNavigation = (targetLessonId: string | null) => {
        if (targetLessonId) {
            navigate(`/lesson/${targetLessonId}`);
        }
    };
    
    if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Ascent IDE...</div>;
    if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
    return (
        <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
            <Toaster theme="dark" richColors position="bottom-right" />
            {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
            
            {/* Compact Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm z-30 gap-2 min-h-[48px]">
                <div className="flex items-center gap-2 flex-shrink min-w-0">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 flex-shrink-0 h-7 px-2 text-xs">
                        <ChevronLeft className="mr-1 h-3 w-3" /> Back
                    </Button>
                    <span className="text-slate-500 flex-shrink-0 text-sm">/</span>
                    <h1 className="text-sm font-medium text-slate-200 truncate" title={ideData.lesson.title}>{ideData.lesson.title}</h1>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.previousLessonId)} disabled={!ideData.previousLessonId} className="hover:bg-slate-800 h-7 w-7">
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.nextLessonId)} disabled={!ideData.nextLessonId || !isSolutionUnlocked} className={cn("hover:bg-slate-700 h-7 w-7", !isSolutionUnlocked && "text-slate-600", isSolutionUnlocked && "text-cyan-400 bg-cyan-900/50 hover:bg-cyan-900/80 animate-pulse")}>
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 px-2 text-xs">
                        <Save className="mr-1 h-3 w-3"/>Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 h-7 px-2 text-xs">
                        <BrainCircuit className="mr-1 h-3 w-3"/>Hint
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRunTests} disabled={isTesting} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20 h-7 px-2 text-xs">
                        <BeakerIcon className="mr-1 h-3 w-3"/>Run
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 px-2 text-xs">
                        <Send className="mr-1 h-3 w-3"/>Submit
                    </Button>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-hidden">
                <PanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel - Mission Control */}
                    <Panel defaultSize={30} minSize={25} maxSize={45} className="flex flex-col bg-slate-900/40 border-r border-slate-800 overflow-hidden">
                         <div className="px-2 py-1 flex-shrink-0 border-b border-slate-800">
                            <Tabs value={missionControlTab} onValueChange={(v) => setMissionControlTab(v as MissionControlTab)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-slate-900 h-8">
                                    <TabsTrigger value="problem" className="text-xs px-1">
                                        <NotebookPen className="mr-1 h-3 w-3"/>Problem
                                    </TabsTrigger>
                                    <TabsTrigger value="submissions" className="text-xs px-1">
                                        <History className="mr-1 h-3 w-3"/>History
                                    </TabsTrigger>
                                    <TabsTrigger value="solution" disabled={!isSolutionUnlocked} className="text-xs px-1">
                                        <FileCode className="mr-1 h-3 w-3"/>Solution
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 prose prose-sm prose-invert prose-slate max-w-none">
                            {missionControlTab === 'problem' && (
                                <div className="text-sm [&>h1]:text-base [&>h1]:font-medium [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-medium [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-sm [&>p]:leading-relaxed [&>li]:text-sm [&>code]:text-xs [&>pre]:text-xs">
                                    <ReactMarkdown>
                                        {ideData.lesson.description}
                                    </ReactMarkdown>
                                </div>
                            )}
                             {submission && (
                <FeedbackCard submission={submission} />
            )}
                            {missionControlTab === 'submissions' && (
                                <div className="space-y-2">
                                    {ideData.submissionHistory.length > 0 ? ideData.submissionHistory.map(sub => (
                                        <div key={sub.id} className="p-2 bg-slate-900/50 rounded border border-slate-700 text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={cn("font-medium", sub.is_correct ? 'text-green-400' : 'text-red-400')}>
                                                    {sub.is_correct ? 'Passed' : 'Failed'}
                                                </span>
                                                <span className="text-slate-400 text-xs">{format(new Date(sub.submitted_at), 'MMM d, HH:mm')}</span>
                                            </div>
                                            {(sub.time_taken || sub.code_churn || sub.copy_paste_activity) && (
                                                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                                                    {sub.time_taken && (
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-500">Time</span>
                                                            <span className="text-slate-300">{sub.time_taken}m</span>
                                                        </div>
                                                    )}
                                                    {sub.code_churn !== undefined && (
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-500">Churn</span>
                                                            <span className="text-slate-300">{sub.code_churn}</span>
                                                        </div>
                                                    )}
                                                    {sub.copy_paste_activity !== undefined && (
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-500">Copy%</span>
                                                            <span className={cn("text-slate-300", sub.copy_paste_activity > 50 && "text-yellow-400")}>{sub.copy_paste_activity}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )) : <p className="text-slate-500 text-center p-3 text-xs">No submissions yet.</p>}
                                </div>
                            )}
                            {missionControlTab === 'solution' && (
                                <div className="text-sm [&>h1]:text-base [&>h1]:font-medium [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-medium [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-sm [&>p]:leading-relaxed [&>li]:text-sm [&>code]:text-xs [&>pre]:text-xs">
                                    <ReactMarkdown>
                                        {ideData.officialSolution?.explanation || "Solution not available."}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </Panel>
                    
                    <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0" />
                    
                    {/* Right Panel - Code & Results */}
                    <Panel defaultSize={70} minSize={55} className="flex flex-col overflow-hidden">
                        <div className="h-full flex relative overflow-hidden">
                            {/* File Explorer Sheet */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute top-2 left-2 z-20 h-6 w-6 bg-slate-800/50 hover:bg-slate-700 flex-shrink-0">
                                        <PanelLeft className="h-3 w-3" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-3 bg-slate-900/90 backdrop-blur-xl border-slate-700 text-white w-64">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-slate-300">Files</h3>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddFile}>
                                                <FilePlus2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            {files.map(file => (
                                                <div key={file.id} className="group flex items-center">
                                                    <button 
                                                        onClick={() => handleSwitchFile(file.id)} 
                                                        className={cn(
                                                            "w-full text-left px-2 py-1.5 text-sm rounded flex items-center transition-colors",
                                                            activeFileId === file.id ? "bg-cyan-500/10 text-cyan-300" : "hover:bg-slate-800 text-slate-300"
                                                        )}
                                                    >
                                                        <FileIcon className="mr-2 h-3 w-3 flex-shrink-0" /> 
                                                        <span className="truncate">{file.filename}</span>
                                                    </button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0" 
                                                        onClick={() => handleDeleteFile(file.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-500"/>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                            
                            <PanelGroup direction="vertical" className="w-full">
                                {/* Code Editor */}
                                <Panel defaultSize={65} minSize={35} className="overflow-hidden">
                                    <div className="w-full h-full overflow-hidden">
                                        <Editor
                                            height="100%"
                                            path={activeFile?.filename}
                                            language={activeFile?.filename.split('.').pop() || 'javascript'}
                                            theme="vs-dark"
                                            value={activeFile?.content}
                                            onChange={handleFileContentChange}
                                            onMount={handleEditorDidMount}
                                            options={{ 
                                                fontSize: 13, 
                                                minimap: { enabled: false }, 
                                                padding: { top: 12 },
                                                scrollBeyondLastLine: false,
                                                wordWrap: 'on',
                                                automaticLayout: true,
                                                scrollbar: {
                                                    horizontal: 'hidden',
                                                    vertical: 'auto'
                                                }
                                            }}
                                        />
                                    </div>
                                </Panel>
                                
                                <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0" />
                                
                                {/* Bottom Panel - Test Results */}
                                <Panel defaultSize={35} minSize={20} className="flex flex-col bg-slate-900/40 overflow-hidden">
                                    <Tabs value={diagnosticsTab} onValueChange={(v) => setDiagnosticsTab(v as DiagnosticsTab)} className="flex flex-col h-full">
                                        <TabsList className="grid w-full grid-cols-3 bg-slate-900 flex-shrink-0 h-8 mx-2 mt-1">
                                            <TabsTrigger value="testCases" className="text-xs px-1">
                                                <Check className="mr-1 h-3 w-3"/>Cases
                                            </TabsTrigger>
                                            <TabsTrigger value="results" className="text-xs px-1">
                                                <BeakerIcon className="mr-1 h-3 w-3"/>Results
                                            </TabsTrigger>
                                            <TabsTrigger value="aiFeedback" className={cn("text-xs px-1", conceptualHint && "text-fuchsia-400 animate-pulse")}>
                                                <BotMessageSquare className="mr-1 h-3 w-3"/>AI
                                            </TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="testCases" className="flex-grow overflow-y-auto p-2 text-sm m-0">
                                            <div className="space-y-2">
                                                {ideData.testCases.map((tc, i) => (
                                                    <div key={i} className="p-2 bg-slate-900/50 rounded border border-slate-700">
                                                        <p className="font-medium text-slate-300 mb-1 text-xs">{tc.description}</p>
                                                        <div className="font-mono text-xs space-y-1">
                                                            <div className="flex flex-wrap">
                                                                <span className="text-slate-500 mr-1">Input:</span>
                                                                <code className="text-cyan-300 break-all">{tc.input}</code>
                                                            </div>
                                                            <div className="flex flex-wrap">
                                                                <span className="text-slate-500 mr-1">Expected:</span>
                                                                <code className="text-cyan-300 break-all">{tc.expectedOutput}</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TabsContent>
                                        
                                        <TabsContent value="results" className="flex-grow overflow-y-auto p-2 font-mono text-xs m-0">
                                            {isTesting ? (
                                                <div className="flex items-center justify-center h-full text-slate-400">
                                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
                                                    Running tests...
                                                </div>
                                            ) : testResults ? (
                                                <div className="space-y-2">
                                                    <div className={cn(
                                                        'p-2 rounded font-medium flex items-center gap-2 text-xs',
                                                        testResults.failed > 0 ? 'bg-red-950/40 text-red-300 border border-red-500/30' : 'bg-green-950/40 text-green-300 border border-green-500/30'
                                                    )}>
                                                        {testResults.failed > 0 ? (
                                                            <><XCircle className="h-4 w-4"/>{`${testResults.failed} / ${testResults.total} Tests Failed`}</>
                                                        ) : (
                                                            <><CheckCircle className="h-4 w-4"/>{`All ${testResults.total} Tests Passed!`}</>
                                                        )}
                                                    </div>
                                                    <div className="bg-black/40 p-2 rounded border border-slate-700 overflow-auto max-h-40">
                                                        <pre className="whitespace-pre-wrap text-xs leading-relaxed break-words">{testResults.results}</pre>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-500 text-center">
                                                    <div>
                                                        <BeakerIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-xs">Run tests to see results</p>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                        
                                        <TabsContent value="aiFeedback" className="flex-grow overflow-y-auto p-2 prose prose-sm prose-invert prose-slate max-w-none m-0">
                                            {conceptualHint ? (
                                                <div className="text-xs [&>h1]:text-sm [&>h1]:font-medium [&>h1]:mb-1 [&>h2]:text-sm [&>h2]:font-medium [&>h2]:mb-1 [&>h3]:text-xs [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-xs [&>p]:leading-relaxed [&>li]:text-xs [&>code]:text-xs [&>pre]:text-xs break-words">
                                                    <ReactMarkdown>
                                                        {conceptualHint}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-500 text-center">
                                                    <div>
                                                        <BotMessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-xs">Submit a correct solution to receive AI feedback</p>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </Panel>
                            </PanelGroup>
                        </div>
                    </Panel>
                </PanelGroup>
            </main>
        </div>
    );
};

export default AscentIDE;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   AscentIDE.tsx (Final, Complete - Replaces ViewLessonPage)
//  * =================================================================
//  * DESCRIPTION: This is the complete and final version of the Ascent IDE.
//  * It uses a professional, resizable three-panel layout that definitively
//  * solves all page scrolling issues. It maintains 100% functional parity
//  * with the original ViewLessonPage, including all state, handlers, modals,
//  * WebSockets, and APE/analytics integrations.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { AscentIdeData, LessonFile, TestResult, SubmissionHistory } from '../types/index.ts';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';
// import { format } from 'date-fns';

// // --- APE & Analytics ---
// import analytics from '../services/analyticsService.ts';
// import { useApeStore } from '../stores/apeStore';

// // --- UI Components & Icons ---
// import { Button } from "@/components/ui/button";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { Toaster, toast } from 'sonner';
// import {
//     ChevronLeft, BeakerIcon, CheckCircle, XCircle, File as FileIcon,
//     BrainCircuit, Send, ChevronRight, History,
//     FileCode, BotMessageSquare, NotebookPen, Check, FilePlus2, Trash2, ArrowLeftRight, Save, PanelLeft
// } from 'lucide-react';


// // --- Type Definitions for this component ---
// type MissionControlTab = "problem" | "testCases" | "submissions" | "solution";
// type DiagnosticsTab = "results" | "aiFeedback";

// // --- Hint Modal Component ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-3 text-fuchsia-300"><BrainCircuit /> AI Oracle</AlertDialogTitle>
//                 <AlertDialogDescription as="div" className="pt-4 text-slate-300">
//                     {isLoading ? "Consulting the Oracle..." : <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-4 rounded-md whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
// );


// // --- Main Ascent IDE Component ---
// const AscentIDE: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const tutorStyle = useApeStore((state) => state.tutorStyle);

//     // --- State Management ---
//     const [ideData, setIdeData] = useState<AscentIdeData | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [missionControlTab, setMissionControlTab] = useState<MissionControlTab>('problem');
//     const [diagnosticsTab, setDiagnosticsTab] = useState<DiagnosticsTab>('results');
//     const [isSolutionUnlocked, setIsSolutionUnlocked] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isTesting, setIsTesting] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);

//     // --- APE State ---
//     const [startTime, setStartTime] = useState<number>(Date.now());
//     const [codeChurn, setCodeChurn] = useState<number>(0);
//     const prevFileContentRef = useRef<string>("");
    
//     // --- Refs ---
//     const editorRef = useRef<any>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const term = useRef<Terminal | null>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection & Invisible Terminal ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !lessonId) return;

//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = isLiveHomework
//             ? `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
//             : `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}`;
            
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => {
//             console.log(`WebSocket connected. Mode: ${isLiveHomework ? 'Live Homework' : 'Standalone'}`);
//             if (isLiveHomework) {
//                 currentWs.send(JSON.stringify({ type: 'HOMEWORK_JOIN' }));
//             }
//         };
        
//         // This is still needed if the backend execution service writes to the terminal
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     // Even if invisible, the terminal buffer can be useful
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//         };
//     }, [lessonId, isLiveHomework, teacherSessionId]);

//     // --- Data Fetching for the entire IDE ---
//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             setError(null);
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errData = await response.json();
//                     throw new Error(errData.error || 'Failed to load Ascent IDE data.');
//                 }
                
//                 const data: AscentIdeData = await response.json();
//                 setIdeData(data);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);
                
//                 if (data.submissionHistory.some(s => s.is_correct)) {
//                     setIsSolutionUnlocked(true);
//                 }

//                 analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });
//                 setStartTime(Date.now());
//                 setCodeChurn(0);
//                 prevFileContentRef.current = data.files?.[0]?.content || "";

//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'Unknown error');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchIdeData();
//     }, [lessonId]);
    
//     // --- Analytics: Paste Event Listener ---
//     useEffect(() => {
//         const editor = editorRef.current;
//         if (editor) {
//             const pasteListener = editor.onDidPaste((e: any) => {
//                 const pastedText = e.text || '';
//                 analytics.track('Code Pasted', {
//                     character_count: pastedText.length,
//                     line_count: pastedText.split('\n').length,
//                     active_file: activeFile?.filename,
//                     lesson_id: lessonId,
//                 });
//             });
//             return () => pasteListener.dispose();
//         }
//     }, [editorRef.current, activeFile, lessonId]);


//     // --- Core Handlers ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const newContent = content || '';
//         const churn = Math.abs((newContent.split('\n').length) - (prevFileContentRef.current.split('\n').length));
//         setCodeChurn(prev => prev + churn);
//         prevFileContentRef.current = newContent;
        
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: newContent } : file);
//         setFiles(updatedFiles);

//         if (isLiveHomework && ws.current?.readyState === WebSocket.OPEN) {
//             const broadcastFiles = updatedFiles.map(f => ({ name: f.filename, language: 'javascript', content: f.content }));
//             const broadcastActiveFile = files.find(f => f.id === activeFileId)?.filename || '';
//             ws.current.send(JSON.stringify({
//                 type: 'HOMEWORK_CODE_UPDATE',
//                 payload: { files: broadcastFiles, activeFileName: broadcastActiveFile }
//             }));
//         }
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleSwitchFile = (fileId: string) => {
//         const newActiveFile = files.find(f => f.id === fileId);
//         if (newActiveFile) {
//             prevFileContentRef.current = newActiveFile.content;
//             setActiveFileId(fileId);
//         }
//     };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             toast.error("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             toast.warning("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);
//         const token = localStorage.getItem('authToken');
//         toast.promise(
//             fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             }).then(res => {
//                 if (!res.ok) throw new Error('Failed to save.');
//                 return res.json();
//             }),
//             {
//                 loading: 'Saving your progress...',
//                 success: 'Progress saved!',
//                 error: 'Could not save progress.',
//             }
//         ).finally(() => setIsSaving(false));
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setDiagnosticsTab('results');
//         setTestResults(null);
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/run-tests`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });
//             const data: TestResult = await response.json();
//             setTestResults(data);
//             analytics.track('Test Run Executed', { passed_count: data.passed, failed_count: data.failed, lesson_id: lessonId });
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleSubmit = async () => {
//         if (!lessonId) return;
//         setIsSubmitting(true);
//         setDiagnosticsTab('results');
//         setConceptualHint(null);
//         const token = localStorage.getItem('authToken');
        
//         const submissionPayload = {
//             files,
//             time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
//             code_churn: codeChurn,
//         };
        
//         analytics.track('Solution Submitted', submissionPayload);
        
//         await handleRunTests();

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify(submissionPayload)
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Submission failed.');
//             }

//             const result = await response.json();
//             toast.success("Correct! All tests passed.");
//             setIsSolutionUnlocked(true);
            
//             // Refetch data to update submission history
//             const newDataResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, { headers: { 'Authorization': `Bearer ${token}` } });
//             setIdeData(await newDataResponse.json());

//             if (result.feedback_type === 'conceptual_hint' && result.message) {
//                 setConceptualHint(result.message);
//                 setDiagnosticsTab('aiFeedback');
//                 toast.info("The AI has some feedback on your approach.");
//             }
            
//         } catch (err) {
//             toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !ideData || !activeFile) return;
        
//         analytics.track('Hint Requested', { lesson_id: ideData.lesson.id, active_file: activeFile.filename, tutor_style_used: tutorStyle });

//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             toast.info("Please select a piece of code to get a hint for.");
//             return;
//         }
        
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');

//         let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
//         if (tutorStyle === 'hint_based') { promptModifier = "The student seems to be struggling. Provide a more direct hint."; }
//         else if (tutorStyle === 'direct') { promptModifier = "The student needs a direct explanation. Explain the concept and provide a corrected code snippet."; }

//         const payload = { selectedCode: activeFile.content, lessonId: ideData.lesson.id, promptModifier };

//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify(payload)
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             setAiHint(err instanceof Error ? `Error: ${err.message}`: 'An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleNavigation = (targetLessonId: string | null) => {
//         if (targetLessonId) {
//             navigate(`/lesson/${targetLessonId}`);
//         }
//     };
    
//     if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Ascent IDE...</div>;
//     if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
//     return (
//         <div className="h-screen w-screen bg-[#0a091a] text-white grid grid-rows-[auto_1fr] font-sans overflow-hidden">
//             <Toaster theme="dark" richColors position="bottom-right" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
            
//             <header className="row-start-1 row-end-2 flex items-center justify-between p-1 pr-3 border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm z-30 gap-3">
//                 <div className="flex items-center gap-1 flex-shrink min-w-0">
//                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 flex-shrink-0 h-8 px-2"><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
//                     <span className="text-slate-500 flex-shrink-0">/</span>
//                     <h1 className="text-sm font-semibold text-slate-200 truncate" title={ideData.lesson.title}>{ideData.lesson.title}</h1>
//                 </div>
//                 <div className="flex items-center gap-1.5 flex-shrink-0">
//                     <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.previousLessonId)} disabled={!ideData.previousLessonId} className="hover:bg-slate-800 h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
//                     <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.nextLessonId)} disabled={!ideData.nextLessonId || !isSolutionUnlocked} className={cn("hover:bg-slate-700 h-8 w-8", !isSolutionUnlocked && "text-slate-600", isSolutionUnlocked && "text-cyan-400 bg-cyan-900/50 hover:bg-cyan-900/80 animate-pulse")}><ChevronRight className="h-4 w-4" /></Button>
//                     <Button variant="outline" size="sm" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-700 hover:bg-slate-800 h-8 px-3"><Save className="mr-1.5 h-4 w-4"/>Save</Button>
//                     <Button variant="outline" size="sm" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 h-8 px-3"><BrainCircuit className="mr-1.5 h-4 w-4"/>Get Hint</Button>
//                     <Button variant="outline" size="sm" onClick={handleRunTests} disabled={isTesting} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20 h-8 px-3"><BeakerIcon className="mr-1.5 h-4 w-4"/>Run</Button>
//                     <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold h-8 px-3"><Send className="mr-1.5 h-4 w-4"/>Submit</Button>
//                 </div>
//             </header>

//             <main className="row-start-2 row-end-3 min-h-0">
//                 <PanelGroup direction="horizontal">
//                     <Panel defaultSize={33} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800 overflow-hidden">
//                          <div className="p-1 flex-shrink-0 border-b border-slate-800">
//                             <Tabs value={missionControlTab} onValueChange={(v) => setMissionControlTab(v as MissionControlTab)} className="w-full">
//                                 <TabsList className="grid w-full grid-cols-3 bg-slate-900 h-9">
//                                     <TabsTrigger value="problem" className="text-xs"><NotebookPen className="mr-1.5 h-4 w-4"/>Problem</TabsTrigger>
//                                     <TabsTrigger value="submissions" className="text-xs"><History className="mr-1.5 h-4 w-4"/>Submissions</TabsTrigger>
//                                     <TabsTrigger value="solution" disabled={!isSolutionUnlocked} className="text-xs"><FileCode className="mr-1.5 h-4 w-4"/>Solution</TabsTrigger>
//                                 </TabsList>
//                             </Tabs>
//                         </div>
//                         <div className="flex-grow overflow-y-auto p-3 prose prose-sm prose-invert prose-slate">
//                             {missionControlTab === 'problem' && <ReactMarkdown>{ideData.lesson.description}</ReactMarkdown>}
//                             {missionControlTab === 'submissions' && (
//                                 <ul className="space-y-2 list-none p-0 m-0">
//                                     {ideData.submissionHistory.length > 0 ? ideData.submissionHistory.map(sub => (
//                                         <li key={sub.id} className="p-2 bg-slate-900/50 rounded-md border border-slate-700 text-xs">
//                                             <div className="flex justify-between items-center">
//                                                 <span className={cn("font-semibold", sub.is_correct ? 'text-green-400' : 'text-red-400')}>{sub.is_correct ? 'Passed' : 'Failed'}</span>
//                                                 <span className="text-slate-400">{format(new Date(sub.submitted_at), 'Pp')}</span>
//                                             </div>
//                                         </li>
//                                     )) : <p className="text-slate-500 text-center p-4">No submission history.</p>}
//                                 </ul>
//                             )}
//                             {missionControlTab === 'solution' && <ReactMarkdown>{ideData.officialSolution?.explanation || "Solution not available."}</ReactMarkdown>}
//                         </div>
//                     </Panel>
                    
//                     <PanelResizeHandle className="w-1.5 bg-slate-800 hover:bg-slate-700 transition-colors" />
                    
//                     <Panel defaultSize={67} minSize={40}>
//                         <div className="h-full flex relative">
//                             <Sheet>
//                                 <SheetTrigger asChild>
//                                     <Button variant="ghost" size="icon" className="absolute top-1.5 left-1.5 z-20 h-7 w-7 bg-slate-800/50 hover:bg-slate-700">
//                                         <PanelLeft className="h-4 w-4" />
//                                     </Button>
//                                 </SheetTrigger>
//                                 <SheetContent side="left" className="p-2 bg-slate-900/80 backdrop-blur-xl border-slate-700 text-white w-60">
//                                     <div className="p-2">
//                                         <div className="flex-shrink-0 flex items-center justify-between mb-2">
//                                             <h3 className="text-sm font-bold text-slate-400 px-2 uppercase">Files</h3>
//                                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddFile}><FilePlus2 className="h-4 w-4" /></Button>
//                                         </div>
//                                         <ul className="space-y-1">
//                                             {files.map(file => (
//                                                 <li key={file.id} className="group flex items-center">
//                                                     <button onClick={() => handleSwitchFile(file.id)} className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md flex items-center", activeFileId === file.id ? "bg-cyan-500/10 text-cyan-300" : "hover:bg-slate-800 text-slate-300")}>
//                                                         <FileIcon className="mr-2 h-4 w-4" /> {file.filename}
//                                                     </button>
//                                                     <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500"/></Button>
//                                                 </li>
//                                             ))}
//                                         </ul>
//                                     </div>
//                                 </SheetContent>
//                             </Sheet>
                            
//                             <PanelGroup direction="vertical">
//                                 <Panel defaultSize={70} minSize={30}>
//                                     <Editor
//                                         height="100%"
//                                         path={activeFile?.filename}
//                                         language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                         theme="vs-dark"
//                                         value={activeFile?.content}
//                                         onChange={handleFileContentChange}
//                                         onMount={handleEditorDidMount}
//                                         options={{ fontSize: 13, minimap: { enabled: false }, padding: { top: 12 } }}
//                                     />
//                                 </Panel>
//                                 <PanelResizeHandle className="h-1.5 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                                 <Panel defaultSize={30} minSize={15} className="flex flex-col bg-slate-900/40 p-1">
//                                     <Tabs value={diagnosticsTab} onValueChange={(v) => setDiagnosticsTab(v as DiagnosticsTab)} className="flex flex-col h-full">
//                                         <TabsList className="grid w-full grid-cols-3 bg-slate-900 flex-shrink-0 h-9">
//                                             <TabsTrigger value="testCases" className="text-xs"><Check className="mr-1.5 h-4 w-4"/>Test Cases</TabsTrigger>
//                                             <TabsTrigger value="results" className="text-xs"><BeakerIcon className="mr-1.5 h-4 w-4"/>Results</TabsTrigger>
//                                             <TabsTrigger value="aiFeedback" className={cn("text-xs", conceptualHint && "text-fuchsia-400 animate-pulse")}><BotMessageSquare className="mr-1.5 h-4 w-4"/>AI Feedback</TabsTrigger>
//                                         </TabsList>
//                                         <TabsContent value="testCases" className="flex-grow overflow-y-auto p-3 text-sm">
//                                             {ideData.testCases.map((tc, i) => (
//                                                 <div key={i} className="p-3 bg-slate-900/50 rounded-md border border-slate-700 mb-3">
//                                                     <p className="font-semibold text-slate-300 mb-2">{tc.description}</p>
//                                                     <div className="font-mono text-xs">
//                                                         <p><span className="text-slate-500">Input: </span><code className="text-cyan-300">{tc.input}</code></p>
//                                                         <p><span className="text-slate-500">Expected: </span><code className="text-cyan-300">{tc.expectedOutput}</code></p>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </TabsContent>
//                                         <TabsContent value="results" className="flex-grow overflow-y-auto p-3 font-mono text-xs">
//                                             {isTesting ? "Running tests..." : testResults ? (
//                                                 <div>
//                                                     <div className={cn('p-2 rounded font-bold flex items-center gap-2 mb-2', testResults.failed > 0 ? 'bg-red-950/40 text-red-300' : 'bg-green-950/40 text-green-300')}>
//                                                         {testResults.failed > 0 ? <><XCircle/>{`${testResults.failed} / ${testResults.total} Tests Failed`}</> : <><CheckCircle/>{`All ${testResults.total} Tests Passed!`}</>}
//                                                     </div>
//                                                     <pre className="whitespace-pre-wrap">{testResults.results}</pre>
//                                                 </div>
//                                             ) : "Run tests to see the results here."}
//                                         </TabsContent>
//                                         <TabsContent value="aiFeedback" className="flex-grow overflow-y-auto p-3 prose prose-sm prose-invert prose-slate">
//                                             {conceptualHint ? <ReactMarkdown>{conceptualHint}</ReactMarkdown> : "Submit a correct solution to receive conceptual feedback from the AI."}
//                                         </TabsContent>
//                                     </Tabs>
//                                 </Panel>
//                             </PanelGroup>
//                         </div>
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default AscentIDE;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   AscentIDE.tsx (Final, Complete Implementation)
//  * =================================================================
//  * DESCRIPTION: This is the complete CoreZenith Ascent IDE. It merges
//  * the professional three-zone layout with all original functionality
//  * from ViewLessonPage, including WebSockets, modals, file management,
//  * analytics, and APE integration for a true 1:1 feature parity.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { AscentIdeData, LessonFile, TestResult, SubmissionHistory } from '../types/index.ts';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';
// import { format } from 'date-fns';

// // --- APE & Analytics ---
// import analytics from '../services/analyticsService.ts';
// import { useApeStore } from '../stores/apeStore';

// // --- UI Components & Icons ---
// import { Button } from "@/components/ui/button";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Toaster, toast } from 'sonner';
// import {
//     ChevronLeft, BeakerIcon, CheckCircle, XCircle, File as FileIcon,
//     BrainCircuit, Send, ChevronRight, History,
//     FileCode, BotMessageSquare, NotebookPen, Check, FilePlus2, Trash2, ArrowLeftRight
// } from 'lucide-react';

// // --- Type Definitions for this component ---
// type MissionControlTab = "problem" | "testCases" | "submissions" | "solution";
// type DiagnosticsTab = "results" | "aiFeedback";

// // --- Hint Modal Component ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-3 text-fuchsia-300"><BrainCircuit /> AI Oracle</AlertDialogTitle>
//                 <AlertDialogDescription as="div" className="pt-4 text-slate-300">
//                     {isLoading ? "Consulting the Oracle..." : <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-4 rounded-md whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
// );


// // --- Main Ascent IDE Component ---
// const AscentIDE: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const tutorStyle = useApeStore((state) => state.tutorStyle);

//     // --- State Management ---
//     const [ideData, setIdeData] = useState<AscentIdeData | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [missionControlTab, setMissionControlTab] = useState<MissionControlTab>('problem');
//     const [diagnosticsTab, setDiagnosticsTab] = useState<DiagnosticsTab>('results');
//     const [isSolutionUnlocked, setIsSolutionUnlocked] = useState(false);
//     const [isTesting, setIsTesting] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);

//     // --- APE State ---
//     const [startTime, setStartTime] = useState<number>(Date.now());
//     const [codeChurn, setCodeChurn] = useState<number>(0);
//     const prevFileContentRef = useRef<string>("");
    
//     // --- Refs ---
//     const editorRef = useRef<any>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const term = useRef<Terminal | null>(null); // Invisible terminal for WebSocket commands

//     // --- Live Homework Detection ---
//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection Logic (from ViewLessonPage) ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !lessonId) return;

//         const terminalSessionId = crypto.randomUUID(); 
//         const wsUrl = isLiveHomework
//             ? `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
//             : `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}`;
            
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => {
//             console.log(`WebSocket connected. Mode: ${isLiveHomework ? 'Live Homework' : 'Standalone'}`);
//             if (isLiveHomework) {
//                 currentWs.send(JSON.stringify({ type: 'HOMEWORK_JOIN' }));
//             }
//         };
        
//         return () => {
//             currentWs.close();
//         };
//     }, [lessonId, isLiveHomework, teacherSessionId]);

//     // --- Data Fetching for the entire IDE ---
//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             setError(null);
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errData = await response.json();
//                     throw new Error(errData.error || 'Failed to load Ascent IDE data.');
//                 }
                
//                 const data: AscentIdeData = await response.json();
//                 setIdeData(data);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);
                
//                 if (data.submissionHistory.some(s => s.is_correct)) {
//                     setIsSolutionUnlocked(true);
//                 }

//                 analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });
//                 setStartTime(Date.now());
//                 setCodeChurn(0);
//                 prevFileContentRef.current = data.files?.[0]?.content || "";

//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'Unknown error');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchIdeData();
//     }, [lessonId]);
    
//     // --- Analytics: Paste Event Listener ---
//     useEffect(() => {
//         const editor = editorRef.current;
//         if (editor) {
//             const pasteListener = editor.onDidPaste((e: any) => {
//                 const pastedText = e.text || '';
//                 analytics.track('Code Pasted', {
//                     character_count: pastedText.length,
//                     line_count: pastedText.split('\n').length,
//                     active_file: activeFile?.filename,
//                     lesson_id: lessonId,
//                 });
//             });
//             return () => pasteListener.dispose();
//         }
//     }, [editorRef.current, activeFile, lessonId]);


//     // --- Core Handlers (from ViewLessonPage, adapted for new UI) ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const newContent = content || '';
//         const churn = Math.abs((newContent.split('\n').length) - (prevFileContentRef.current.split('\n').length));
//         setCodeChurn(prev => prev + churn);
//         prevFileContentRef.current = newContent;
        
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: newContent } : file);
//         setFiles(updatedFiles);

//         if (isLiveHomework && ws.current?.readyState === WebSocket.OPEN) {
//             const broadcastFiles = updatedFiles.map(f => ({ name: f.filename, language: 'javascript', content: f.content }));
//             const broadcastActiveFile = files.find(f => f.id === activeFileId)?.filename || '';
//             ws.current.send(JSON.stringify({
//                 type: 'HOMEWORK_CODE_UPDATE',
//                 payload: { files: broadcastFiles, activeFileName: broadcastActiveFile }
//             }));
//         }
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleSwitchFile = (fileId: string) => {
//         const newActiveFile = files.find(f => f.id === fileId);
//         if (newActiveFile) {
//             prevFileContentRef.current = newActiveFile.content;
//             setActiveFileId(fileId);
//         }
//     };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             toast.error("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             toast.warning("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setDiagnosticsTab('results');
//         setTestResults(null);
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/run-tests`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });
//             const data: TestResult = await response.json();
//             setTestResults(data);
//             analytics.track('Test Run Executed', { passed_count: data.passed, failed_count: data.failed, lesson_id: lessonId });
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleSubmit = async () => {
//         if (!lessonId) return;
//         setIsSubmitting(true);
//         setDiagnosticsTab('results');
//         setConceptualHint(null);
//         const token = localStorage.getItem('authToken');
        
//         const submissionPayload = {
//             files,
//             time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
//             code_churn: codeChurn,
//         };
        
//         analytics.track('Solution Submitted', submissionPayload);
        
//         // Optimistically run tests to update the UI immediately
//         await handleRunTests();

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify(submissionPayload)
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Submission failed.');
//             }

//             const result = await response.json();
//             toast.success("Correct! All tests passed.");
//             setIsSolutionUnlocked(true);

//             if (result.feedback_type === 'conceptual_hint' && result.message) {
//                 setConceptualHint(result.message);
//                 setDiagnosticsTab('aiFeedback');
//                 toast.info("The AI has some feedback on your approach.");
//             }
            
//         } catch (err) {
//             toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !ideData || !activeFile) return;
        
//         analytics.track('Hint Requested', { lesson_id: ideData.lesson.id, active_file: activeFile.filename, tutor_style_used: tutorStyle });

//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             toast.info("Please select a piece of code to get a hint for.");
//             return;
//         }
        
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');

//         let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
//         if (tutorStyle === 'hint_based') { promptModifier = "The student seems to be struggling. Provide a more direct hint."; }
//         else if (tutorStyle === 'direct') { promptModifier = "The student needs a direct explanation. Explain the concept and provide a corrected code snippet."; }

//         const payload = { selectedCode: activeFile.content, lessonId: ideData.lesson.id, promptModifier };

//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify(payload)
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             setAiHint(err instanceof Error ? `Error: ${err.message}`: 'An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleNavigation = (targetLessonId: string | null) => {
//         if (targetLessonId) {
//             navigate(`/lesson/${targetLessonId}`);
//         }
//     };
    
//     // --- Render Logic ---
//     if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Ascent IDE...</div>;
//     if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;

//     return (
//         <div className="h-screen w-screen bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden">
//             <Toaster theme="dark" richColors position="bottom-right" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-slate-800 bg-slate-950/40 z-20">
//                 <div className="flex items-center gap-2">
//                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800"><ChevronLeft className="mr-1 h-4 w-4" /> Back to Course</Button>
//                     <span className="text-slate-500">/</span>
//                     <h1 className="text-md font-semibold text-slate-200">{ideData.lesson.title}</h1>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && <Button variant="outline" size="sm" onClick={() => navigate(`/session/${teacherSessionId}`)} className="text-yellow-300 border-yellow-500/80 hover:bg-yellow-500/20"><ArrowLeftRight className="mr-2 h-4 w-4" />Live Session</Button>}
//                     <Button variant="ghost" size="sm" onClick={() => handleNavigation(ideData.previousLessonId)} disabled={!ideData.previousLessonId} className="hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></Button>
//                     <Button variant="ghost" size="sm" onClick={() => handleNavigation(ideData.nextLessonId)} disabled={!ideData.nextLessonId || !isSolutionUnlocked} className={cn(!isSolutionUnlocked && "text-slate-600", isSolutionUnlocked && "text-cyan-400 animate-pulse")}><ChevronRight className="h-4 w-4" /></Button>
//                     <Button variant="outline" size="sm" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20"><BrainCircuit className="mr-2 h-4 w-4"/>Get Hint</Button>
//                     <Button variant="outline" size="sm" onClick={handleRunTests} disabled={isTesting} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20"><BeakerIcon className="mr-2 h-4 w-4"/>Run Tests</Button>
//                     <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold"><Send className="mr-2 h-4 w-4"/>Submit Solution</Button>
//                 </div>
//             </header>

//             <div className="flex-grow flex overflow-hidden">
//                 <PanelGroup direction="horizontal" className="flex-grow">
                    
//                     <Panel defaultSize={35} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800 p-1">
//                         <Tabs value={missionControlTab} onValueChange={(v) => setMissionControlTab(v as MissionControlTab)} className="flex flex-col h-full">
//                             <TabsList className="grid w-full grid-cols-4 bg-slate-900">
//                                 <TabsTrigger value="problem"><NotebookPen className="mr-2 h-4 w-4"/>Problem</TabsTrigger>
//                                 <TabsTrigger value="testCases"><Check className="mr-2 h-4 w-4"/>Test Cases</TabsTrigger>
//                                 <TabsTrigger value="submissions"><History className="mr-2 h-4 w-4"/>Submissions</TabsTrigger>
//                                 <TabsTrigger value="solution" disabled={!isSolutionUnlocked}><FileCode className="mr-2 h-4 w-4"/>Solution</TabsTrigger>
//                             </TabsList>
//                             <TabsContent value="problem" className="flex-grow overflow-y-auto p-4 prose prose-invert prose-slate">
//                                 <ReactMarkdown>{ideData.lesson.description}</ReactMarkdown>
//                             </TabsContent>
//                             <TabsContent value="testCases" className="flex-grow overflow-y-auto p-4 text-sm">
//                                 {ideData.testCases.length > 0 ? ideData.testCases.map((tc, i) => (
//                                     <div key={i} className="p-3 bg-slate-900/50 rounded-md border border-slate-700 mb-3">
//                                         <p className="font-semibold text-slate-300 mb-2">{tc.description}</p>
//                                         <div className="font-mono text-xs">
//                                             <p><span className="text-slate-500">Input: </span><code className="text-cyan-300">{tc.input}</code></p>
//                                             <p><span className="text-slate-500">Expected: </span><code className="text-cyan-300">{tc.expectedOutput}</code></p>
//                                         </div>
//                                     </div>
//                                 )) : <p className="text-slate-500">No viewable test cases for this lesson.</p>}
//                             </TabsContent>
//                             <TabsContent value="submissions" className="flex-grow overflow-y-auto p-2">
//                                 <ul className="space-y-2">
//                                     {ideData.submissionHistory.length > 0 ? ideData.submissionHistory.map(sub => (
//                                         <li key={sub.id} className="p-2 bg-slate-900/50 rounded-md border border-slate-700 text-sm">
//                                             <div className="flex justify-between items-center">
//                                                 <span className={cn(sub.is_correct ? 'text-green-400' : 'text-red-400')}>{sub.is_correct ? 'Passed' : 'Failed'}</span>
//                                                 <span className="text-slate-400">{format(new Date(sub.submitted_at), 'Pp')}</span>
//                                             </div>
//                                         </li>
//                                     )) : <p className="text-slate-500 text-center p-4">No submission history for this lesson yet.</p>}
//                                 </ul>
//                             </TabsContent>
//                             <TabsContent value="solution" className="flex-grow overflow-y-auto p-4 prose prose-invert prose-slate">
//                                 <ReactMarkdown>{ideData.officialSolution?.explanation || "Solution not available."}</ReactMarkdown>
//                             </TabsContent>
//                         </Tabs>
//                     </Panel>

//                     <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700" />

//                     <Panel defaultSize={65} minSize={30}>
//                         <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={30} className="relative">
//                                  <div className="absolute top-0 left-0 h-full w-48 bg-slate-900/60 p-2 border-r border-slate-800 z-10 flex flex-col">
//                                     <div className="flex-shrink-0 flex items-center justify-between mb-2">
//                                         <h3 className="text-sm font-bold text-slate-400 px-2">FILES</h3>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddFile}><FilePlus2 className="h-4 w-4" /></Button>
//                                     </div>
//                                     <ul className="flex-grow space-y-1 overflow-y-auto">
//                                         {files.map(file => (
//                                             <li key={file.id} className="group flex items-center">
//                                                 <button onClick={() => handleSwitchFile(file.id)} className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md flex items-center", activeFileId === file.id ? "bg-cyan-500/10 text-cyan-300" : "hover:bg-slate-800 text-slate-300")}>
//                                                     <FileIcon className="mr-2 h-4 w-4" /> {file.filename}
//                                                 </button>
//                                                 <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}><Trash2 className="h-3 w-3 text-slate-500 hover:text-red-500"/></Button>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </div>
//                                 <div className="h-full pl-48">
//                                     <Editor
//                                         height="100%"
//                                         path={activeFile?.filename}
//                                         language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                         theme="vs-dark"
//                                         value={activeFile?.content}
//                                         onChange={handleFileContentChange}
//                                         onMount={handleEditorDidMount}
//                                         options={{ fontSize: 14, minimap: { enabled: false } }}
//                                     />
//                                 </div>
//                             </Panel>

//                             <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-slate-700" />

//                             <Panel defaultSize={30} minSize={10} className="flex flex-col bg-slate-900/40 p-1">
//                                 <Tabs value={diagnosticsTab} onValueChange={(v) => setDiagnosticsTab(v as DiagnosticsTab)} className="flex flex-col h-full">
//                                     <TabsList className="grid w-full grid-cols-2 bg-slate-900">
//                                         <TabsTrigger value="results"><BeakerIcon className="mr-2 h-4 w-4"/>Results</TabsTrigger>
//                                         <TabsTrigger value="aiFeedback" className={cn(conceptualHint && "text-fuchsia-400 animate-pulse")}><BotMessageSquare className="mr-2 h-4 w-4"/>AI Feedback</TabsTrigger>
//                                     </TabsList>
//                                     <TabsContent value="results" className="flex-grow overflow-y-auto p-4 font-mono text-sm">
//                                         {isTesting ? "Running tests..." : testResults ? <pre className="whitespace-pre-wrap">{testResults.results}</pre> : "Run tests to see the results here."}
//                                     </TabsContent>
//                                     <TabsContent value="aiFeedback" className="flex-grow overflow-y-auto p-4 prose prose-invert prose-slate">
//                                         {conceptualHint ? <ReactMarkdown>{conceptualHint}</ReactMarkdown> : "Submit a correct solution to receive conceptual feedback from the AI."}
//                                     </TabsContent>
//                                 </Tabs>
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>

//                 </PanelGroup>
//             </div>
//         </div>
//     );
// };

// export default AscentIDE;